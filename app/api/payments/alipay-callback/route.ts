/**
 * 支付宝支付回调 API
 * Alipay Payment Callback API
 * 
 * 处理支付宝的异步通知
 */

import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { finalizeCnPayment } from '@/lib/payment/cn-payment-finalize';
import { buildPaymentRequestContext, recordPaymentEvent } from '@/lib/observability/payment-events';

export async function POST(request: NextRequest) {
  // 仅在 CN 环境可用
  if (!isChinaDeployment()) {
    return NextResponse.json(
      { error: 'Alipay callback only available in CN deployment' },
      { status: 400 }
    );
  }

  const ctx = buildPaymentRequestContext(request);
  try {
    // 获取支付宝通知数据
    const formData = await request.formData();
    const params: Record<string, string> = {};

    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    await recordPaymentEvent(ctx, {
      event: 'CALLBACK_RECEIVED',
      level: 'info',
      paymentId: params.out_trade_no || 'unknown',
      provider: 'alipay',
      providerOrderId: params.trade_no,
      status: params.trade_status,
      metadata: { notify_id: params.notify_id },
    });

    console.log('[Alipay Callback] Received:', {
      trade_status: params.trade_status,
      out_trade_no: params.out_trade_no,
      trade_no: params.trade_no,
    });

    // 验证签名
    const signatureVerified = await verifyAlipaySignature(params);

    if (!signatureVerified) {
      await recordPaymentEvent(ctx, {
        event: 'SIGNATURE_VERIFY_FAILED',
        level: 'warn',
        paymentId: params.out_trade_no || 'unknown',
        provider: 'alipay',
        providerOrderId: params.trade_no,
        status: params.trade_status,
      });
      console.error('[Alipay Callback] Signature verification failed');
      return new NextResponse('fail', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    await recordPaymentEvent(ctx, {
      event: 'SIGNATURE_VERIFIED',
      level: 'info',
      paymentId: params.out_trade_no || 'unknown',
      provider: 'alipay',
      providerOrderId: params.trade_no,
      status: params.trade_status,
    });

    // 更新支付状态
    const result = await updateAlipayPaymentStatus(ctx, params);

    if (result.success) {
      // 支付宝要求返回 "success" 字符串表示成功
      return new NextResponse('success', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    } else {
      await recordPaymentEvent(ctx, {
        event: 'FINALIZE_FAILED',
        level: 'warn',
        paymentId: params.out_trade_no || 'unknown',
        provider: 'alipay',
        providerOrderId: params.trade_no,
        status: params.trade_status,
        errorCode: result.error,
      });
      console.error('[Alipay Callback] Processing failed:', result.error);
      return new NextResponse('fail', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  } catch (error: any) {
    await recordPaymentEvent(ctx, {
      event: 'CALLBACK_ERROR',
      level: 'error',
      paymentId: 'unknown',
      provider: 'alipay',
      errorMessage: error?.message || String(error),
    });
    console.error('[Alipay Callback] Error:', error);
    return new NextResponse('fail', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// 支付宝同步返回（用户支付完成后跳转）
export async function GET(request: NextRequest) {
  if (!isChinaDeployment()) {
    return NextResponse.redirect(new URL('/dashboard/billing', request.url));
  }

  const { searchParams } = new URL(request.url);
  const outTradeNo = searchParams.get('out_trade_no');
  const tradeNo = searchParams.get('trade_no');
  const tradeStatus = searchParams.get('trade_status') || searchParams.get('result');

  console.log('[Alipay Return] User returned:', {
    outTradeNo,
    tradeNo,
    tradeStatus,
  });

  // 重定向到支付结果页面
  const redirectUrl = new URL('/dashboard/billing/result', request.url);
  redirectUrl.searchParams.set('payment_id', outTradeNo || '');
  redirectUrl.searchParams.set('status', tradeStatus === 'TRADE_SUCCESS' ? 'success' : 'pending');
  redirectUrl.searchParams.set('method', 'alipay');

  return NextResponse.redirect(redirectUrl);
}

/**
 * 验证支付宝签名 (RSA2)
 */
async function verifyAlipaySignature(params: Record<string, string>): Promise<boolean> {
  try {
    const crypto = require('crypto');
    const publicKey = process.env.ALIPAY_PUBLIC_KEY || '';

    if (!publicKey) {
      console.error('[Alipay] Missing public key');
      return false;
    }

    const sign = params.sign;
    const signType = params.sign_type;

    if (!sign || signType !== 'RSA2') {
      console.error('[Alipay] Invalid signature or sign_type');
      return false;
    }

    // 构建待签名字符串
    const sortedKeys = Object.keys(params)
      .filter(key => key !== 'sign' && key !== 'sign_type' && params[key])
      .sort();
    const signContent = sortedKeys.map(key => `${key}=${params[key]}`).join('&');

    // 验证签名
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(signContent, 'utf8');
    verify.end();

    const formattedKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    return verify.verify(formattedKey, sign, 'base64');
  } catch (error) {
    console.error('[Alipay] Signature verification error:', error);
    return false;
  }
}

/**
 * 更新支付宝支付状态
 */
async function updateAlipayPaymentStatus(
  ctx: ReturnType<typeof buildPaymentRequestContext>,
  params: Record<string, string>
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const tradeStatus = params.trade_status;
    const paymentId = params.out_trade_no;
    const tradeNo = params.trade_no;

    let status: 'pending' | 'completed' | 'cancelled' = 'pending';
    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      status = 'completed';
    } else if (tradeStatus === 'TRADE_CLOSED') {
      status = 'cancelled';
    }

    const finalize = await finalizeCnPayment({
      paymentId,
      newStatus: status,
      provider: 'alipay',
      providerOrderId: tradeNo,
      providerAmountYuan: params.total_amount,
      metadata: {
        alipay_trade_no: tradeNo,
        trade_status: tradeStatus,
        buyer_id: params.buyer_id,
        total_amount: params.total_amount,
      },
      ctx,
    });

    if (!finalize.ok) {
      console.error('[Alipay Callback] Finalize failed:', finalize.error, { paymentId, tradeNo });
      return { success: false, error: finalize.error };
    }

    console.log('[Alipay Callback] Payment status updated:', {
      paymentId,
      status,
      tradeNo,
    });

    return { success: status === 'completed' };
  } catch (error: any) {
    console.error('[Alipay Callback] Update payment status error:', error);
    return { success: false, error: error.message };
  }
}

