import { getServiceDbClient } from '@/lib/db-client';
import crypto from 'crypto';
import type { PaymentRequestContext } from '@/lib/observability/payment-events';
import { recordPaymentEvent } from '@/lib/observability/payment-events';

type Provider = 'wechat' | 'alipay';

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function addOneMonthFrom(base: Date): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + 1);
  return d;
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

async function hasFulfilledByTransaction(db: any, paymentId: string): Promise<boolean> {
  try {
    const { data } = await db
      .from('transactions')
      .select('id')
      .eq('reference_type', 'payment')
      .eq('reference_id', paymentId)
      .single();
    return !!data;
  } catch {
    return false;
  }
}

async function updateUserCredits(
  db: any,
  userId: string,
  creditsToAdd: number
): Promise<{ balanceBefore: number; balanceAfter: number }> {
  const profile = await ensureUserProfile(db, userId);
  const currentCredits = toNumber(profile?.credits) ?? 0;
  const newCredits = currentCredits + creditsToAdd;
  const nowIso = new Date().toISOString();

  await db
    .from('user_profiles')
    .update({ credits: newCredits, credits_updated_at: nowIso, updated_at: nowIso })
    .eq('user_id', userId);

  return { balanceBefore: currentCredits, balanceAfter: newCredits };
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

async function upsertMembership(db: any, userId: string, tierId: string, provider: Provider, providerOrderId?: string) {
  const now = new Date();
  const { data: existing } = await db
    .from('user_memberships')
    .select('*')
    .eq('user_id', userId)
    .single();

  const base = existing?.expires_at ? new Date(existing.expires_at) : now;
  const startsFrom = base > now ? base : now;
  const expiresAt = addOneMonthFrom(startsFrom);
  const nowIso = now.toISOString();

  const record: any = {
    user_id: userId,
    tier: tierId,
    started_at: nowIso,
    expires_at: expiresAt.toISOString(),
    auto_renew: false,
    updated_at: nowIso,
  };

  if (!existing) {
    record.created_at = nowIso;
  }

  if (provider === 'wechat' && providerOrderId) {
    record.wechat_subscription_id = providerOrderId;
  }

  await db.from('user_memberships').upsert(record, { onConflict: 'user_id' });

  return { expiresAt: expiresAt.toISOString() };
}

async function fulfillCompletedPayment(params: {
  db: any;
  payment: any;
  paymentId: string;
  provider: Provider;
  providerOrderId?: string;
  mergedMetadata: Record<string, any>;
  ctx: PaymentRequestContext;
}) {
  const { db, payment, paymentId, provider, providerOrderId, mergedMetadata, ctx } = params;

  if (mergedMetadata.fulfilled_at || mergedMetadata.fulfilled === true) {
    await recordPaymentEvent(ctx, {
      event: 'FULFILLMENT_SKIPPED',
      level: 'info',
      paymentId,
      userId: payment.user_id,
      provider,
      status: payment.status,
      providerOrderId,
      idempotent: true,
      metadata: { reason: 'metadata_fulfilled' },
    });
    return { fulfilled: false, alreadyFulfilled: true };
  }

  if (await hasFulfilledByTransaction(db, paymentId)) {
    await recordPaymentEvent(ctx, {
      event: 'FULFILLMENT_SKIPPED',
      level: 'info',
      paymentId,
      userId: payment.user_id,
      provider,
      status: payment.status,
      providerOrderId,
      idempotent: true,
      metadata: { reason: 'transaction_exists' },
    });
    return { fulfilled: false, alreadyFulfilled: true };
  }

  const userId = payment.user_id;
  const isMembership = mergedMetadata.type === 'membership' && typeof mergedMetadata.tier_id === 'string';

  let creditsToGrant = toNumber(payment.credits) ?? 0;
  let transactionType = 'credit_purchase';
  let description = '购买积分包';
  let membershipExpiresAt: string | undefined;

  if (isMembership) {
    const tierId = mergedMetadata.tier_id;
    const { data: tier } = await db
      .from('membership_tiers')
      .select('*')
      .eq('id', tierId)
      .single();

    creditsToGrant = toNumber(tier?.monthly_credits) ?? creditsToGrant;
    transactionType = 'membership_grant';
    description = `会员订阅(${tierId})赠送积分`;
    const membership = await upsertMembership(db, userId, tierId, provider, providerOrderId);
    membershipExpiresAt = membership.expiresAt;
    await recordPaymentEvent(ctx, {
      event: 'MEMBERSHIP_UPSERTED',
      level: 'info',
      paymentId,
      userId,
      provider,
      status: payment.status,
      providerOrderId,
      metadata: { tierId, expiresAt: membershipExpiresAt },
    });
  }

  if (creditsToGrant > 0) {
    const { balanceBefore, balanceAfter } = await updateUserCredits(db, userId, creditsToGrant);
    const nowIso = new Date().toISOString();
    await insertTransaction(db, {
      user_id: userId,
      type: transactionType,
      amount: creditsToGrant,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reference_type: 'payment',
      reference_id: paymentId,
      description,
      created_at: nowIso,
      updated_at: nowIso,
    });
    await recordPaymentEvent(ctx, {
      event: 'CREDITS_GRANTED',
      level: 'info',
      paymentId,
      userId,
      provider,
      status: payment.status,
      providerOrderId,
      metadata: { creditsGranted: creditsToGrant, balanceBefore, balanceAfter, transactionType },
    });
  }

  const nowIso = new Date().toISOString();
  await db
    .from('payments')
    .update({
      metadata: {
        ...mergedMetadata,
        fulfilled: true,
        fulfilled_at: nowIso,
        granted_credits: creditsToGrant,
        membership_expires_at: membershipExpiresAt,
      },
      updated_at: nowIso,
    })
    .eq('id', paymentId);

  return { fulfilled: true, alreadyFulfilled: false, creditsGranted: creditsToGrant, membershipExpiresAt };
}

export async function finalizeCnPayment(params: {
  paymentId: string;
  newStatus: 'completed' | 'cancelled' | 'pending';
  provider: Provider;
  providerOrderId?: string;
  providerAmountCents?: number;
  providerAmountYuan?: string | number;
  paidAt?: string;
  metadata?: Record<string, any>;
  ctx?: PaymentRequestContext;
}) {
  const {
    paymentId,
    newStatus,
    provider,
    providerOrderId,
    providerAmountCents,
    providerAmountYuan,
    paidAt,
    metadata,
    ctx,
  } = params;

  const requestContext: PaymentRequestContext = ctx || {
    requestId: crypto.randomUUID(),
    region: 'CN',
  };

  const start = Date.now();
  await recordPaymentEvent(requestContext, {
    event: 'FINALIZE_START',
    level: 'info',
    paymentId,
    provider,
    status: newStatus,
    providerOrderId,
  });

  const db = await getServiceDbClient();
  const { data: payment, error: paymentError } = await db
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (paymentError || !payment) {
    await recordPaymentEvent(requestContext, {
      event: 'FINALIZE_FAILED',
      level: 'warn',
      paymentId,
      provider,
      status: newStatus,
      providerOrderId,
      errorCode: 'PAYMENT_NOT_FOUND',
    });
    return { ok: false as const, error: 'PAYMENT_NOT_FOUND' as const };
  }

  if (newStatus === 'completed' && payment.status === 'completed') {
    await recordPaymentEvent(requestContext, {
      event: 'FINALIZE_IDEMPOTENT',
      level: 'info',
      paymentId,
      userId: payment.user_id,
      provider,
      status: 'completed',
      providerOrderId,
      idempotent: true,
      durationMs: Date.now() - start,
    });
    return { ok: true as const, alreadyCompleted: true as const };
  }

  if (newStatus === 'completed') {
    const expectedAmount = toNumber(payment.amount);
    if (expectedAmount !== null) {
      const expectedCents = Math.round(expectedAmount * 100);
      if (typeof providerAmountCents === 'number' && Number.isFinite(providerAmountCents)) {
        if (providerAmountCents !== expectedCents) {
          await recordPaymentEvent(requestContext, {
            event: 'AMOUNT_CHECK_FAILED',
            level: 'warn',
            paymentId,
            userId: payment.user_id,
            provider,
            status: newStatus,
            providerOrderId,
            expectedAmountCents: expectedCents,
            receivedAmountCents: providerAmountCents,
            errorCode: 'AMOUNT_MISMATCH',
          });
          return { ok: false as const, error: 'AMOUNT_MISMATCH' as const };
        }
      } else if (providerAmountYuan !== undefined) {
        const receivedYuan = toNumber(providerAmountYuan);
        if (receivedYuan === null) {
          await recordPaymentEvent(requestContext, {
            event: 'AMOUNT_CHECK_FAILED',
            level: 'warn',
            paymentId,
            userId: payment.user_id,
            provider,
            status: newStatus,
            providerOrderId,
            expectedAmountCents: expectedCents,
            errorCode: 'AMOUNT_INVALID',
          });
          return { ok: false as const, error: 'AMOUNT_INVALID' as const };
        }
        const receivedCents = Math.round(receivedYuan * 100);
        if (receivedCents !== expectedCents) {
          await recordPaymentEvent(requestContext, {
            event: 'AMOUNT_CHECK_FAILED',
            level: 'warn',
            paymentId,
            userId: payment.user_id,
            provider,
            status: newStatus,
            providerOrderId,
            expectedAmountCents: expectedCents,
            receivedAmountCents: receivedCents,
            errorCode: 'AMOUNT_MISMATCH',
          });
          return { ok: false as const, error: 'AMOUNT_MISMATCH' as const };
        }
      }
      await recordPaymentEvent(requestContext, {
        event: 'AMOUNT_CHECK_PASSED',
        level: 'info',
        paymentId,
        userId: payment.user_id,
        provider,
        status: newStatus,
        providerOrderId,
        expectedAmountCents: expectedCents,
        receivedAmountCents:
          typeof providerAmountCents === 'number' && Number.isFinite(providerAmountCents)
            ? providerAmountCents
            : providerAmountYuan !== undefined
              ? Math.round((toNumber(providerAmountYuan) || 0) * 100)
              : undefined,
      });
    }
  }

  const nowIso = new Date().toISOString();
  const mergedMetadata = { ...(payment.metadata || {}), ...(metadata || {}) };
  const updateData: any = {
    status: newStatus,
    updated_at: nowIso,
    metadata: mergedMetadata,
  };

  if (providerOrderId) {
    updateData.provider_order_id = providerOrderId;
  }

  if (newStatus === 'completed') {
    updateData.completed_at = nowIso;
    if (paidAt) {
      mergedMetadata.paid_at = paidAt;
    }
  }

  const { error: updateError } = await db
    .from('payments')
    .update(updateData)
    .eq('id', paymentId);

  if (updateError) {
    await recordPaymentEvent(requestContext, {
      event: 'FINALIZE_FAILED',
      level: 'error',
      paymentId,
      userId: payment.user_id,
      provider,
      status: newStatus,
      providerOrderId,
      errorCode: 'PAYMENT_UPDATE_FAILED',
      errorMessage: updateError.message,
      durationMs: Date.now() - start,
    });
    return { ok: false as const, error: 'PAYMENT_UPDATE_FAILED' as const };
  }

  await recordPaymentEvent(requestContext, {
    event: 'STATUS_UPDATED',
    level: 'info',
    paymentId,
    userId: payment.user_id,
    provider,
    status: newStatus,
    providerOrderId,
    durationMs: Date.now() - start,
  });

  if (newStatus !== 'completed') {
    return { ok: true as const };
  }

  const fulfillment = await fulfillCompletedPayment({
    db,
    payment: { ...payment, status: newStatus },
    paymentId,
    provider,
    providerOrderId,
    mergedMetadata,
    ctx: requestContext,
  });

  await recordPaymentEvent(requestContext, {
    event: 'FINALIZE_COMPLETED',
    level: 'info',
    paymentId,
    userId: payment.user_id,
    provider,
    status: newStatus,
    providerOrderId,
    idempotent: fulfillment.alreadyFulfilled,
    durationMs: Date.now() - start,
    metadata: {
      fulfilled: fulfillment.fulfilled,
      creditsGranted: (fulfillment as any).creditsGranted,
      membershipExpiresAt: (fulfillment as any).membershipExpiresAt,
    },
  });

  return { ok: true as const, fulfillment };
}
