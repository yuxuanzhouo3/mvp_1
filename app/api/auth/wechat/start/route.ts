import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeploymentFromRequest } from '@/lib/config/deployment.config';
import { getExternalRequestOrigin } from '@/lib/http/request-origin';
import { getWeChatOAuthCredentials } from '@/lib/services/auth/wechat-oauth';

function normalizeRedirectPath(input: string | null): string {
  if (!input) return '/dashboard';
  if (!input.startsWith('/')) return '/dashboard';
  if (input.startsWith('//')) return '/dashboard';
  return input;
}

function encodeState(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function isSecureCookieRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isSecureRequest = forwardedProto
    ? forwardedProto.split(',')[0].trim() === 'https'
    : request.url.startsWith('https://');
  const host = request.headers.get('host') || '';
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  return isSecureRequest || !isLocalhost;
}

export async function GET(request: NextRequest) {
  if (!isChinaDeploymentFromRequest(request)) {
    return NextResponse.json(
      { error: 'WeChat OAuth only available in CN deployment' },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const redirectPath = normalizeRedirectPath(searchParams.get('redirect'));

  const { appId } = getWeChatOAuthCredentials('open');

  if (!appId) {
    const errorUrl = new URL('/auth/login', request.url);
    errorUrl.searchParams.set('error', 'wechat_config_missing');
    errorUrl.searchParams.set('provider', 'wechat');
    return NextResponse.redirect(errorUrl);
  }

  const nonce = crypto.randomUUID();
  const state = encodeState({ n: nonce, r: redirectPath, t: 'open' });

  const origin = getExternalRequestOrigin(request) || new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/wechat/callback`;

  const params = new URLSearchParams({
    appid: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'snsapi_login',
    state,
  });

  const wechatUrl = `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
  const response = NextResponse.redirect(wechatUrl);

  const isSecureCookie = isSecureCookieRequest(request);
  response.cookies.set('wechat_oauth_state', nonce, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: 'lax',
    maxAge: 10 * 60,
    path: '/',
  });

  return response;
}
