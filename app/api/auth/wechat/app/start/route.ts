import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeploymentFromRequest } from '@/lib/config/deployment.config';
import { createWeChatSignedState, getWeChatOAuthCredentials } from '@/lib/services/auth/wechat-oauth';

function normalizeRedirectPath(input: string | null): string {
  if (!input) return '/dashboard';
  if (!input.startsWith('/')) return '/dashboard';
  if (input.startsWith('//')) return '/dashboard';
  return input;
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

  const { appId } = getWeChatOAuthCredentials('mobile_app');
  if (!appId) {
    return NextResponse.json(
      { error: 'wechat_config_missing', provider: 'wechat' },
      { status: 500 }
    );
  }

  const nonce = crypto.randomUUID();
  const state = createWeChatSignedState({
    nonce,
    redirectPath,
    loginType: 'mobile_app',
  });

  return NextResponse.json({
    appId,
    state,
    scope: 'snsapi_userinfo',
  });
}
