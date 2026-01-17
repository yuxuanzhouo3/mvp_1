/**
 * 微信退款回调 API (V3)
 * WeChat Refund V3 Callback API
 * 
 * 处理微信退款 V3 的异步通知
 * 通知内容使用 AES-GCM 加密
 */

import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/config/deployment.config';

export async function POST(request: NextRequest) {
  // 仅在 CN 环境可用
  if (!isChinaDeployment()) {
    return NextResponse.json(
      { code: 'FAIL', message: 'Not CN deployment' },
      { status: 400 }
    );
  }

  try {
    const body = await request.text();
    
    // 获取 V3 签名验证所需的头信息
    const timestamp = request.headers.get('Wechatpay-Timestamp');
    const nonce = request.headers.get('Wechatpay-Nonce');
    const signature = request.headers.get('Wechatpay-Signature');
    const serial = request.headers.get('Wechatpay-Serial');

    if (!timestamp || !nonce || !signature) {
      console.error('[WeChat Refund Callback] Missing signature headers');
      return NextResponse.json(
        { code: 'FAIL', message: '缺少签名信息' },
        { status: 400 }
      );
    }

    console.log('[WeChat Refund V3 Callback] Received notification, serial:', serial);

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

    if (refund_status === 'SUCCESS') {
      // 退款成功
      await updateRefundStatus(out_trade_no, out_refund_no, {
        status: 'refunded',
        refund_id,
        success_time,
        refund_amount: amount?.refund ? amount.refund / 100 : undefined,
      });

      console.log(`[WeChat Refund V3 Callback] Refund success: ${out_trade_no}`);
    } else if (refund_status === 'ABNORMAL') {
      // 退款异常
      await updateRefundStatus(out_trade_no, out_refund_no, {
        status: 'refund_abnormal',
        refund_id,
        refund_status,
      });

      console.warn(`[WeChat Refund V3 Callback] Refund abnormal: ${out_trade_no}`);
    } else if (refund_status === 'CLOSED') {
      // 退款关闭
      await updateRefundStatus(out_trade_no, out_refund_no, {
        status: 'refund_closed',
        refund_id,
      });

      console.log(`[WeChat Refund V3 Callback] Refund closed: ${out_trade_no}`);
    }

    // V3 要求返回 200 状态码和 JSON
    return NextResponse.json({ code: 'SUCCESS', message: '成功' });
  } catch (error: any) {
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
    const apiKey = process.env.WECHAT_PAY_API_KEY || '';
    
    if (resource.algorithm !== 'AEAD_AES_256_GCM') {
      throw new Error(`Unsupported algorithm: ${resource.algorithm}`);
    }

    const crypto = require('crypto');
    
    // 密钥需要是 32 字节
    const key = Buffer.from(apiKey, 'utf8');
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
  // TODO: 实际实现应该更新数据库
  console.log('[WeChat Refund V3] Update status:', { orderId, refundNo, data });
}

