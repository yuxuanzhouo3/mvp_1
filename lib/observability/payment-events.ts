import crypto from 'crypto';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { logger } from '@/lib/logger';

export type PaymentEventLevel = 'info' | 'warn' | 'error';

export interface PaymentRequestContext {
  requestId: string;
  route?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  region: 'CN' | 'INTL';
}

export interface PaymentEvent {
  event: string;
  level?: PaymentEventLevel;
  paymentId: string;
  userId?: string;
  provider?: 'wechat' | 'alipay' | 'stripe' | 'paypal' | 'unknown';
  status?: string;
  providerOrderId?: string;
  expectedAmountCents?: number;
  receivedAmountCents?: number;
  idempotent?: boolean;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '{"error":"json_stringify_failed"}';
  }
}

export function buildPaymentRequestContext(request: Request): PaymentRequestContext {
  const headers = request.headers;
  const requestId =
    headers.get('x-request-id') ||
    headers.get('x-correlation-id') ||
    headers.get('cf-ray') ||
    crypto.randomUUID();

  const userAgent = headers.get('user-agent') || undefined;
  const ip =
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    undefined;

  return {
    requestId,
    method: request.method,
    route: new URL(request.url).pathname,
    ip,
    userAgent,
    region: isChinaDeployment() ? 'CN' : 'INTL',
  };
}

function logPaymentEventJson(ctx: PaymentRequestContext, event: PaymentEvent) {
  const payload = {
    ts: new Date().toISOString(),
    category: 'Payment',
    ...ctx,
    ...event,
  };

  const line = safeJsonStringify(payload);
  if (event.level === 'error') {
    console.error(line);
  } else if (event.level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export async function recordPaymentEvent(ctx: PaymentRequestContext, event: PaymentEvent) {
  const level: PaymentEventLevel = event.level || 'info';
  logPaymentEventJson(ctx, { ...event, level });

  if (!isChinaDeployment()) {
    logger.info('Payment', event.event, {
      requestId: ctx.requestId,
      paymentId: event.paymentId,
      provider: event.provider,
      status: event.status,
    });
    return;
  }

  try {
    const db = await getServiceDbClient();
    const nowIso = new Date().toISOString();
    const id = `${event.paymentId}_${event.event}_${Date.now()}`;
    await db.from('payment_events').insert({
      id,
      payment_id: event.paymentId,
      user_id: event.userId,
      provider: event.provider,
      event: event.event,
      level,
      request_id: ctx.requestId,
      status: event.status,
      provider_order_id: event.providerOrderId,
      expected_amount_cents: event.expectedAmountCents,
      received_amount_cents: event.receivedAmountCents,
      idempotent: event.idempotent,
      duration_ms: event.durationMs,
      error_code: event.errorCode,
      error_message: event.errorMessage,
      metadata: event.metadata || {},
      created_at: nowIso,
    });
  } catch (err) {
    logger.warn('Payment', 'recordPaymentEvent_failed', {
      requestId: ctx.requestId,
      paymentId: event.paymentId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function listPaymentEvents(params: { paymentId: string; limit?: number }) {
  try {
    const db = await getServiceDbClient();
    const limit = params.limit || 50;

    const { data } = await db
      .from('payment_events')
      .select('*')
      .eq('payment_id', params.paymentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  } catch {
    return [];
  }
}
