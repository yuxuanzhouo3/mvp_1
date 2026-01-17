/**
 * Membership Cancel API - 取消会员订阅
 * POST /api/memberships/cancel - 取消订阅
 * 
 * 支持双环境:
 * - CN 环境: 微信支付/支付宝订阅取消
 * - INTL 环境: Stripe/PayPal 订阅取消
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';

// INTL 环境: 创建用于 token 验证的 anon 客户端
function createAnonClientForAuth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// 从请求中验证用户身份
async function authenticateUser(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  if (isChinaDeployment()) {
    // CN 环境: 从 token 中解析用户信息 (JWT)
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return {
        userId: payload.sub || payload.uid,
        email: payload.email,
      };
    } catch {
      return null;
    }
  } else {
    // INTL 环境: 使用 Supabase 验证 token
    try {
      const anonClient = createAnonClientForAuth();
      const { data: { user }, error } = await anonClient.auth.getUser(token);
      
      if (error || !user) {
        return null;
      }
      
      return {
        userId: user.id,
        email: user.email,
      };
    } catch {
      return null;
    }
  }
}

/**
 * POST /api/memberships/cancel
 * Cancel membership subscription
 * - For Stripe subscriptions: Cancel at period end
 * - For one-time payments: Set auto_renew to false
 * - For CN: Handle WeChat/Alipay subscriptions
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'No authorization header or invalid token' },
        { status: 401 }
      );
    }

    const db = await getDbClient();
    const isCN = isChinaDeployment();

    // Get user's current membership
    const { data: membership, error: membershipError } = await db
      .from('user_memberships')
      .select('*')
      .eq('user_id', authUser.userId)
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

    // INTL 环境: Handle Stripe subscription cancellation
    if (!isCN && membership.stripe_subscription_id) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2024-12-18.acacia' as any,
        });

        // Cancel at period end (user keeps benefits until expiration)
        await stripe.subscriptions.update(membership.stripe_subscription_id, {
          cancel_at_period_end: true,
        });

        // Update membership record
        await db
          .from('user_memberships')
          .update({
            auto_renew: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', authUser.userId);

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

    // INTL 环境: Handle PayPal subscription cancellation
    if (!isCN && membership.paypal_subscription_id) {
      try {
        const { cancelPayPalSubscription } = await import('@/lib/payment/paypal');
        await cancelPayPalSubscription(membership.paypal_subscription_id);

        await db
          .from('user_memberships')
          .update({
            auto_renew: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', authUser.userId);

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
        await db
          .from('user_memberships')
          .update({
            auto_renew: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', authUser.userId);

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

    // CN 环境: Handle WeChat subscription cancellation
    if (isCN && membership.wechat_subscription_id) {
      try {
        // 微信支付目前不支持自动续费订阅的 API 取消，需要用户在微信中手动取消
        // 这里只更新本地记录
        console.log('[CN] WeChat subscription cancellation requested:', membership.wechat_subscription_id);
        
        await db
          .from('user_memberships')
          .update({
            auto_renew: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', authUser.userId);

        return NextResponse.json({
          success: true,
          data: {
            message: '会员将不会自动续费，请在微信支付设置中确认取消自动扣款',
            cancelledAt: new Date().toISOString(),
            expiresAt: membership.expires_at,
            tier: membership.tier,
            notice: '请前往微信支付 > 自动扣款 中取消该服务的自动续费',
          },
        });
      } catch (error) {
        console.error('WeChat cancellation error:', error);
      }
    }

    // For one-time payment memberships (no subscription ID)
    // Just set auto_renew to false
    await db
      .from('user_memberships')
      .update({
        auto_renew: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', authUser.userId);

    return NextResponse.json({
      success: true,
      data: {
        message: isCN ? '会员将不会自动续费' : 'Membership will not be renewed',
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
