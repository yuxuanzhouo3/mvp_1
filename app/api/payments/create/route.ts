/**
 * 创建支付订单 API
 * Create Payment Order API
 * 
 * 根据部署环境自动选择支付服务:
 * - CN 环境: 微信支付 / 支付宝
 * - INTL 环境: Stripe / PayPal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPaymentService } from '@/lib/services/payment';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import type { PaymentMethod, Currency, CreatePaymentRequest } from '@/lib/services/payment/types';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { buildPaymentRequestContext, recordPaymentEvent } from '@/lib/observability/payment-events';
import { getExternalRequestOrigin } from '@/lib/http/request-origin';
import { AuthError, jsonAuthError, requireUser } from '@/lib/auth/requireUser';
import { getRequestIp, rateLimit } from '@/lib/security/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const ctx = buildPaymentRequestContext(request);
    let user: { id: string; email?: string } | null = null;

    try {
      const authUser = await requireUser(request);
      user = { id: authUser.userId, email: authUser.email };
    } catch (err) {
      await recordPaymentEvent(ctx, {
        event: 'PAYMENT_CREATE_REJECTED',
        level: 'warn',
        paymentId: 'unknown',
        provider: 'unknown',
        errorCode: err instanceof AuthError ? err.code : 'UNAUTHORIZED',
      });
      if (err instanceof AuthError) {
        return jsonAuthError(err);
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getRequestIp(request) || 'unknown';
    const rlIp = await rateLimit({ key: `rl:payments_create:ip:${ip}`, limit: 30, windowMs: 60_000 });
    const rlUser = await rateLimit({ key: `rl:payments_create:user:${user.id}`, limit: 20, windowMs: 60_000 });
    if (!rlIp.allowed || !rlUser.allowed) {
      const resetAtMs = Math.min(rlIp.resetAtMs, rlUser.resetAtMs);
      const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - Date.now()) / 1000));
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    const body = await request.json();
    const {
      packageId,
      method: requestedMethod,
      paymentMethod,
      returnUrl,
      cancelUrl,
    } = body as {
      packageId: string;
      method?: PaymentMethod;
      paymentMethod?: PaymentMethod;
      returnUrl?: string;
      cancelUrl?: string;
    };

    const method = (requestedMethod || paymentMethod) as PaymentMethod;

    if (!packageId || !method) {
      return NextResponse.json(
        { error: 'Package ID and payment method are required' },
        { status: 400 }
      );
    }

    // 获取支付服务
    const paymentService = getPaymentService();
    const isCN = isChinaDeployment();
    const userAgent = request.headers.get('user-agent') || '';
    const isMobileUA = /mobile|android|iphone|ipad/i.test(userAgent);
    const actualMethod: PaymentMethod =
      isCN && method === 'alipay' && isMobileUA ? 'alipay_wap' : method;

    // 验证支付方式是否可用
    const availableMethods = paymentService.getAvailablePaymentMethods();
    const selectedMethod =
      availableMethods.find(m => m.id === actualMethod) ||
      (isCN && actualMethod === 'alipay_wap'
        ? availableMethods.find(m => m.id === 'alipay')
        : undefined);
    
    if (!selectedMethod || !selectedMethod.available) {
      return NextResponse.json(
        { 
          error: `Payment method '${actualMethod}' is not available in ${isCN ? 'CN' : 'INTL'} region`,
          availableMethods: availableMethods.filter(m => m.available).map(m => m.id),
        },
        { status: 400 }
      );
    }

    // 获取套餐信息
    const packages = paymentService.getCreditPackages();
    const selectedPackage = packages.find(p => p.id === packageId);

    if (!selectedPackage) {
      return NextResponse.json(
        { 
          error: 'Invalid package ID',
          availablePackages: packages.map(p => p.id),
        },
        { status: 400 }
      );
    }

    // 构建支付请求
    const baseOrigin = getExternalRequestOrigin(request);
    if (isCN && process.env.NODE_ENV === 'production' && (!baseOrigin || !baseOrigin.startsWith('https://'))) {
      return NextResponse.json(
        { error: 'Invalid app origin', errorCode: 'INVALID_ORIGIN' },
        { status: 500 }
      );
    }
    const paymentRequest: CreatePaymentRequest = {
      userId: user.id,
      amount: selectedPackage.price,
      currency: selectedPackage.currency,
      credits: selectedPackage.credits,
      method: actualMethod,
      packageId: packageId,
      returnUrl:
        returnUrl ||
        (isCN
          ? `${baseOrigin}/payment/success`
          : `${baseOrigin}/dashboard/billing/result`),
      cancelUrl:
        cancelUrl ||
        (isCN
          ? `${baseOrigin}/payment/cancel`
          : `${baseOrigin}/dashboard/billing`),
      metadata: {
        packageName: selectedPackage.name,
        userEmail: user.email,
        requestedMethod: method,
        origin: baseOrigin,
      },
    };

    console.log(`[Payment Create] Creating ${actualMethod} payment for user ${user.id}`, {
      packageId,
      amount: selectedPackage.price,
      currency: selectedPackage.currency,
      credits: selectedPackage.credits,
    });

    // 创建支付
    const result = await paymentService.createPayment(paymentRequest);

    if (!result.success) {
      await recordPaymentEvent(ctx, {
        event: 'PAYMENT_CREATE_FAILED',
        level: 'error',
        paymentId: result.paymentId || 'unknown',
        userId: user.id,
        provider: actualMethod.startsWith('wechat')
          ? 'wechat'
          : actualMethod.startsWith('alipay')
            ? 'alipay'
            : 'unknown',
        errorCode: result.errorCode,
        errorMessage: result.error,
        metadata: {
          packageId,
          requestedMethod: method,
          actualMethod,
          amount: selectedPackage.price,
          currency: selectedPackage.currency,
        },
      });
      return NextResponse.json(
        { 
          error: result.error || 'Failed to create payment',
          errorCode: result.errorCode,
        },
        { status: 500 }
      );
    }

    await recordPaymentEvent(ctx, {
      event: 'PAYMENT_CREATED',
      level: 'info',
      paymentId: result.paymentId || 'unknown',
      userId: user.id,
      provider: actualMethod.startsWith('wechat')
        ? 'wechat'
        : actualMethod.startsWith('alipay')
          ? 'alipay'
          : (actualMethod as any),
      status: 'pending',
      metadata: {
        packageId,
        requestedMethod: method,
        actualMethod,
        credits: selectedPackage.credits,
        amount: selectedPackage.price,
        currency: selectedPackage.currency,
      },
    });

    console.log(`[Payment Create] Payment created successfully: ${result.paymentId}`);

    return NextResponse.json({
      success: true,
      paymentId: result.paymentId,
      redirectUrl: result.redirectUrl,
      qrCodeUrl: result.qrCodeUrl,
      qrCodeBase64: result.qrCodeBase64,
      method: actualMethod,
      amount: selectedPackage.price,
      currency: selectedPackage.currency,
      credits: selectedPackage.credits,
      packageId: selectedPackage.id,
      region: isCN ? 'CN' : 'INTL',
    });
  } catch (error: any) {
    console.error('[Payment Create] Error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Payment service error',
        errorCode: 'PAYMENT_SERVICE_ERROR',
      },
      { status: 500 }
    );
  }
}

// 获取可用的支付方式和套餐
export async function GET() {
  const paymentService = getPaymentService();
  const isCN = isChinaDeployment();

  const availableMethods = paymentService.getAvailablePaymentMethods()
    .filter(m => m.available);
  
  const packages = paymentService.getCreditPackages();

  return NextResponse.json({
    region: isCN ? 'CN' : 'INTL',
    methods: availableMethods.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      icon: m.icon,
      processingTime: m.processingTime,
      currencies: m.currencies,
    })),
    packages: packages.map(p => ({
      id: p.id,
      name: p.name,
      credits: p.credits,
      price: p.price,
      originalPrice: p.originalPrice,
      currency: p.currency,
      popular: p.popular,
      bestValue: p.bestValue,
      features: p.features,
    })),
    defaultCurrency: isCN ? 'CNY' : 'USD',
  });
}

