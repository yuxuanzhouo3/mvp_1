import { NextRequest, NextResponse } from 'next/server';
import { getDbClientFromRequest } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';
import { isChinaRequest } from '@/lib/config/request-region';
import { finalizeCnRefund } from '@/lib/payment/cn-refund-finalize';

export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { paymentId } = params;
    if (!paymentId) {
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
    }

    if (!isChinaRequest(request)) {
      return NextResponse.json({ error: 'Not CN request' }, { status: 400 });
    }

    const authUser = await requireUser(request);
    const db = await getDbClientFromRequest(request);

    const { data: payment, error: paymentError } = await db
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', authUser.userId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const refundNo = payment?.metadata?.refund?.refund_no;
    if (typeof refundNo !== 'string' || refundNo.trim().length === 0) {
      return NextResponse.json({ error: 'Missing refund_no' }, { status: 400 });
    }

    const query = await queryWeChatRefundStatus(refundNo.trim());
    const nowIso = new Date().toISOString();

    let providerStatus: string | undefined;
    let providerRefundId: string | undefined;
    let providerSuccessTime: string | undefined;
    let refundAmountYuan: number | undefined;

    if (query.ok && query.data) {
      providerStatus = query.data.status || query.data.refund_status;
      providerRefundId = query.data.refund_id;
      providerSuccessTime = query.data.success_time;
      const refundCents = query.data.amount?.refund;
      if (typeof refundCents === 'number' && Number.isFinite(refundCents)) {
        refundAmountYuan = refundCents / 100;
      }

      const baseMetadata = {
        ...(payment.metadata || {}),
        wechat_refund_last_query_at: nowIso,
        wechat_refund_last_status: providerStatus,
      };

      if (providerStatus === 'SUCCESS') {
        await finalizeCnRefund({
          paymentId,
          provider: 'wechat',
          refundNo,
          refundId: providerRefundId,
          refundStatus: providerStatus,
          refundAmountYuan,
          successTime: providerSuccessTime,
        });
      } else {
        await db
          .from('payments')
          .update({ metadata: baseMetadata, updated_at: nowIso })
          .eq('id', paymentId)
          .eq('user_id', authUser.userId);
      }
    }

    const { data: refreshed } = await db
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', authUser.userId)
      .single();

    return NextResponse.json({
      paymentId,
      provider: 'wechat',
      providerStatus: providerStatus || null,
      localStatus: refreshed?.status ?? payment.status,
      refundNo,
      refundMeta: refreshed?.metadata?.refund ?? payment?.metadata?.refund ?? null,
      metadata: refreshed?.metadata ?? payment.metadata,
      updatedAt: refreshed?.updated_at ?? payment.updated_at,
    });
  } catch (error: any) {
    const message = error?.message ? String(error.message) : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function queryWeChatRefundStatus(refundNo: string): Promise<{ ok: boolean; data?: any }> {
  try {
    const mchId = process.env.WECHAT_PAY_MCHID || '';
    const serialNo = process.env.WECHAT_PAY_SERIAL_NO || '';
    const privateKey = (process.env.WECHAT_PAY_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!mchId || !serialNo || !privateKey) {
      return { ok: false };
    }

    const crypto = require('crypto');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const urlPath = `/v3/refund/domestic/refunds/${encodeURIComponent(refundNo)}`;
    const signMessage = `GET\n${urlPath}\n${timestamp}\n${nonceStr}\n\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signMessage);

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

    const response = await fetch(`https://api.mch.weixin.qq.com${urlPath}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: authorization,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return { ok: false, data };
    }

    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

