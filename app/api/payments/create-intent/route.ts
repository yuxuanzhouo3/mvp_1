import { NextRequest, NextResponse } from 'next/server';
import { POST as createPaymentPost, GET as createPaymentGet } from '@/app/api/payments/create/route';

export const dynamic = 'force-dynamic';

function appendDeprecationHeaders(response: NextResponse) {
  response.headers.set('Deprecation', 'true');
  response.headers.set('Sunset', '2026-12-31T23:59:59Z');
  response.headers.set('Link', '</api/payments/create>; rel="successor-version"');
  response.headers.set('X-Deprecated-Endpoint', '/api/payments/create-intent');
  return response;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.json().catch(() => ({}));
  const body = rawBody && typeof rawBody === 'object' ? rawBody as Record<string, any> : {};

  const mappedBody = {
    ...body,
    method: body.method || body.paymentMethod,
  };

  const proxiedRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(mappedBody),
  });

  const response = (await createPaymentPost(proxiedRequest)) as NextResponse;
  const payload = await response.clone().json().catch(() => null);

  if (!payload || !payload.success) {
    return appendDeprecationHeaders(response);
  }

  const normalized = {
    ...payload,
    checkoutUrl: payload.checkoutUrl || payload.redirectUrl,
    sessionId: payload.checkoutSessionId,
    approvalUrl: payload.approvalUrl || payload.redirectUrl,
    orderId: payload.orderId,
    paymentMethod: payload.method,
  };

  return appendDeprecationHeaders(NextResponse.json(normalized, { status: response.status }));
}

export async function GET(_request: NextRequest) {
  const response = (await createPaymentGet()) as NextResponse;
  return appendDeprecationHeaders(response);
}
