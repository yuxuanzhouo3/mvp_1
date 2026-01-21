/**
 * 微信支付回调 API (V3)
 * WeChat Pay V3 Callback API
 * 
 * 处理微信支付 V3 的异步通知
 * 通知内容使用 AES-GCM 加密
 */

import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { finalizeCnPayment } from '@/lib/payment/cn-payment-finalize';
import { buildPaymentRequestContext, recordPaymentEvent } from '@/lib/observability/payment-events';
import { getWeChatPlatformPublicKeyPem } from '@/lib/wechatpay/platform-certs';

export async function POST(request: NextRequest) {
  // 仅在 CN 环境可用
  if (!isChinaDeployment()) {
    return NextResponse.json(
      { code: 'FAIL', message: 'WeChat Pay callback only available in CN deployment' },
      { status: 400 }
    );
  }

  const ctx = buildPaymentRequestContext(request);
  try {
    const body = await request.text();

    // 获取 V3 签名验证所需的头信息
    const timestamp = request.headers.get('Wechatpay-Timestamp');
    const nonce = request.headers.get('Wechatpay-Nonce');
    const signature = request.headers.get('Wechatpay-Signature');
    const serial = request.headers.get('Wechatpay-Serial');

    if (!timestamp || !nonce || !signature || !serial) {
      await recordPaymentEvent(ctx, {
        event: 'CALLBACK_REJECTED',
        level: 'warn',
        paymentId: 'unknown',
        provider: 'wechat',
        errorCode: 'MISSING_SIGNATURE_HEADERS',
        metadata: { serial },
      });
      console.error('[WeChat Pay Callback] Missing signature headers');
      return NextResponse.json(
        { code: 'FAIL', message: '缺少签名信息' },
        { status: 400 }
      );
    }

    await recordPaymentEvent(ctx, {
      event: 'CALLBACK_RECEIVED',
      level: 'info',
      paymentId: 'unknown',
      provider: 'wechat',
      metadata: { serial },
    });

    console.log('[WeChat Pay V3 Callback] Received notification, serial:', serial);

    // 验证签名
    const signatureVerified = await verifyWeChatV3Signature(
      timestamp,
      nonce,
      body,
      signature,
      serial
    );

    if (!signatureVerified) {
      await recordPaymentEvent(ctx, {
        event: 'SIGNATURE_VERIFY_FAILED',
        level: 'warn',
        paymentId: 'unknown',
        provider: 'wechat',
        metadata: { serial },
      });
      console.error('[WeChat Pay Callback] Signature verification failed');
      return NextResponse.json(
        { code: 'FAIL', message: '签名验证失败' },
        { status: 401 }
      );
    }

    await recordPaymentEvent(ctx, {
      event: 'SIGNATURE_VERIFIED',
      level: 'info',
      paymentId: 'unknown',
      provider: 'wechat',
      metadata: { serial },
    });

    // 解析通知数据
    const notification = JSON.parse(body);
    
    // V3 通知内容是加密的，需要解密
    const { resource } = notification;
    if (!resource) {
      await recordPaymentEvent(ctx, {
        event: 'CALLBACK_REJECTED',
        level: 'warn',
        paymentId: 'unknown',
        provider: 'wechat',
        errorCode: 'MISSING_RESOURCE',
      });
      console.error('[WeChat Pay Callback] Missing resource in notification');
      return NextResponse.json(
        { code: 'FAIL', message: '无效的通知数据' },
        { status: 400 }
      );
    }

    // 使用 API V3 密钥解密通知内容
    const decrypted = await decryptResource(resource);
    
    if (!decrypted) {
      await recordPaymentEvent(ctx, {
        event: 'DECRYPT_FAILED',
        level: 'error',
        paymentId: 'unknown',
        provider: 'wechat',
      });
      console.error('[WeChat Pay Callback] Failed to decrypt resource');
      return NextResponse.json(
        { code: 'FAIL', message: '解密失败' },
        { status: 500 }
      );
    }

    const paymentId = decrypted.out_trade_no;
    await recordPaymentEvent(ctx, {
      event: 'PAYLOAD_DECRYPTED',
      level: 'info',
      paymentId: paymentId || 'unknown',
      provider: 'wechat',
      providerOrderId: decrypted.transaction_id,
      status: decrypted.trade_state,
      receivedAmountCents: decrypted.amount?.total,
    });

    console.log('[WeChat Pay V3 Callback] Decrypted data:', {
      trade_state: decrypted.trade_state,
      out_trade_no: decrypted.out_trade_no,
    });

    // 处理支付结果
    if (decrypted.trade_state === 'SUCCESS') {
      const result = await finalizeCnPayment({
        paymentId,
        newStatus: 'completed',
        provider: 'wechat',
        providerOrderId: decrypted.transaction_id,
        providerAmountCents: decrypted.amount?.total,
        paidAt: decrypted.success_time,
        metadata: {
          transaction_id: decrypted.transaction_id,
          paid_at: decrypted.success_time,
          payer_openid: decrypted.payer?.openid,
          trade_state: decrypted.trade_state,
        },
        ctx,
      });

      if (!result.ok) {
        await recordPaymentEvent(ctx, {
          event: 'FINALIZE_FAILED',
          level: 'warn',
          paymentId: paymentId || 'unknown',
          provider: 'wechat',
          providerOrderId: decrypted.transaction_id,
          errorCode: result.error,
        });
        console.error('[WeChat Pay V3 Callback] Finalize failed:', result.error, {
          out_trade_no: decrypted.out_trade_no,
        });
        return NextResponse.json(
          { code: 'FAIL', message: '订单校验失败' },
          { status: 400 }
        );
      }

      console.log(`[WeChat Pay V3 Callback] Payment success: ${decrypted.out_trade_no}`);
    } else if (decrypted.trade_state === 'CLOSED') {
      await finalizeCnPayment({
        paymentId,
        newStatus: 'cancelled',
        provider: 'wechat',
        providerOrderId: decrypted.transaction_id,
        metadata: {
          transaction_id: decrypted.transaction_id,
          trade_state: decrypted.trade_state,
        },
        ctx,
      });
    }

    // V3 要求返回 200 状态码和 JSON
    return NextResponse.json({ code: 'SUCCESS', message: '成功' });
  } catch (error: any) {
    await recordPaymentEvent(ctx, {
      event: 'CALLBACK_ERROR',
      level: 'error',
      paymentId: 'unknown',
      provider: 'wechat',
      errorMessage: error?.message || String(error),
    });
    console.error('[WeChat Pay V3 Callback] Error:', error);
    return NextResponse.json(
      { code: 'FAIL', message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * 解密微信支付 V3 通知资源
 * 使用 AES-256-GCM 解密
 */
async function decryptResource(resource: {
  algorithm: string;
  ciphertext: string;
  associated_data: string;
  nonce: string;
  original_type?: string;
}): Promise<any> {
  try {
    const apiKey = process.env.WECHAT_PAY_API_V3_KEY || '';
    
    if (resource.algorithm !== 'AEAD_AES_256_GCM') {
      throw new Error(`Unsupported algorithm: ${resource.algorithm}`);
    }

    const crypto = require('crypto');
    
    // 密钥需要是 32 字节
    const key = Buffer.from(apiKey, 'utf8');
    if (key.length !== 32) {
      throw new Error('WECHAT_PAY_API_V3_KEY must be 32 bytes');
    }
    const nonce = Buffer.from(resource.nonce, 'utf8');
    const ciphertext = Buffer.from(resource.ciphertext, 'base64');
    const associatedData = Buffer.from(resource.associated_data || '', 'utf8');

    // AES-GCM 解密
    // ciphertext 的最后 16 字节是 auth tag
    const authTag = ciphertext.slice(-16);
    const data = ciphertext.slice(0, -16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(authTag);
    decipher.setAAD(associatedData);

    let decrypted = decipher.update(data, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('[WeChat Pay V3] Decrypt error:', error);
    return null;
  }
}

/**
 * 验证微信支付 V3 签名
 */
async function verifyWeChatV3Signature(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  serial: string
): Promise<boolean> {
  try {
    const crypto = require('crypto');
    const publicKeyPem = await getWeChatPlatformPublicKeyPem(serial);
    if (!publicKeyPem) {
      console.error('[WeChat Pay V3] Missing platform certificate for serial:', serial);
      return false;
    }

    const message = `${timestamp}\n${nonce}\n${body}\n`;
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(message);
    verify.end();

    return verify.verify(publicKeyPem, signature, 'base64');
  } catch (error) {
    console.error('[WeChat Pay V3] Signature verification error:', error);
    return false;
  }
}
