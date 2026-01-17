/**
 * 创建支付订单 API
 * Create Payment Order API
 * 
 * 根据部署环境自动选择支付服务:
 * - CN 环境: 微信支付 / 支付宝
 * - INTL 环境: Stripe / PayPal
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPaymentService } from '@/lib/services/payment';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import type { PaymentMethod, Currency, CreatePaymentRequest } from '@/lib/services/payment/types';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      packageId,
      method,
      returnUrl,
      cancelUrl,
    } = body as {
      packageId: string;
      method: PaymentMethod;
      returnUrl?: string;
      cancelUrl?: string;
    };

    if (!packageId || !method) {
      return NextResponse.json(
        { error: 'Package ID and payment method are required' },
        { status: 400 }
      );
    }

    // 获取支付服务
    const paymentService = getPaymentService();
    const isCN = isChinaDeployment();

    // 验证支付方式是否可用
    const availableMethods = paymentService.getAvailablePaymentMethods();
    const selectedMethod = availableMethods.find(m => m.id === method);
    
    if (!selectedMethod || !selectedMethod.available) {
      return NextResponse.json(
        { 
          error: `Payment method '${method}' is not available in ${isCN ? 'CN' : 'INTL'} region`,
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
    const paymentRequest: CreatePaymentRequest = {
      userId: user.id,
      amount: selectedPackage.price,
      currency: selectedPackage.currency,
      credits: selectedPackage.credits,
      method: method,
      packageId: packageId,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing/result`,
      cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing`,
      metadata: {
        packageName: selectedPackage.name,
        userEmail: user.email,
      },
    };

    console.log(`[Payment Create] Creating ${method} payment for user ${user.id}`, {
      packageId,
      amount: selectedPackage.price,
      currency: selectedPackage.currency,
      credits: selectedPackage.credits,
    });

    // 创建支付
    const result = await paymentService.createPayment(paymentRequest);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Failed to create payment',
          errorCode: result.errorCode,
        },
        { status: 500 }
      );
    }

    console.log(`[Payment Create] Payment created successfully: ${result.paymentId}`);

    return NextResponse.json({
      success: true,
      paymentId: result.paymentId,
      redirectUrl: result.redirectUrl,
      qrCodeUrl: result.qrCodeUrl,
      qrCodeBase64: result.qrCodeBase64,
      method: method,
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

