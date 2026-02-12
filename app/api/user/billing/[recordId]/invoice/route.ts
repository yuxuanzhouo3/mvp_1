import { NextRequest, NextResponse } from 'next/server';
import { requireUser, AuthError, jsonAuthError } from '@/lib/auth/requireUser';
import { getServiceDbClientFromRequest } from '@/lib/db-client';

export const dynamic = 'force-dynamic';

function getRecordId(params: { recordId?: string }) {
  return (params?.recordId || '').trim();
}

function normalizeMethod(value: string): string {
  const method = value.toLowerCase();
  const mapping: Record<string, string> = {
    stripe: 'Stripe',
    paypal: 'PayPal',
    wechat: 'WeChat Pay',
    wechat_native: 'WeChat Pay',
    wechat_jsapi: 'WeChat Pay',
    wechat_h5: 'WeChat Pay',
    alipay: 'Alipay',
    alipay_face: 'Alipay',
    alipay_wap: 'Alipay',
  };
  return mapping[method] || value;
}

function normalizeStatus(value: string): string {
  const status = value.toLowerCase();
  const mapping: Record<string, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    refunded: 'Refunded',
    cancelled: 'Cancelled',
  };
  return mapping[status] || value;
}

function buildInvoiceHtml(options: {
  invoiceNumber: string;
  paymentId: string;
  createdAt: string;
  currency: string;
  amount: number;
  method: string;
  status: string;
  description: string;
  userId: string;
}) {
  const {
    invoiceNumber,
    paymentId,
    createdAt,
    currency,
    amount,
    method,
    status,
    description,
    userId,
  } = options;

  const safe = (value: string) =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice ${safe(invoiceNumber)}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
      h1 { margin: 0 0 8px; }
      .muted { color: #666; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
      td:first-child { width: 220px; color: #374151; }
    </style>
  </head>
  <body>
    <h1>Payment Invoice</h1>
    <p class="muted">Invoice No: ${safe(invoiceNumber)}</p>
    <table>
      <tr><td>Payment ID</td><td>${safe(paymentId)}</td></tr>
      <tr><td>User ID</td><td>${safe(userId)}</td></tr>
      <tr><td>Created At</td><td>${safe(createdAt)}</td></tr>
      <tr><td>Amount</td><td>${safe(currency)} ${amount.toFixed(2)}</td></tr>
      <tr><td>Payment Method</td><td>${safe(method)}</td></tr>
      <tr><td>Status</td><td>${safe(status)}</td></tr>
      <tr><td>Description</td><td>${safe(description)}</td></tr>
    </table>
  </body>
</html>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { recordId: string } }
) {
  try {
    const authUser = await requireUser(request);
    const recordId = getRecordId(params);

    if (!recordId) {
      return NextResponse.json({ error: 'Invalid record ID' }, { status: 400 });
    }

    const db = await getServiceDbClientFromRequest(request);
    const { data: payment, error } = await db
      .from('payments')
      .select('*')
      .eq('id', recordId)
      .eq('user_id', authUser.userId)
      .single();

    if (error || !payment) {
      return NextResponse.json({ error: 'Billing record not found' }, { status: 404 });
    }

    const metadata = payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {};

    const invoiceUrl = metadata?.invoice_url || payment.invoice_url;
    if (invoiceUrl && typeof invoiceUrl === 'string') {
      return NextResponse.json({
        success: true,
        type: 'url',
        url: invoiceUrl,
      });
    }

    const createdAt = payment.created_at || new Date().toISOString();
    const amount = Number(payment.amount || 0);
    const currency = String(payment.currency || 'USD');
    const method = normalizeMethod(String(payment.payment_method || payment.method || 'unknown'));
    const status = normalizeStatus(String(payment.status || 'unknown'));
    const description = String(metadata?.description || payment.description || `Payment ${payment.id}`);
    const invoiceNumber = String(metadata?.invoice_number || `INV-${payment.id}`);

    const html = buildInvoiceHtml({
      invoiceNumber,
      paymentId: payment.id,
      createdAt,
      currency,
      amount,
      method,
      status,
      description,
      userId: authUser.userId,
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="invoice-${payment.id}.html"`,
        'Cache-Control': 'no-store',
        'X-Invoice-Fallback': 'html',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonAuthError(error);
    }

    console.error('[Billing Invoice] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
