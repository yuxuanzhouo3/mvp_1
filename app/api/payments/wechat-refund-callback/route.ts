/**
 * 微信退款回调 API (V3)
 * WeChat Refund V3 Callback API
 * 
 * 处理微信退款 V3 的异步通知
 * 通知内容使用 AES-GCM 加密
 */

import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { getServiceDbClient } from '@/lib/db-client';
import { buildPaymentRequestContext, recordPaymentEvent } from '@/lib/observability/payment-events';
import { getWeChatPlatformPublicKeyPem } from '@/lib/wechatpay/platform-certs';
import { finalizeCnRefund } from '@/lib/payment/cn-refund-finalize';

export async function POST(request: NextRequest) {
  // 仅在 CN 环境可用
  if (!isChinaDeployment()) {
    return NextResponse.json(
      { code: 'FAIL', message: 'Not CN deployment' },
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
      console.error('[WeChat Refund Callback] Missing signature headers');
      return NextResponse.json(
        { code: 'FAIL', message: '缺少签名信息' },
        { status: 400 }
      );
    }

    console.log('[WeChat Refund V3 Callback] Received notification, serial:', serial);

    await recordPaymentEvent(ctx, {
      event: 'CALLBACK_RECEIVED',
      level: 'info',
      paymentId: 'unknown',
      provider: 'wechat',
      metadata: { serial },
    });

    const signatureVerified = await verifyWeChatV3Signature(timestamp, nonce, body, signature, serial);
    if (!signatureVerified) {
      await recordPaymentEvent(ctx, {
        event: 'SIGNATURE_VERIFY_FAILED',
        level: 'warn',
        paymentId: 'unknown',
        provider: 'wechat',
        metadata: { serial },
      });
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
      console.error('[WeChat Refund Callback] Missing resource in notification');
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
      console.error('[WeChat Refund Callback] Failed to decrypt resource');
      return NextResponse.json(
        { code: 'FAIL', message: '解密失败' },
        { status: 500 }
      );
    }

    console.log('[WeChat Refund V3 Callback] Decrypted data:', {
      refund_status: decrypted.refund_status,
      out_trade_no: decrypted.out_trade_no,
      out_refund_no: decrypted.out_refund_no,
    });

    // 处理退款结果
    const { refund_status, out_trade_no, out_refund_no, refund_id, success_time, amount } = decrypted;
    const refundAmountYuan = amount?.refund ? amount.refund / 100 : undefined;

    await recordPaymentEvent(ctx, {
      event: 'REFUND_NOTIFICATION_DECRYPTED',
      level: 'info',
      paymentId: out_trade_no,
      provider: 'wechat',
      providerOrderId: refund_id,
      status: refund_status,
      metadata: { out_refund_no: out_refund_no, refundAmountYuan },
    });

    if (refund_status === 'SUCCESS') {
      await finalizeCnRefund({
        paymentId: out_trade_no,
        provider: 'wechat',
        refundNo: out_refund_no,
        refundId: refund_id,
        refundStatus: refund_status,
        refundAmountYuan,
        successTime: success_time,
        ctx,
      });
    } else if (refund_status === 'ABNORMAL') {
      // 退款异常
      await updateRefundStatus(out_trade_no, out_refund_no, {
        status: 'refund_abnormal',
        refund_id,
        refund_status,
        refund_amount: refundAmountYuan,
      });

      console.warn(`[WeChat Refund V3 Callback] Refund abnormal: ${out_trade_no}`);
    } else if (refund_status === 'CLOSED') {
      // 退款关闭
      await updateRefundStatus(out_trade_no, out_refund_no, {
        status: 'refund_closed',
        refund_id,
        refund_status,
        refund_amount: refundAmountYuan,
      });

      console.log(`[WeChat Refund V3 Callback] Refund closed: ${out_trade_no}`);
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
    console.error('[WeChat Refund V3 Callback] Error:', error);
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
    console.error('[WeChat Refund V3] Decrypt error:', error);
    return null;
  }
}

/**
 * 更新退款状态
 */
async function updateRefundStatus(
  orderId: string,
  refundNo: string,
  data: {
    status: string;
    refund_id?: string;
    success_time?: string;
    refund_amount?: number;
    refund_status?: string;
  }
): Promise<void> {
  const db = await getServiceDbClient();
  const nowIso = new Date().toISOString();

  const { data: payment, error } = await db
    .from('payments')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error || !payment) {
    console.warn('[WeChat Refund V3] Payment not found', { orderId, refundNo, error: error?.message });
    return;
  }

  const currentStatus = typeof payment.status === 'string' ? payment.status : 'unknown';
  const currentMetadata = (payment.metadata && typeof payment.metadata === 'object') ? payment.metadata : {};
  const refundMeta = (currentMetadata as any).refund && typeof (currentMetadata as any).refund === 'object'
    ? (currentMetadata as any).refund
    : {};

  const nextStatus =
    data.status === 'refunded'
      ? 'refunded'
      : (data.status === 'refund_abnormal' || data.status === 'refund_closed') &&
          currentStatus === 'refunded' &&
          !refundMeta.applied_at
        ? 'completed'
        : currentStatus;

  await db
    .from('payments')
    .update({
      status: nextStatus,
      metadata: {
        ...currentMetadata,
        refund: {
          ...refundMeta,
          refund_no: refundNo,
          ...data,
          updated_at: nowIso,
        },
      },
      updated_at: nowIso,
    })
    .eq('id', orderId);
}

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
      console.error('[WeChat Refund V3] Missing platform certificate for serial:', serial);
      return false;
    }

    const message = `${timestamp}\n${nonce}\n${body}\n`;
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(message);
    verify.end();

    return verify.verify(publicKeyPem, signature, 'base64');
  } catch (error) {
    console.error('[WeChat Refund V3] Signature verification error:', error);
    return false;
  }
}
