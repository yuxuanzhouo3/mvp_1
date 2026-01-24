/**
 * 微信 OAuth 回调 API
 * WeChat OAuth Callback API
 * 
 * 处理微信登录的授权回调
 * 支持：公众号网页授权、开放平台扫码登录
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  findOrCreateWeChatUser,
  createUserSession,
} from '@/lib/services/auth/wechat-db';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { getExternalRequestOrigin } from '@/lib/http/request-origin';

// 微信 Access Token 接口
const WECHAT_ACCESS_TOKEN_URL = 'https://api.weixin.qq.com/sns/oauth2/access_token';
const WECHAT_USER_INFO_URL = 'https://api.weixin.qq.com/sns/userinfo';

interface WeChatTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  openid?: string;
  scope?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface WeChatUserInfo {
  openid: string;
  nickname?: string;
  sex?: number;
  province?: string;
  city?: string;
  country?: string;
  headimgurl?: string;
  privilege?: string[];
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

/**
 * GET 请求 - 处理微信授权重定向回调
 */
export async function GET(request: NextRequest) {
  if (!isChinaDeployment()) {
    return NextResponse.json(
      { error: 'WeChat OAuth only available in CN deployment' },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // 检查是否有错误
  if (error) {
    console.error('[WeChat Callback] OAuth error:', error);
    const errorUrl = new URL('/auth/login', request.url);
    errorUrl.searchParams.set('error', error);
    errorUrl.searchParams.set('provider', 'wechat');
    return NextResponse.redirect(errorUrl);
  }

  // 检查是否有授权码
  if (!code) {
    console.error('[WeChat Callback] Missing authorization code');
    const errorUrl = new URL('/auth/login', request.url);
    errorUrl.searchParams.set('error', 'missing_code');
    errorUrl.searchParams.set('provider', 'wechat');
    return NextResponse.redirect(errorUrl);
  }

  try {
    const parsedState = parseState(state);
    const loginType = parseLoginType(state, parsedState);
    console.log(`[WeChat Callback] Processing ${loginType} login`);

    if (parsedState?.nonce) {
      const cookieNonce = request.cookies.get('wechat_oauth_state')?.value;
      const isSecureCookie = isSecureCookieRequest(request);
      if (!cookieNonce || cookieNonce !== parsedState.nonce) {
        const errorUrl = new URL('/auth/login', request.url);
        errorUrl.searchParams.set('error', 'invalid_state');
        errorUrl.searchParams.set('provider', 'wechat');
        const res = NextResponse.redirect(errorUrl);
        res.cookies.set('wechat_oauth_state', '', {
          httpOnly: true,
          secure: isSecureCookie,
          sameSite: 'lax',
          maxAge: 0,
          path: '/',
        });
        return res;
      }
    }

    // 获取对应的 AppID 和 Secret
    const { appId, appSecret } = getWeChatConfig(loginType);

    if (!appId || !appSecret) {
      throw new Error('WeChat configuration missing');
    }

    // 1. 使用 code 换取 access_token
    const tokenData = await getWeChatAccessToken(appId, appSecret, code);
    
    if (tokenData.errcode) {
      console.error('[WeChat Callback] Token error:', tokenData);
      throw new Error(tokenData.errmsg || '获取微信授权失败');
    }

    const { access_token, openid, unionid } = tokenData;

    // 2. 获取用户信息
    let userInfo: WeChatUserInfo | null = null;
    if (access_token && openid) {
      userInfo = await getWeChatUserInfo(access_token, openid);
    }

    // 3. 查找或创建用户
    const user = await findOrCreateWeChatUser({
      openid: openid!,
      unionid,
      userInfo,
      loginType,
    });

    // 4. 创建会话
    const session = await createUserSession(user.id);

    console.log(`[WeChat Callback] User authenticated: ${user.id}`);

    // 5. 解析重定向地址
    const redirectPath = normalizeRedirectPath(parsedState?.redirectPath || null);

    // 设置会话 cookie 并重定向
    const origin = getExternalRequestOrigin(request) || new URL(request.url).origin;
    const successUrl = new URL(redirectPath, origin);
    const response = NextResponse.redirect(successUrl);
    
    // 设置认证 cookie
    const host = request.headers.get('host') || '';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const isSecureCookie = isSecureCookieRequest(request) || !isLocalhost;

    response.cookies.set('cn_session', session, {
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });

    if (!isLocalhost) {
      response.cookies.set('cn_session_cross', session, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
    }

    if (parsedState?.nonce) {
      response.cookies.set('wechat_oauth_state', '', {
        httpOnly: true,
        secure: isSecureCookie,
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
    }

    return response;
  } catch (error: any) {
    console.error('[WeChat Callback] Error:', error);
    const errorUrl = new URL('/auth/login', request.url);
    errorUrl.searchParams.set('error', 'wechat_login_failed');
    errorUrl.searchParams.set('message', encodeURIComponent(error.message));
    const res = NextResponse.redirect(errorUrl);
    const isSecureCookie = isSecureCookieRequest(request);
    res.cookies.set('wechat_oauth_state', '', {
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return res;
  }
}

/**
 * POST 请求 - 用于客户端 AJAX 调用
 */
export async function POST(request: NextRequest) {
  if (!isChinaDeployment()) {
    return NextResponse.json(
      { error: 'WeChat OAuth only available in CN deployment' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { code, loginType = 'open' } = body as { code: string; loginType?: string };

    if (!code) {
      return NextResponse.json(
        { error: '缺少授权码', errorCode: 'MISSING_CODE' },
        { status: 400 }
      );
    }

    // 获取配置
    const { appId, appSecret } = getWeChatConfig(loginType);

    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: '微信配置错误', errorCode: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    // 换取 token
    const tokenData = await getWeChatAccessToken(appId, appSecret, code);

    if (tokenData.errcode) {
      return NextResponse.json(
        { error: tokenData.errmsg || '微信授权失败', errorCode: `WECHAT_${tokenData.errcode}` },
        { status: 401 }
      );
    }

    // 获取用户信息
    let userInfo: WeChatUserInfo | null = null;
    if (tokenData.access_token && tokenData.openid) {
      userInfo = await getWeChatUserInfo(tokenData.access_token, tokenData.openid);
    }

    // 查找或创建用户
    const user = await findOrCreateWeChatUser({
      openid: tokenData.openid!,
      unionid: tokenData.unionid,
      userInfo,
      loginType,
    });

    // 创建会话
    const session = await createUserSession(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      session,
    });
  } catch (error: any) {
    console.error('[WeChat Callback POST] Error:', error);
    return NextResponse.json(
      { error: error.message || '登录失败', errorCode: 'LOGIN_ERROR' },
      { status: 500 }
    );
  }
}

// ============ 辅助函数 ============

function parseState(state: string | null): { nonce?: string; redirectPath?: string; loginType?: string } | null {
  if (!state) return null;
  if (state.startsWith('wechat_')) return null;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8')) as any;
    return {
      nonce: typeof decoded?.n === 'string' ? decoded.n : undefined,
      redirectPath: typeof decoded?.r === 'string' ? decoded.r : undefined,
      loginType: typeof decoded?.t === 'string' ? decoded.t : undefined,
    };
  } catch {
    return null;
  }
}

function parseLoginType(state: string | null, parsedState?: { loginType?: string } | null): string {
  const fromState = parsedState?.loginType;
  if (fromState === 'miniprogram' || fromState === 'open') return fromState;
  if (!state) return 'open';
  if (state.startsWith('wechat_open_')) return 'open';
  if (state.startsWith('wechat_mini_')) return 'miniprogram';
  return 'open';
}

function normalizeRedirectPath(input: string | null): string {
  if (!input) return '/dashboard';
  if (!input.startsWith('/')) return '/dashboard';
  if (input.startsWith('//')) return '/dashboard';
  return input;
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

/**
 * 获取微信配置
 */
function getWeChatConfig(loginType: string): { appId: string; appSecret: string } {
  switch (loginType) {
    case 'miniprogram':
      return {
        appId: process.env.WECHAT_MINIPROGRAM_APP_ID || '',
        appSecret: process.env.WECHAT_MINIPROGRAM_APP_SECRET || '',
      };
    case 'open':
    default:
      return {
        appId: process.env.WECHAT_APP_ID || '',
        appSecret: process.env.WECHAT_APP_SECRET || '',
      };
  }
}

/**
 * 获取微信 Access Token
 */
async function getWeChatAccessToken(
  appId: string, 
  appSecret: string, 
  code: string
): Promise<WeChatTokenResponse> {
  const url = new URL(WECHAT_ACCESS_TOKEN_URL);
  url.searchParams.set('appid', appId);
  url.searchParams.set('secret', appSecret);
  url.searchParams.set('code', code);
  url.searchParams.set('grant_type', 'authorization_code');

  const response = await fetch(url.toString());
  return response.json();
}

/**
 * 获取微信用户信息
 */
async function getWeChatUserInfo(
  accessToken: string, 
  openid: string
): Promise<WeChatUserInfo | null> {
  try {
    const url = new URL(WECHAT_USER_INFO_URL);
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('openid', openid);
    url.searchParams.set('lang', 'zh_CN');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.errcode) {
      console.warn('[WeChat] Get user info failed:', data);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[WeChat] Get user info error:', error);
    return null;
  }
}

