import { getServiceDbClient } from '@/lib/db-client';
import type { PaymentRequestContext } from '@/lib/observability/payment-events';
import { recordPaymentEvent } from '@/lib/observability/payment-events';
import { sendAlert } from '@/lib/observability/alerts';

type Provider = 'wechat' | 'alipay';

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

async function ensureUserProfile(db: any, userId: string) {
  const { data: profile } = await db
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profile) return profile;

  const nowIso = new Date().toISOString();
  const { data: inserted } = await db
    .from('user_profiles')
    .insert({
      user_id: userId,
      credits: 0,
      credits_updated_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select()
    .single();

  return inserted;
}

async function insertTransaction(db: any, data: any) {
  try {
    await db.from('transactions').insert(data);
  } catch {
    try {
      await db.from('credit_transactions').insert(data);
    } catch {}
  }
}

async function expireMembershipIfPresent(db: any, userId: string) {
  const nowIso = new Date().toISOString();
  try {
    await db
      .from('user_memberships')
      .update({ tier: 'free', expires_at: nowIso, updated_at: nowIso })
      .eq('user_id', userId);
  } catch {
    try {
      await db
        .from('user_memberships')
        .update({ expires_at: nowIso, updated_at: nowIso })
        .eq('user_id', userId);
    } catch {}
  }
}

export async function finalizeCnRefund(params: {
  paymentId: string;
  provider: Provider;
  refundNo: string;
  refundId?: string;
  refundStatus?: string;
  refundAmountYuan?: number;
  successTime?: string;
  ctx?: PaymentRequestContext;
}) {
  const ctx: PaymentRequestContext = params.ctx || {
    requestId: 'unknown',
    region: 'CN',
  };

  const db = await getServiceDbClient();
  const nowIso = new Date().toISOString();

  const { data: payment } = await db
    .from('payments')
    .select('*')
    .eq('id', params.paymentId)
    .single();

  if (!payment) {
    await recordPaymentEvent(ctx, {
      event: 'REFUND_PAYMENT_NOT_FOUND',
      level: 'warn',
      paymentId: params.paymentId,
      provider: params.provider,
      metadata: { refundNo: params.refundNo },
    });
    return { applied: false, reason: 'payment_not_found' as const };
  }

  const currentStatus = typeof payment.status === 'string' ? payment.status : 'unknown';
  const currentMetadata = payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {};
  const currentRefund = (currentMetadata as any).refund && typeof (currentMetadata as any).refund === 'object'
    ? (currentMetadata as any).refund
    : {};

  if (currentRefund.applied_at) {
    await recordPaymentEvent(ctx, {
      event: 'REFUND_APPLY_SKIPPED',
      level: 'info',
      paymentId: params.paymentId,
      userId: payment.user_id,
      provider: params.provider,
      status: currentStatus,
      idempotent: true,
      metadata: { refundNo: params.refundNo, reason: 'already_applied' },
    });
    return { applied: false, reason: 'already_applied' as const };
  }

  const creditsGranted = toNumber((currentMetadata as any).granted_credits) ?? toNumber(payment.credits) ?? 0;
  const paymentAmount = toNumber(payment.amount) ?? null;
  const refundAmountYuan = typeof params.refundAmountYuan === 'number' && Number.isFinite(params.refundAmountYuan)
    ? params.refundAmountYuan
    : null;

  const refundRatio =
    refundAmountYuan !== null && paymentAmount && paymentAmount > 0
      ? Math.max(0, Math.min(1, refundAmountYuan / paymentAmount))
      : 1;

  const creditsToRevoke = Math.max(0, Math.round(creditsGranted * refundRatio));

  const profile = await ensureUserProfile(db, payment.user_id);
  const currentCredits = toNumber(profile?.credits) ?? 0;
  const revokedCredits = Math.min(currentCredits, creditsToRevoke);
  const unrecoupedCredits = Math.max(0, creditsToRevoke - revokedCredits);

  if (revokedCredits > 0) {
    await db
      .from('user_profiles')
      .update({
        credits: currentCredits - revokedCredits,
        credits_updated_at: nowIso,
        updated_at: nowIso,
      })
      .eq('user_id', payment.user_id);

    await insertTransaction(db, {
      user_id: payment.user_id,
      type: 'refund',
      amount: -revokedCredits,
      balance_before: currentCredits,
      balance_after: currentCredits - revokedCredits,
      reference_type: 'payment',
      reference_id: params.paymentId,
      description: '退款扣回积分',
      created_at: nowIso,
      updated_at: nowIso,
    });
  }

  const isMembership = (currentMetadata as any).type === 'membership' && typeof (currentMetadata as any).tier_id === 'string';
  if (isMembership && refundRatio >= 0.99) {
    await expireMembershipIfPresent(db, payment.user_id);
  }

  await db
    .from('payments')
    .update({
      status: 'refunded',
      metadata: {
        ...currentMetadata,
        refund: {
          ...currentRefund,
          status: 'refunded',
          provider: params.provider,
          refund_no: params.refundNo,
          refund_id: params.refundId || currentRefund.refund_id,
          refund_status: params.refundStatus || currentRefund.refund_status,
          refund_amount: refundAmountYuan ?? currentRefund.refund_amount,
          success_time: params.successTime || currentRefund.success_time,
          credits_to_revoke: creditsToRevoke,
          credits_revoked: revokedCredits,
          unrecouped_credits: unrecoupedCredits,
          applied_at: nowIso,
          updated_at: nowIso,
        },
      },
      updated_at: nowIso,
    })
    .eq('id', params.paymentId);

  await recordPaymentEvent(ctx, {
    event: 'REFUND_APPLIED',
    level: unrecoupedCredits > 0 ? 'warn' : 'info',
    paymentId: params.paymentId,
    userId: payment.user_id,
    provider: params.provider,
    status: 'refunded',
    metadata: {
      refundNo: params.refundNo,
      refundRatio,
      creditsGranted,
      creditsToRevoke,
      revokedCredits,
      unrecoupedCredits,
      isMembership,
    },
  });

  if (unrecoupedCredits > 0) {
    await sendAlert({
      title: 'Refund credits shortfall',
      message: 'Refund applied but credits could not be fully recouped',
      metadata: {
        paymentId: params.paymentId,
        userId: payment.user_id,
        provider: params.provider,
        refundNo: params.refundNo,
        creditsToRevoke,
        revokedCredits,
        unrecoupedCredits,
      },
    });
  }

  return {
    applied: true,
    revokedCredits,
    unrecoupedCredits,
    creditsToRevoke,
    isMembership,
  };
}
