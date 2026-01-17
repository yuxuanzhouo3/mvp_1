/**
 * Membership Subscribe API - 会员订阅
 * POST /api/memberships/subscribe - 订阅会员
 * 
 * 支持双环境:
 * - CN 环境: 微信支付/支付宝
 * - INTL 环境: Stripe/PayPal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { getPaymentService } from '@/lib/services/payment';
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
  paymentMethod: 'stripe' | 'paypal' | 'wechat' | 'alipay';
  currency?: 'USD' | 'CNY';
}

/**
 * POST /api/memberships/subscribe
 * Subscribe to a membership tier
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
    const serviceDb = await getServiceDbClient();
    const isCN = isChinaDeployment();

    const body: SubscribeRequest = await request.json();
    const { tierId, paymentMethod, currency = isCN ? 'CNY' : 'USD' } = body;

    // Validate tier
    if (!['basic', 'premium', 'vip'].includes(tierId)) {
      return NextResponse.json(
        { error: 'Invalid tier ID' },
        { status: 400 }
      );
    }

    // Validate payment method for region
    const validMethods = isCN ? ['wechat', 'alipay'] : ['stripe', 'paypal'];
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { 
          error: `Payment method '${paymentMethod}' is not available in ${isCN ? 'CN' : 'INTL'} region`,
          availableMethods: validMethods,
        },
        { status: 400 }
      );
    }

    // Get tier details
    const { data: tier, error: tierError } = await db
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
    const { data: existingMembership } = await db
      .from('user_memberships')
      .select('*')
      .eq('user_id', authUser.userId)
      .single();

    // CN 环境: 使用支付服务处理微信/支付宝
    if (isCN) {
      return await handleCNSubscription(
        authUser,
        tier,
        tierId,
        paymentMethod as 'wechat' | 'alipay',
        serviceDb
      );
    }

    // INTL 环境: Handle Stripe/PayPal
    if (paymentMethod === 'stripe') {
      return await handleStripeSubscription(
        authUser,
        tier,
        tierId,
        existingMembership,
        serviceDb
      );
    } else if (paymentMethod === 'paypal') {
      return await handlePayPalSubscription(authUser, tier, tierId, serviceDb);
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

/**
 * CN 环境: 处理微信/支付宝订阅
 */
async function handleCNSubscription(
  user: { userId: string; email?: string },
  tier: any,
  tierId: string,
  method: 'wechat' | 'alipay',
  db: any
) {
  try {
    const paymentService = getPaymentService();

    // 创建支付订单
    const result = await paymentService.createPayment({
      userId: user.userId,
      amount: tier.monthly_price_cny,
      currency: 'CNY',
      credits: tier.monthly_credits,
      method: method === 'wechat' ? 'wechat_native' : 'alipay_face',
      packageId: `membership_${tierId}`,
      returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success?type=membership&tier=${tierId}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/payment/cancel`,
      metadata: {
        type: 'membership',
        tier_id: tierId,
        userEmail: user.email,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '创建支付订单失败' },
        { status: 500 }
      );
    }

    // 创建支付记录
    await db
      .from('payments')
      .insert({
        user_id: user.userId,
        amount: tier.monthly_price_cny,
        currency: 'CNY',
        credits: tier.monthly_credits,
        payment_method: method,
        status: 'pending',
        metadata: {
          type: 'membership',
          tier_id: tierId,
        },
      });

    return NextResponse.json({
      success: true,
      data: {
        paymentId: result.paymentId,
        qrCodeUrl: result.qrCodeUrl,
        qrCodeBase64: result.qrCodeBase64,
        tier: tierId,
        method: method,
        isSubscription: false,
        region: 'CN',
      },
    });
  } catch (error) {
    console.error('CN subscription error:', error);
    return NextResponse.json(
      { error: '支付服务错误' },
      { status: 500 }
    );
  }
}

/**
 * INTL 环境: 处理 Stripe 订阅
 */
async function handleStripeSubscription(
  user: { userId: string; email?: string },
  tier: any,
  tierId: string,
  existingMembership: any,
  db: any
) {
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-12-18.acacia' as any,
    });

    // Get or create Stripe customer
    let customerId = existingMembership?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.userId,
        },
      });
      customerId = customer.id;

      // Update or create membership record with customer ID
      if (existingMembership) {
        await db
          .from('user_memberships')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', user.userId);
      }
    }

    // Create Stripe Checkout Session for subscription
    const priceId = STRIPE_PRICE_IDS[tierId]?.usd;

    // If no price ID configured, use one-time payment mode
    const sessionParams: any = {
      customer: customerId,
      payment_method_types: ['card'],
      mode: priceId ? 'subscription' : 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?type=membership&tier=${tierId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
      metadata: {
        user_id: user.userId,
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
    await db
      .from('payments')
      .insert({
        user_id: user.userId,
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
        region: 'INTL',
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

/**
 * INTL 环境: 处理 PayPal 订阅
 */
async function handlePayPalSubscription(
  user: { userId: string; email?: string },
  tier: any,
  tierId: string,
  db: any
) {
  try {
    // First create payment record to get the real payment ID
    const { data: payment, error: insertError } = await db
      .from('payments')
      .insert({
        user_id: user.userId,
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
      userId: user.userId,
      currency: 'USD',
      description: `${tier.name_en} Membership - 1 Month`,
    });

    // Update payment record with PayPal order ID
    await db
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
        region: 'INTL',
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
