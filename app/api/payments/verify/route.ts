import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { getPayPalOrder } from '@/lib/payment/paypal';

// 延迟初始化 Stripe，避免在构建时因缺少环境变量而失败
function getStripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia' as any,
  });
}

interface VerifyRequest {
  sessionId?: string;
  paymentId?: string;
  provider?: 'stripe' | 'paypal';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: VerifyRequest = await request.json();
    const { sessionId, paymentId, provider } = body;

    // Handle PayPal verification
    if (provider === 'paypal' && paymentId) {
      return await verifyPayPalPayment(supabase, user.id, paymentId);
    }

    // Handle Stripe verification (default)
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // Verify Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Check if this is a membership subscription
    if (session.metadata?.type === 'membership') {
      // Get membership details
      const { data: membership, error: membershipError } = await supabase
        .from('user_memberships')
        .select('*, membership_tiers(*)')
        .eq('user_id', user.id)
        .single();

      // Get user's current credits
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('credits')
        .eq('user_id', user.id)
        .single();

      return NextResponse.json({
        type: 'membership',
        tier: session.metadata?.tier_id,
        tierName: membership?.membership_tiers?.name_en || session.metadata?.tier_id,
        credits: membership?.membership_tiers?.monthly_credits || 0,
        amount: (session.amount_total || 0) / 100,
        paymentMethod: 'stripe',
        transactionId: sessionId,
        currentCredits: profile?.credits || 0,
        status: 'completed',
        expiresAt: membership?.expires_at,
      });
    }

    // Handle credit purchase verification
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_checkout_session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Get user's current credits
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to get user profile:', profileError);
    }

    return NextResponse.json({
      type: 'credits',
      credits: payment.credits || 0,
      amount: payment.amount,
      paymentMethod: payment.payment_method,
      transactionId: payment.id,
      currentCredits: profile?.credits || 0,
      status: payment.status,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Verify PayPal payment status
 */
async function verifyPayPalPayment(supabase: any, userId: string, paymentId: string) {
  // Get payment record from database
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .eq('user_id', userId)
    .single();

  if (paymentError || !payment) {
    return NextResponse.json(
      { error: 'Payment record not found' },
      { status: 404 }
    );
  }

  // If payment has PayPal order ID, verify with PayPal
  if (payment.paypal_order_id && payment.status !== 'completed') {
    try {
      const paypalOrder = await getPayPalOrder(payment.paypal_order_id);

      // Update status if PayPal shows completed
      if (paypalOrder.status === 'COMPLETED' && payment.status !== 'completed') {
        await supabase
          .from('payments')
          .update({ status: 'completed' })
          .eq('id', paymentId);
        payment.status = 'completed';
      }
    } catch (err) {
      console.warn('Failed to verify PayPal order:', err);
    }
  }

  // Get user's current credits
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('credits')
    .eq('user_id', userId)
    .single();

  const metadata = payment.metadata || {};

  // Check if this is a membership payment
  if (metadata.type === 'membership') {
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('*, membership_tiers(*)')
      .eq('user_id', userId)
      .single();

    return NextResponse.json({
      type: 'membership',
      tier: metadata.tier_id,
      tierName: membership?.membership_tiers?.name_en || metadata.tier_id,
      credits: membership?.membership_tiers?.monthly_credits || 0,
      amount: payment.amount,
      paymentMethod: 'paypal',
      transactionId: paymentId,
      currentCredits: profile?.credits || 0,
      status: payment.status,
      expiresAt: membership?.expires_at,
    });
  }

  // Credit purchase
  return NextResponse.json({
    type: 'credits',
    credits: payment.credits || 0,
    amount: payment.amount,
    paymentMethod: 'paypal',
    transactionId: paymentId,
    currentCredits: profile?.credits || 0,
    status: payment.status,
  });
} 