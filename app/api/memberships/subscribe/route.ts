/**
 * Membership Subscribe API - 会员订阅
 * POST /api/memberships/subscribe - 订阅会员
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

// Stripe Price IDs for membership tiers (to be configured in Stripe Dashboard)
const STRIPE_PRICE_IDS: Record<string, { usd: string; cny?: string }> = {
  basic: {
    usd: process.env.STRIPE_PRICE_BASIC_USD || '',
  },
  premium: {
    usd: process.env.STRIPE_PRICE_PREMIUM_USD || '',
  },
  vip: {
    usd: process.env.STRIPE_PRICE_VIP_USD || '',
  },
};

interface SubscribeRequest {
  tierId: 'basic' | 'premium' | 'vip';
  paymentMethod: 'stripe' | 'paypal';
  currency?: 'USD' | 'CNY';
}

/**
 * POST /api/memberships/subscribe
 * Subscribe to a membership tier
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No authorization header' },
        { status: 401 }
      );
    }

    // Extract token and verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: SubscribeRequest = await request.json();
    const { tierId, paymentMethod, currency = 'USD' } = body;

    // Validate tier
    if (!['basic', 'premium', 'vip'].includes(tierId)) {
      return NextResponse.json(
        { error: 'Invalid tier ID' },
        { status: 400 }
      );
    }

    // Get tier details
    const { data: tier, error: tierError } = await supabase
      .from('membership_tiers')
      .select('*')
      .eq('id', tierId)
      .single();

    if (tierError || !tier) {
      return NextResponse.json(
        { error: 'Tier not found' },
        { status: 404 }
      );
    }

    // Check existing membership
    const { data: existingMembership } = await supabase
      .from('user_memberships')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Handle payment method
    if (paymentMethod === 'stripe') {
      return await handleStripeSubscription(
        user,
        tier,
        tierId,
        existingMembership,
        supabase
      );
    } else if (paymentMethod === 'paypal') {
      // PayPal subscription handling (simplified - one-time payment for 1 month)
      return await handlePayPalSubscription(user, tier, tierId, supabase);
    }

    return NextResponse.json(
      { error: 'Unsupported payment method' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Membership subscribe API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleStripeSubscription(
  user: any,
  tier: any,
  tierId: string,
  existingMembership: any,
  supabase: any
) {
  try {
    // Get or create Stripe customer
    let customerId = existingMembership?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // Update or create membership record with customer ID
      if (existingMembership) {
        await supabase
          .from('user_memberships')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', user.id);
      }
    }

    // Create Stripe Checkout Session for subscription
    const priceId = STRIPE_PRICE_IDS[tierId]?.usd;

    // If no price ID configured, use one-time payment mode
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      mode: priceId ? 'subscription' : 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?type=membership&tier=${tierId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
      metadata: {
        user_id: user.id,
        tier_id: tierId,
        type: 'membership',
      },
    };

    if (priceId) {
      // Recurring subscription
      sessionParams.line_items = [{
        price: priceId,
        quantity: 1,
      }];
    } else {
      // One-time payment for 1 month
      sessionParams.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${tier.name_en} Membership - 1 Month`,
            description: `PersonaLink ${tier.name_en} membership for 1 month`,
          },
          unit_amount: Math.round(tier.monthly_price_usd * 100),
        },
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Create payment record for tracking
    const serviceClient = createServiceClient();
    await serviceClient
      .from('payments')
      .insert({
        user_id: user.id,
        amount: tier.monthly_price_usd,
        currency: 'USD',
        credits: tier.monthly_credits,
        payment_method: 'stripe',
        status: 'pending',
        stripe_checkout_session_id: session.id,
        metadata: {
          type: 'membership',
          tier_id: tierId,
          stripe_session_id: session.id,
        },
      });

    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
        tier: tierId,
        isSubscription: !!priceId,
      },
    });
  } catch (error) {
    console.error('Stripe subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to create Stripe session' },
      { status: 500 }
    );
  }
}

async function handlePayPalSubscription(
  user: any,
  tier: any,
  tierId: string,
  supabase: any
) {
  try {
    const serviceClient = createServiceClient();

    // First create payment record to get the real payment ID
    const { data: payment, error: insertError } = await serviceClient
      .from('payments')
      .insert({
        user_id: user.id,
        amount: tier.monthly_price_usd,
        currency: 'USD',
        credits: tier.monthly_credits,
        payment_method: 'paypal',
        status: 'pending',
        metadata: {
          type: 'membership',
          tier_id: tierId,
        },
      })
      .select()
      .single();

    if (insertError || !payment) {
      console.error('Failed to create payment record:', insertError);
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    // Now create PayPal order with the real payment ID
    const { createPayPalOrder } = await import('@/lib/payment/paypal');

    const paypalOrder = await createPayPalOrder({
      paymentId: payment.id, // Use the real database payment ID
      amount: tier.monthly_price_usd,
      credits: tier.monthly_credits,
      userId: user.id,
      currency: 'USD',
      description: `${tier.name_en} Membership - 1 Month`,
    });

    // Update payment record with PayPal order ID
    await serviceClient
      .from('payments')
      .update({
        paypal_order_id: paypalOrder.orderId,
        metadata: {
          type: 'membership',
          tier_id: tierId,
          paypal_order_id: paypalOrder.orderId,
        },
      })
      .eq('id', payment.id);

    return NextResponse.json({
      success: true,
      data: {
        orderId: paypalOrder.orderId,
        approvalUrl: paypalOrder.approvalUrl,
        tier: tierId,
        paymentId: payment.id,
        isSubscription: false,
      },
    });
  } catch (error) {
    console.error('PayPal subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to create PayPal order' },
      { status: 500 }
    );
  }
}
