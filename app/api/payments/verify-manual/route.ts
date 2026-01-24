import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { verifyAlipayPayment } from '@/lib/payment/payment-receivers';
import { finalizeCnPayment } from '@/lib/payment/cn-payment-finalize';
import { requireUser } from '@/lib/auth/requireUser';

interface VerifyManualRequest {
  paymentId: string;
  paymentMethod: 'alipay' | 'wechat';
  transactionHash?: string;
  transactionId?: string;
  amount: number;
  fromAddress?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireUser(request);
    const userId = authUser.userId;

    const body: VerifyManualRequest = await request.json();
    const { paymentId, paymentMethod, transactionHash, transactionId, amount, fromAddress } = body;

    // Validate request
    if (!paymentId || !paymentMethod || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 使用统一数据库客户端
    const db = await getServiceDbClient();

    // Verify payment belongs to user
    const { data: payment, error: paymentError } = await db
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', userId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    let verificationResult = false;

    // Verify based on payment method
    switch (paymentMethod) {
      case 'alipay':
        if (!transactionId) {
          return NextResponse.json(
            { error: 'Missing transaction ID for Alipay payment' },
            { status: 400 }
          );
        }
        verificationResult = await verifyAlipayPayment(paymentId, transactionId, amount);
        break;

      case 'wechat':
        // 微信支付：查询微信支付订单状态
        verificationResult = await verifyWeChatPayment(paymentId, userId);
        break;

      default:
        return NextResponse.json(
          { error: 'Unsupported payment method' },
          { status: 400 }
        );
    }

    if (verificationResult) {
      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        paymentId: paymentId,
      });
    } else {
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Manual payment verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 验证微信支付订单状态
 * 通过微信支付 API 查询订单状态，并更新数据库
 */
async function verifyWeChatPayment(paymentId: string, userId: string): Promise<boolean> {
  try {
    // 获取微信支付配置
    const appId = process.env.WECHAT_PAY_APPID || '';
    const mchId = process.env.WECHAT_PAY_MCHID || '';
    const serialNo = process.env.WECHAT_PAY_SERIAL_NO || '';
    const privateKey = (process.env.WECHAT_PAY_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!appId || !mchId || !serialNo || !privateKey) {
      console.error('[WeChat Verify] Missing configuration');
      return false;
    }

    // 生成签名
    const crypto = require('crypto');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const url = `/v3/pay/transactions/out-trade-no/${paymentId}?mchid=${mchId}`;
    
    const signMessage = `GET\n${url}\n${timestamp}\n${nonceStr}\n\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signMessage);
    
    // 处理私钥格式
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

    // 查询微信支付订单
    const response = await fetch(`https://api.mch.weixin.qq.com${url}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': authorization,
      },
    });

    const data = await response.json();
    console.log('[WeChat Verify] Query result:', { paymentId, status: response.status, tradeState: data.trade_state });

    if (!response.ok) {
      console.error('[WeChat Verify] Query failed:', data);
      return false;
    }

    // 检查支付状态
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
          verification_source: 'manual',
        },
      });

      if (!finalizeResult.ok) {
        console.error('[WeChat Verify] Finalize failed:', finalizeResult.error);
        return false;
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('[WeChat Verify] Error:', error);
    return false;
  }
} 
