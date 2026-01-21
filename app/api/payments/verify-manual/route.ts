import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { verifyUSDTPayment, verifyAlipayPayment } from '@/lib/payment/payment-receivers';

interface VerifyManualRequest {
  paymentId: string;
  paymentMethod: 'usdt' | 'alipay' | 'wechat';
  transactionHash?: string;
  transactionId?: string;
  amount: number;
  fromAddress?: string;
}

/**
 * 从请求中获取 CN 环境的用户 ID
 */
function getCnUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length);
    if (token.startsWith('cn_')) {
      return token.substring(3) || null;
    }
  }
  const cnSession =
    request.cookies.get('cn_session')?.value || request.cookies.get('cn_session_cross')?.value;
  return cnSession || null;
}

export async function POST(request: NextRequest) {
  try {
    let userId: string | null = null;

    // CN 环境认证
    if (isChinaDeployment()) {
      userId = getCnUserId(request);
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      // INTL 环境使用 Supabase 认证
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      userId = user.id;
    }

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
      case 'usdt':
        if (!transactionHash || !fromAddress) {
          return NextResponse.json(
            { error: 'Missing transaction hash or from address for USDT payment' },
            { status: 400 }
          );
        }
        verificationResult = await verifyUSDTPayment(paymentId, transactionHash, amount, fromAddress);
        break;
      
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
        verificationResult = await verifyWeChatPayment(db, paymentId, userId);
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
async function verifyWeChatPayment(db: any, paymentId: string, userId: string): Promise<boolean> {
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
      // 更新支付记录状态
      const { error: updateError } = await db
        .from('payments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            wechat_transaction_id: data.transaction_id,
            trade_state: data.trade_state,
            verified_at: new Date().toISOString(),
          },
        })
        .eq('id', paymentId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('[WeChat Verify] Update payment failed:', updateError);
        return false;
      }

      // 更新用户积分
      const { data: payment } = await db
        .from('payments')
        .select('credits')
        .eq('id', paymentId)
        .single();

      if (payment?.credits) {
        // 获取当前积分
        const { data: profile } = await db
          .from('user_profiles')
          .select('credits')
          .eq('user_id', userId)
          .single();

        const currentCredits = profile?.credits || 0;
        const newCredits = currentCredits + payment.credits;

        // 更新积分
        await db
          .from('user_profiles')
          .update({ credits: newCredits, updated_at: new Date().toISOString() })
          .eq('user_id', userId);

        console.log(`[WeChat Verify] Credits updated: ${currentCredits} + ${payment.credits} = ${newCredits}`);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('[WeChat Verify] Error:', error);
    return false;
  }
} 