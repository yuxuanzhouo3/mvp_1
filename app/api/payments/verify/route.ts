import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServiceDbClientFromRequest } from '@/lib/db-client';
import Stripe from 'stripe';
import { getPayPalOrder } from '@/lib/payment/paypal';
import { finalizeCnPayment } from '@/lib/payment/cn-payment-finalize';
import { requireUser } from '@/lib/auth/requireUser';
import { getDeploymentRegionFromRequest } from '@/lib/config/request-region';

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
  provider?: 'stripe' | 'paypal' | 'wechat' | 'alipay';
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireUser(request);
    const userId = authUser.userId;

    const body: VerifyRequest = await request.json();
    const { sessionId, paymentId, provider } = body;

    // 使用统一数据库客户端
    const db = await getServiceDbClientFromRequest(request);
    const region = getDeploymentRegionFromRequest(request);

    // Handle CN payment verification (WeChat/Alipay)
    if (region === 'CN' && paymentId && (provider === 'wechat' || provider === 'alipay')) {
      return await verifyCnPayment(db, userId!, paymentId, provider);
    }

    // Handle PayPal verification
    if (provider === 'paypal' && paymentId) {
      return await verifyPayPalPayment(db, userId!, paymentId);
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
      const { data: membership, error: membershipError } = await db
        .from('user_memberships')
        .select('*, membership_tiers(*)')
        .eq('user_id', userId)
        .single();

      // Get user's current credits
      const { data: profile } = await db
        .from('user_profiles')
        .select('credits')
        .eq('user_id', userId)
        .single();

      return NextResponse.json({
        type: 'membership',
        tier: session.metadata?.tier_id,
        tierName: membership?.membership_tiers?.name_en || session.metadata?.tier_id,
        credits: membership?.membership_tiers?.monthly_credits || 0,
        amount: (session.amount_total || 0) / 100,
        currency: (session.currency || '').toUpperCase() || 'USD',
        paymentMethod: 'stripe',
        transactionId: sessionId,
        currentCredits: profile?.credits || 0,
        status: 'completed',
        expiresAt: membership?.expires_at,
      });
    }

    // Handle credit purchase verification
    const { data: payment, error: paymentError } = await db
      .from('payments')
      .select('*')
      .eq('stripe_checkout_session_id', sessionId)
      .eq('user_id', userId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    if (payment.status !== 'completed') {
      const sessionCurrency = (session.currency || '').toLowerCase();
      const paymentCurrency = (payment.currency || '').toLowerCase();
      const expectedMinor = Math.round(Number(payment.amount) * 100);
      const receivedMinor = session.amount_total ?? null;
      const nowIso = new Date().toISOString();

      if (sessionCurrency && paymentCurrency && sessionCurrency !== paymentCurrency) {
        await db
          .from('payments')
          .update({
            status: 'failed',
            updated_at: nowIso,
            metadata: {
              ...(payment.metadata || {}),
              stripe_currency_mismatch: true,
              stripe_session_id: sessionId,
              stripe_session_currency: sessionCurrency,
              expected_currency: paymentCurrency,
            },
          })
          .eq('id', payment.id);
        return NextResponse.json({ error: 'Stripe currency mismatch' }, { status: 400 });
      }

      if (typeof receivedMinor === 'number' && receivedMinor !== expectedMinor) {
        await db
          .from('payments')
          .update({
            status: 'failed',
            updated_at: nowIso,
            metadata: {
              ...(payment.metadata || {}),
              stripe_amount_mismatch: true,
              stripe_session_id: sessionId,
              stripe_amount_total: receivedMinor,
              expected_amount_minor: expectedMinor,
            },
          })
          .eq('id', payment.id);
        return NextResponse.json({ error: 'Stripe amount mismatch' }, { status: 400 });
      }

      const updateData: any = {
        status: 'completed',
        updated_at: nowIso,
        metadata: {
          ...(payment.metadata || {}),
          stripe_session_id: sessionId,
          stripe_charge_id: session.payment_intent,
          verification_source: 'success_page_verify',
        },
      };
      if (session.payment_intent) {
        updateData.stripe_payment_intent_id =
          typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
      }
      await db.from('payments').update(updateData).eq('id', payment.id);
    }

    // Get user's current credits
    const { data: profile, error: profileError } = await db
      .from('user_profiles')
      .select('credits')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Failed to get user profile:', profileError);
    }

    return NextResponse.json({
      type: 'credits',
      credits: payment.credits || 0,
      amount: payment.amount,
      currency: payment.currency,
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
async function verifyPayPalPayment(db: any, userId: string, paymentId: string) {
  // Get payment record from database
  const { data: payment, error: paymentError } = await db
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
        await db
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
  const { data: profile } = await db
    .from('user_profiles')
    .select('credits')
    .eq('user_id', userId)
    .single();

  const metadata = payment.metadata || {};

  // Check if this is a membership payment
  if (metadata.type === 'membership') {
    const { data: membership } = await db
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
      currency: payment.currency,
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
    currency: payment.currency,
    paymentMethod: 'paypal',
    transactionId: paymentId,
    currentCredits: profile?.credits || 0,
    status: payment.status,
  });
}

/**
 * 验证 CN 环境支付状态（微信/支付宝）
 */
async function verifyCnPayment(db: any, userId: string, paymentId: string, provider: 'wechat' | 'alipay') {
  // Get payment record from database
  const { data: payment, error: paymentError } = await db
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

  // 若已 completed 但未履约，尝试补偿履约（避免历史数据或异常路径导致的 completed 但未发放积分）
  if (payment.status === 'completed') {
    const fulfilled = Boolean(payment.metadata?.fulfilled_at || payment.metadata?.fulfilled === true);
    if (!fulfilled) {
      await finalizeCnPayment({
        paymentId,
        newStatus: 'completed',
        provider,
        providerOrderId: payment.provider_order_id || undefined,
        metadata: {
          verified_at: new Date().toISOString(),
          verification_source: 'verify_endpoint',
        },
      });
    }

    const { data: profile } = await db
      .from('user_profiles')
      .select('credits')
      .eq('user_id', userId)
      .single();

    return NextResponse.json({
      type: 'credits',
      credits: payment.credits || 0,
      amount: payment.amount,
      paymentMethod: provider,
      transactionId: paymentId,
      currentCredits: profile?.credits || 0,
      status: payment.status,
      verified: true,
    });
  }

  // 尝试查询支付平台确认状态
  let verified = false;

  if (provider === 'wechat') {
    verified = await queryWeChatPaymentStatus(db, paymentId, userId);
  } else if (provider === 'alipay') {
    verified = await queryAlipayPaymentStatus(db, paymentId, userId);
  }

  // 重新获取支付记录（可能已更新）
  const { data: updatedPayment } = await db
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  // Get user's current credits
  const { data: profile } = await db
    .from('user_profiles')
    .select('credits')
    .eq('user_id', userId)
    .single();

  return NextResponse.json({
    type: 'credits',
    credits: updatedPayment?.credits || 0,
    amount: updatedPayment?.amount || payment.amount,
    paymentMethod: provider,
    transactionId: paymentId,
    currentCredits: profile?.credits || 0,
    status: updatedPayment?.status || payment.status,
    verified,
  });
}

/**
 * 查询微信支付订单状态
 */
async function queryWeChatPaymentStatus(db: any, paymentId: string, userId: string): Promise<boolean> {
  try {
    const appId = process.env.WECHAT_PAY_APPID || '';
    const mchId = process.env.WECHAT_PAY_MCHID || '';
    const serialNo = process.env.WECHAT_PAY_SERIAL_NO || '';
    const privateKey = (process.env.WECHAT_PAY_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!appId || !mchId || !serialNo || !privateKey) {
      console.error('[WeChat Query] Missing configuration');
      return false;
    }

    const crypto = require('crypto');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const url = `/v3/pay/transactions/out-trade-no/${paymentId}?mchid=${mchId}`;
    
    const signMessage = `GET\n${url}\n${timestamp}\n${nonceStr}\n\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signMessage);
    
    let formattedKey = privateKey;
    if (!formattedKey.includes('-----BEGIN')) {
      const cleanKey = formattedKey.replace(/\s/g, '');
      const lines: string[] = [];
      for (let i = 0; i < cleanKey.length; i += 64) {
        lines.push(cleanKey.substring(i, i + 64));
      }
      formattedKey = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;
    }
    
    const signature = sign.sign(formattedKey, 'base64');
    const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`;

    const response = await fetch(`https://api.mch.weixin.qq.com${url}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': authorization,
      },
    });

    const data = await response.json();
    console.log('[WeChat Query] Result:', { paymentId, status: response.status, tradeState: data.trade_state });

    if (data.trade_state === 'SUCCESS') {
      const finalizeResult = await finalizeCnPayment({
        paymentId,
        newStatus: 'completed',
        provider: 'wechat',
        providerOrderId: data.transaction_id,
        providerAmountCents:
          typeof data.amount?.total === 'number' && Number.isFinite(data.amount.total)
            ? data.amount.total
            : undefined,
        paidAt: data.success_time,
        metadata: {
          wechat_transaction_id: data.transaction_id,
          trade_state: data.trade_state,
          verified_at: new Date().toISOString(),
          verification_source: 'verify_endpoint',
        },
      });

      if (!finalizeResult.ok) {
        console.error('[WeChat Query] Finalize failed:', finalizeResult.error);
        return false;
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('[WeChat Query] Error:', error);
    return false;
  }
}

/**
 * 查询支付宝订单状态
 */
async function queryAlipayPaymentStatus(db: any, paymentId: string, userId: string): Promise<boolean> {
  // 支付宝查询订单状态逻辑
  // 目前支付宝回调应该已经处理了状态更新，这里只是二次确认
  try {
    const { data: payment } = await db
      .from('payments')
      .select('status')
      .eq('id', paymentId)
      .single();

    return payment?.status === 'completed';
  } catch (error) {
    console.error('[Alipay Query] Error:', error);
    return false;
  }
} 
