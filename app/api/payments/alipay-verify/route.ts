/**
 * 支付宝支付手动验证 API (用于本地测试)
 * Alipay Payment Manual Verification API (for local testing)
 *
 * 当本地测试时Alipay回调无法到达localhost，使用此接口主动查询支付状态并完成履约
 */

import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { finalizeCnPayment } from '@/lib/payment/cn-payment-finalize';
import { buildPaymentRequestContext, recordPaymentEvent } from '@/lib/observability/payment-events';
import { getServiceDbClient } from '@/lib/db-client';

export async function POST(request: NextRequest) {
  if (!isChinaDeployment()) {
    return NextResponse.json(
      { error: 'Alipay verify only available in CN deployment' },
      { status: 400 }
    );
  }

  const ctx = buildPaymentRequestContext(request);

  try {
    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing paymentId' },
        { status: 400 }
      );
    }

    await recordPaymentEvent(ctx, {
      event: 'MANUAL_VERIFY_START',
      level: 'info',
      paymentId,
      provider: 'alipay',
    });

    // 查询支付记录
    const db = await getServiceDbClient();
    const { data: payment, error: paymentError } = await db
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      await recordPaymentEvent(ctx, {
        event: 'MANUAL_VERIFY_FAILED',
        level: 'warn',
        paymentId,
        provider: 'alipay',
        errorCode: 'PAYMENT_NOT_FOUND',
      });
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // 如果已经完成，直接返回
    if (payment.status === 'completed') {
      await recordPaymentEvent(ctx, {
        event: 'MANUAL_VERIFY_ALREADY_COMPLETED',
        level: 'info',
        paymentId,
        userId: payment.user_id,
        provider: 'alipay',
        status: 'completed',
      });
      return NextResponse.json({
        success: true,
        message: 'Payment already completed',
        payment: {
          id: payment.id,
          status: payment.status,
          metadata: payment.metadata,
        },
      });
    }

    // 查询支付宝订单状态
    const alipayStatus = await queryAlipayOrderStatus(payment.provider_order_id || paymentId);

    if (!alipayStatus.success) {
      await recordPaymentEvent(ctx, {
        event: 'ALIPAY_QUERY_FAILED',
        level: 'warn',
        paymentId,
        provider: 'alipay',
        errorMessage: alipayStatus.error,
      });
      return NextResponse.json(
        { error: alipayStatus.error || 'Failed to query Alipay order status' },
        { status: 500 }
      );
    }

    await recordPaymentEvent(ctx, {
      event: 'ALIPAY_QUERY_SUCCESS',
      level: 'info',
      paymentId,
      provider: 'alipay',
      providerOrderId: alipayStatus.tradeNo,
      status: alipayStatus.tradeStatus,
    });

    // 根据支付宝返回的状态更新支付记录
    let status: 'pending' | 'completed' | 'cancelled' = 'pending';
    if (alipayStatus.tradeStatus === 'TRADE_SUCCESS' || alipayStatus.tradeStatus === 'TRADE_FINISHED') {
      status = 'completed';
    } else if (alipayStatus.tradeStatus === 'TRADE_CLOSED') {
      status = 'cancelled';
    }

    // 完成支付履约
    const result = await finalizeCnPayment({
      paymentId,
      newStatus: status,
      provider: 'alipay',
      providerOrderId: alipayStatus.tradeNo,
      providerAmountYuan: alipayStatus.totalAmount,
      metadata: {
        alipay_trade_no: alipayStatus.tradeNo,
        trade_status: alipayStatus.tradeStatus,
        buyer_id: alipayStatus.buyerId,
        total_amount: alipayStatus.totalAmount,
        manual_verify: true,
      },
      ctx,
    });

    if (!result.ok) {
      await recordPaymentEvent(ctx, {
        event: 'MANUAL_VERIFY_FINALIZE_FAILED',
        level: 'error',
        paymentId,
        provider: 'alipay',
        errorCode: result.error,
      });
      return NextResponse.json(
        { error: result.error || 'Failed to finalize payment' },
        { status: 500 }
      );
    }

    await recordPaymentEvent(ctx, {
      event: 'MANUAL_VERIFY_COMPLETED',
      level: 'info',
      paymentId,
      userId: payment.user_id,
      provider: 'alipay',
      status,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified and processed successfully',
      payment: {
        id: paymentId,
        status,
        tradeNo: alipayStatus.tradeNo,
        tradeStatus: alipayStatus.tradeStatus,
      },
    });
  } catch (error: any) {
    await recordPaymentEvent(ctx, {
      event: 'MANUAL_VERIFY_ERROR',
      level: 'error',
      paymentId: 'unknown',
      provider: 'alipay',
      errorMessage: error?.message || String(error),
    });
    console.error('[Alipay Manual Verify] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 查询支付宝订单状态
 */
async function queryAlipayOrderStatus(outTradeNo: string): Promise<{
  success: boolean;
  tradeNo?: string;
  tradeStatus?: string;
  totalAmount?: string;
  buyerId?: string;
  error?: string;
}> {
  try {
    const crypto = require('crypto');
    const https = require('https');

    const appId = process.env.ALIPAY_APP_ID || '';
    const privateKey = process.env.ALIPAY_PRIVATE_KEY || '';
    const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY || '';

    if (!appId || !privateKey || !alipayPublicKey) {
      return { success: false, error: 'Missing Alipay configuration' };
    }

    // 构建请求参数
    const bizContent = JSON.stringify({
      out_trade_no: outTradeNo,
    });

    const params: Record<string, string> = {
      app_id: appId,
      method: 'alipay.trade.query',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      version: '1.0',
      biz_content: bizContent,
    };

    // 生成签名
    const sortedKeys = Object.keys(params).sort();
    const signContent = sortedKeys.map(key => `${key}=${params[key]}`).join('&');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signContent, 'utf8');
    sign.end();

    const formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
    params.sign = sign.sign(formattedPrivateKey, 'base64');

    // 发送请求到支付宝
    const gateway = process.env.ALIPAY_NOTIFY_URL || 'https://openapi-sandbox.dl.alipaydev.com/gateway.do';
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    const response = await new Promise<any>((resolve, reject) => {
      const url = `${gateway}?${queryString}`;
      https.get(url, (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse Alipay response'));
          }
        });
      }).on('error', reject);
    });

    const responseData = response.alipay_trade_query_response;

    if (!responseData || responseData.code !== '10000') {
      return {
        success: false,
        error: responseData?.sub_msg || responseData?.msg || 'Query failed',
      };
    }

    return {
      success: true,
      tradeNo: responseData.trade_no,
      tradeStatus: responseData.trade_status,
      totalAmount: responseData.total_amount,
      buyerId: responseData.buyer_user_id,
    };
  } catch (error: any) {
    console.error('[Alipay Query] Error:', error);
    return {
      success: false,
      error: error.message || 'Query error',
    };
  }
}
