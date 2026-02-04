import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeploymentFromRequest } from '@/lib/config/deployment.config';
import {
  createUserSession,
  findOrCreateWeChatUser,
  findUserByWeChat,
} from '@/lib/services/auth/wechat-db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WECHAT_CODE2SESSION_URL = 'https://api.weixin.qq.com/sns/jscode2session';

interface Code2SessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

export async function POST(request: NextRequest) {
  if (!isChinaDeploymentFromRequest(request)) {
    return NextResponse.json({ success: false, error: 'This endpoint is only available in CN environment' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { code?: string };
    const code = typeof body?.code === 'string' ? body.code : '';
    if (!code) {
      return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 });
    }

    const appId = process.env.WX_MINI_APPID || process.env.WECHAT_MINIPROGRAM_APP_ID;
    const appSecret = process.env.WX_MINI_SECRET || process.env.WECHAT_MINIPROGRAM_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.json(
        { success: false, error: 'Missing WX_MINI_APPID/WX_MINI_SECRET configuration' },
        { status: 500 }
      );
    }

    const url = new URL(WECHAT_CODE2SESSION_URL);
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', appSecret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    const wxRes = await fetch(url.toString(), { cache: 'no-store' });
    const wxData = (await wxRes.json()) as Code2SessionResponse;

    if (wxData.errcode) {
      return NextResponse.json(
        { success: false, error: wxData.errmsg || 'jscode2session failed', errcode: wxData.errcode },
        { status: 401 }
      );
    }

    const openid = typeof wxData.openid === 'string' ? wxData.openid : '';
    const unionid = typeof wxData.unionid === 'string' ? wxData.unionid : undefined;

    if (!openid) {
      return NextResponse.json({ success: false, error: 'No openid returned' }, { status: 401 });
    }

    const existing = await findUserByWeChat(openid, unionid);
    const exists = !!existing;

    let userId = existing?.id;
    let userName = existing?.display_name || existing?.wechat_nickname || '';
    let userAvatar = existing?.avatar_url || existing?.wechat_avatar || '';

    if (!userId) {
      const created = await findOrCreateWeChatUser({ openid, unionid, userInfo: null, loginType: 'miniprogram' });
      userId = created.id;
      userName = created.displayName || userName;
      userAvatar = created.avatarUrl || userAvatar;
    }

    const token = await createUserSession(userId);
    const expiresIn = 7 * 24 * 60 * 60;
    const hasProfile = Boolean(userName && userAvatar);

    const response = NextResponse.json({
      success: true,
      exists,
      hasProfile,
      token,
      openid,
      expiresIn,
      userName,
      userAvatar,
    });
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}

