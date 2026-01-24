import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import {
  createPaymentRecord,
  validatePaymentAmount,
  validateCreditAmount,
  getPackageById
} from '@/lib/payment/payments';
import { createAlipayPaymentRequest } from '@/lib/payment/payment-receivers';
import { createPayPalOrder, convertCNYtoUSD } from '@/lib/payment/paypal';
import { getDefaultCurrency } from '@/config/payment-config';
import { getPaymentService } from '@/lib/services/payment';
import { requireUser } from '@/lib/auth/requireUser';
import crypto from 'crypto';
import { getRequestIp, rateLimit } from '@/lib/security/rateLimit';

// 延迟初始化 Stripe，避免在构建时因缺少环境变量而失败
function getStripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia' as any,
  });
}

interface CreateIntentRequest {
  packageId: string;
  paymentMethod: 'stripe' | 'alipay' | 'paypal' | 'wechat';
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireUser(request);
    const user = { id: authUser.userId, email: authUser.email };

    const ip = getRequestIp(request) || 'unknown';
    const rlIp = await rateLimit({ key: `rl:payments_create_intent:ip:${ip}`, limit: 30, windowMs: 60_000 });
    const rlUser = await rateLimit({ key: `rl:payments_create_intent:user:${user.id}`, limit: 20, windowMs: 60_000 });
    if (!rlIp.allowed || !rlUser.allowed) {
      const resetAtMs = Math.min(rlIp.resetAtMs, rlUser.resetAtMs);
      const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - Date.now()) / 1000));
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    const body: CreateIntentRequest = await request.json();
    const { packageId, paymentMethod } = body;

    // Validate request
    if (!packageId || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify package exists
    const packageData = getPackageById(packageId);
    if (!packageData) {
      return NextResponse.json(
        { error: 'Invalid package ID' },
        { status: 400 }
      );
    }

    const amount = packageData.price;
    const credits = packageData.credits;

    if (!validatePaymentAmount(amount)) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    if (!validateCreditAmount(credits)) {
      return NextResponse.json({ error: 'Invalid credit amount' }, { status: 400 });
    }

    const idempotencyKeyHeader = request.headers.get('idempotency-key') || request.headers.get('x-idempotency-key');
    const idempotencyKey =
      idempotencyKeyHeader ||
      crypto
        .createHash('sha256')
        .update(`${user.id}:${paymentMethod}:${packageId}:${Math.floor(Date.now() / 600_000)}`)
        .digest('hex');

    // Create payment record in database
    const payment = await createPaymentRecord(
      user.id,
      amount,
      paymentMethod,
      packageId,
      credits,
      idempotencyKey
    );

    // Handle different payment methods
    switch (paymentMethod) {
      case 'stripe':
        return await handleStripePayment(payment, amount, credits);

      case 'alipay':
        return await handleAlipayPayment(payment, amount, user.id);

      case 'paypal':
        return await handlePayPalPayment(payment, amount, credits, user.id);

      case 'wechat':
        return await handleWeChatPayment(payment, amount, credits, user.id);

      default:
        return NextResponse.json(
          { error: 'Unsupported payment method' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleStripePayment(payment: any, amount: number, credits: number) {
  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    );
  }

  try {
    if (payment?.stripe_checkout_session_id) {
      const existing = await stripe.checkout.sessions.retrieve(payment.stripe_checkout_session_id);
      return NextResponse.json({
        checkoutUrl: (existing as any).url,
        sessionId: existing.id,
        paymentId: payment.id,
      });
    }

    // Get currency based on deployment region
    const currency = getDefaultCurrency().toLowerCase(); // Stripe expects lowercase currency codes

    // Create Stripe checkout session
    const stripeOptions = payment?.idempotency_key ? { idempotencyKey: payment.idempotency_key } : undefined;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `${credits} Credits Package`,
              description: `Purchase ${credits} credits for PersonaLink`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
      metadata: {
        payment_id: payment.id,
        user_id: payment.user_id,
        credits: credits.toString(),
      },
    }, stripeOptions as any);

    // Update payment record with Stripe checkout session ID
    const supabase = createClient();
    await supabase
      .from('payments')
      .update({
        stripe_checkout_session_id: session.id,
        metadata: {
          ...payment.metadata,
          stripe_session_id: session.id,
        }
      })
      .eq('id', payment.id);

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error('Stripe payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create Stripe session' },
      { status: 500 }
    );
  }
}

async function handleAlipayPayment(payment: any, amount: number, userId: string) {
  try {
    const existingQr = payment?.metadata?.alipay_qr_code;
    const existingAccount = payment?.metadata?.alipay_account;
    const existingAmount = payment?.metadata?.alipay_amount;
    if (existingQr && existingAccount && typeof existingAmount === 'number') {
      return NextResponse.json({
        qrCodeUrl: existingQr,
        amount: existingAmount,
        account: existingAccount,
        paymentId: payment.id,
        instructions: `Please scan the QR code with Alipay to pay ${existingAmount} CNY. Make sure to include the payment ID in the note.`,
      });
    }

    // Create Alipay payment request with real account
    const alipayPayment = await createAlipayPaymentRequest(payment.id, amount, userId);

    return NextResponse.json({
      qrCodeUrl: alipayPayment.qrCode,
      amount: alipayPayment.amount,
      account: alipayPayment.account,
      paymentId: alipayPayment.paymentId,
      instructions: `Please scan the QR code with Alipay to pay ${amount} CNY. Make sure to include the payment ID in the note.`,
    });
  } catch (error) {
    console.error('Alipay payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create Alipay payment' },
      { status: 500 }
    );
  }
}

async function handlePayPalPayment(payment: any, amount: number, credits: number, userId: string) {
  try {
    const existingOrderId = payment?.paypal_order_id || payment?.metadata?.paypal_order_id;
    const existingApprovalUrl = payment?.metadata?.paypal_approval_url;
    if (existingOrderId && existingApprovalUrl && payment?.status === 'pending') {
      return NextResponse.json({
        orderId: existingOrderId,
        approvalUrl: existingApprovalUrl,
        paymentId: payment.id,
        amount: payment?.metadata?.usd_amount || amount,
        credits,
      });
    }

    // Get currency based on deployment region
    const currency = getDefaultCurrency();

    // Only convert CNY to USD if we're in CN region
    // In INTL region, amount is already in USD
    const paypalAmount = currency === 'CNY' ? convertCNYtoUSD(amount) : amount;

    // Create PayPal order
    const paypalOrder = await createPayPalOrder({
      paymentId: payment.id,
      amount: paypalAmount,
      credits,
      userId,
      currency: 'USD',
      description: `Purchase ${credits} credits for PersonaLink`,
    });

    // Update payment record with PayPal order ID (同时更新专用字段和 metadata)
    const supabase = createClient();
    await supabase
      .from('payments')
      .update({
        paypal_order_id: paypalOrder.orderId,
        metadata: {
          ...payment.metadata,
          paypal_order_id: paypalOrder.orderId,
          paypal_approval_url: paypalOrder.approvalUrl,
          usd_amount: paypalAmount,
        }
      })
      .eq('id', payment.id);

    return NextResponse.json({
      orderId: paypalOrder.orderId,
      approvalUrl: paypalOrder.approvalUrl,
      paymentId: payment.id,
      amount: paypalAmount,
      credits,
    });
  } catch (error) {
    console.error('PayPal payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create PayPal order' },
      { status: 500 }
    );
  }
}

async function handleWeChatPayment(payment: any, amount: number, credits: number, userId: string) {
  try {
    const existingQr = payment?.metadata?.wechat_qr_code;
    if (existingQr) {
      return NextResponse.json({
        paymentId: payment.id,
        qrCodeUrl: existingQr,
        amount,
        credits,
      });
    }

    const paymentService = getPaymentService();

    const result = await paymentService.createPayment({
      userId,
      amount,
      currency: 'CNY',
      credits,
      method: 'wechat',
      packageId: payment.package_id,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
      metadata: {
        payment_id: payment.id,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create WeChat payment' },
        { status: 500 }
      );
    }

    // Update payment record with WeChat payment info
    const supabase = createClient();
    await supabase
      .from('payments')
      .update({
        metadata: {
          ...payment.metadata,
          wechat_payment_id: result.paymentId,
          wechat_qr_code: result.qrCodeUrl || result.qrCodeBase64,
        }
      })
      .eq('id', payment.id);

    return NextResponse.json({
      paymentId: payment.id,
      qrCodeUrl: result.qrCodeUrl || result.qrCodeBase64,
      amount,
      credits,
    });
  } catch (error) {
    console.error('WeChat payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create WeChat payment' },
      { status: 500 }
    );
  }
} 
