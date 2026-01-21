import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { finalizeCnPayment } from '@/lib/payment/cn-payment-finalize';

function getCnUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length);
    if (token.startsWith('cn_')) {
      const userId = token.substring(3);
      return userId || null;
    }
  }

  const cnSession =
    request.cookies.get('cn_session')?.value || request.cookies.get('cn_session_cross')?.value;
  return cnSession || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { paymentId } = params;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing payment ID' },
        { status: 400 }
      );
    }

    if (isChinaDeployment()) {
      const userId = getCnUserId(request);
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const db = await getDbClient();
      const { data: payment, error: paymentError } = await db
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('user_id', userId)
        .single();

      if (paymentError || !payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      const paymentMethod = payment.method || payment.payment_method;
      const isWeChat = typeof paymentMethod === 'string' && paymentMethod.startsWith('wechat');
      const refreshParam = request.nextUrl.searchParams.get('refresh');
      const wantsRefresh = refreshParam === '1' || refreshParam === 'true';

      const createdAtMs = payment.created_at ? new Date(payment.created_at).getTime() : 0;
      const lastQueryAt = payment.metadata?.wechat_last_query_at;
      const lastQueryAtMs = lastQueryAt ? new Date(lastQueryAt).getTime() : 0;
      const nowMs = Date.now();

      const shouldAutoRefresh =
        isWeChat &&
        payment.status !== 'completed' &&
        payment.status !== 'cancelled' &&
        createdAtMs > 0 &&
        nowMs - createdAtMs > 15_000 &&
        (!lastQueryAtMs || nowMs - lastQueryAtMs > 25_000);

      if (isWeChat && (wantsRefresh || shouldAutoRefresh)) {
        const queryResult = await queryWeChatOrderStatus(paymentId);
        const nowIso = new Date().toISOString();

        if (queryResult.ok && queryResult.data?.trade_state) {
          const tradeState = queryResult.data.trade_state;
          const baseMetadata = {
            ...(payment.metadata || {}),
            wechat_last_query_at: nowIso,
            wechat_last_trade_state: tradeState,
          };

          if (tradeState === 'SUCCESS') {
            await finalizeCnPayment({
              paymentId,
              newStatus: 'completed',
              provider: 'wechat',
              providerOrderId: queryResult.data.transaction_id,
              providerAmountCents:
                typeof queryResult.data.amount?.total === 'number' && Number.isFinite(queryResult.data.amount.total)
                  ? queryResult.data.amount.total
                  : undefined,
              paidAt: queryResult.data.success_time,
              metadata: {
                ...baseMetadata,
                wechat_transaction_id: queryResult.data.transaction_id,
                trade_state: tradeState,
                verification_source: wantsRefresh ? 'status_refresh_param' : 'status_auto_refresh',
              },
            });
          } else if (tradeState === 'CLOSED') {
            await finalizeCnPayment({
              paymentId,
              newStatus: 'cancelled',
              provider: 'wechat',
              providerOrderId: queryResult.data.transaction_id,
              metadata: {
                ...baseMetadata,
                wechat_transaction_id: queryResult.data.transaction_id,
                trade_state: tradeState,
                verification_source: wantsRefresh ? 'status_refresh_param' : 'status_auto_refresh',
              },
            });
          } else {
            await db
              .from('payments')
              .update({
                metadata: baseMetadata,
                updated_at: nowIso,
              })
              .eq('id', paymentId)
              .eq('user_id', userId);
          }
        }
      }

      const { data: refreshedPayment } = await db
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('user_id', userId)
        .single();

      return NextResponse.json({
        id: refreshedPayment?.id || payment.id,
        status: refreshedPayment?.status || payment.status,
        amount: refreshedPayment?.amount ?? payment.amount,
        currency: refreshedPayment?.currency ?? payment.currency,
        paymentMethod: refreshedPayment?.method || refreshedPayment?.payment_method || paymentMethod,
        metadata: refreshedPayment?.metadata ?? payment.metadata,
        createdAt: refreshedPayment?.created_at || payment.created_at,
        updatedAt: refreshedPayment?.updated_at || payment.updated_at,
      });
    }

    const supabase = createSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', user.id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.payment_method,
      metadata: payment.metadata,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
    });
  } catch (error) {
    console.error('Payment status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

async function queryWeChatOrderStatus(paymentId: string): Promise<{ ok: boolean; data?: any }> {
  try {
    const mchId = process.env.WECHAT_PAY_MCHID || '';
    const serialNo = process.env.WECHAT_PAY_SERIAL_NO || '';
    const privateKey = (process.env.WECHAT_PAY_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!mchId || !serialNo || !privateKey) {
      console.error('[WeChat Status Refresh] Missing configuration');
      return { ok: false };
    }

    const crypto = require('crypto');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const urlPath = `/v3/pay/transactions/out-trade-no/${paymentId}?mchid=${mchId}`;
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
      console.error('[WeChat Status Refresh] Query failed:', { paymentId, status: response.status });
      return { ok: false };
    }

    return { ok: true, data };
  } catch (error) {
    console.error('[WeChat Status Refresh] Error:', error);
    return { ok: false };
  }
}
