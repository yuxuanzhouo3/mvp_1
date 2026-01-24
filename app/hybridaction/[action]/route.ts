import { NextRequest } from 'next/server';

function isValidJsonpCallbackName(callbackName: string): boolean {
  if (callbackName.length < 1 || callbackName.length > 256) return false;
  return /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(callbackName);
}

function safeJsonParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { action: string } }
) {
  const { action } = params;
  const url = new URL(request.url);
  const callbackName =
    url.searchParams.get('__callback__') ||
    url.searchParams.get('callback') ||
    url.searchParams.get('cb');
  const dataParam = url.searchParams.get('data');
  const decodedData = dataParam ? decodeURIComponent(dataParam) : null;

  const payload = {
    success: true,
    code: 0,
    message: 'ok',
    action,
    data: safeJsonParse(decodedData),
  };

  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
  };

  if (callbackName) {
    if (!isValidJsonpCallbackName(callbackName)) {
      return new Response('Invalid callback name', {
        status: 400,
        headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const body = `${callbackName}(${JSON.stringify(payload)});`;
    return new Response(body, {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/javascript; charset=utf-8' },
    });
  }

  return Response.json(payload, { status: 200, headers });
}
