/**
 * Membership Cancel API - 取消会员订阅
 * POST /api/memberships/cancel - 取消订阅
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

/**
 * POST /api/memberships/cancel
 * Cancel membership subscription
 * - For Stripe subscriptions: Cancel at period end
 * - For one-time payments: Set auto_renew to false
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

    // Get user's current membership
    const { data: membership, error: membershipError } = await supabase
      .from('user_memberships')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'No active membership found' },
        { status: 404 }
      );
    }

    // Check if user is on free tier
    if (membership.tier === 'free') {
      return NextResponse.json(
        { error: 'Cannot cancel free membership' },
        { status: 400 }
      );
    }

    // Handle Stripe subscription cancellation
    if (membership.stripe_subscription_id) {
      try {
        // Cancel at period end (user keeps benefits until expiration)
        await stripe.subscriptions.update(membership.stripe_subscription_id, {
          cancel_at_period_end: true,
        });

        // Update membership record
        await supabase
          .from('user_memberships')
          .update({
            auto_renew: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        return NextResponse.json({
          success: true,
          data: {
            message: 'Subscription will be cancelled at the end of the billing period',
            cancelledAt: new Date().toISOString(),
            expiresAt: membership.expires_at,
            tier: membership.tier,
          },
        });
      } catch (stripeError) {
        console.error('Stripe cancellation error:', stripeError);
        return NextResponse.json(
          { error: 'Failed to cancel Stripe subscription' },
          { status: 500 }
        );
      }
    }

    // Handle PayPal subscription cancellation
    if (membership.paypal_subscription_id) {
      try {
        // PayPal subscription cancellation
        const { cancelPayPalSubscription } = await import('@/lib/payment/paypal');
        await cancelPayPalSubscription(membership.paypal_subscription_id);

        await supabase
          .from('user_memberships')
          .update({
            auto_renew: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        return NextResponse.json({
          success: true,
          data: {
            message: 'PayPal subscription cancelled',
            cancelledAt: new Date().toISOString(),
            expiresAt: membership.expires_at,
            tier: membership.tier,
          },
        });
      } catch (paypalError) {
        console.error('PayPal cancellation error:', paypalError);
        // Even if PayPal API fails, update local record
        await supabase
          .from('user_memberships')
          .update({
            auto_renew: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        return NextResponse.json({
          success: true,
          data: {
            message: 'Membership set to not renew',
            cancelledAt: new Date().toISOString(),
            expiresAt: membership.expires_at,
            tier: membership.tier,
            warning: 'PayPal subscription may need manual cancellation',
          },
        });
      }
    }

    // For one-time payment memberships (no subscription ID)
    // Just set auto_renew to false
    await supabase
      .from('user_memberships')
      .update({
        auto_renew: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Membership will not be renewed',
        cancelledAt: new Date().toISOString(),
        expiresAt: membership.expires_at,
        tier: membership.tier,
      },
    });
  } catch (error) {
    console.error('Membership cancel API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
