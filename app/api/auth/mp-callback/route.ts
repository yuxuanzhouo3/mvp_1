import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeploymentFromRequest } from '@/lib/config/deployment.config';
import { getServiceDbClient } from '@/lib/db-client';
import { verifySessionToken } from '@/lib/services/auth/wechat-db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isSecureCookieRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isSecureRequest = forwardedProto
    ? forwardedProto.split(',')[0].trim() === 'https'
    : request.url.startsWith('https://');
  const host = request.headers.get('host') || '';
  const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  return isSecureRequest || !isLocalhost;
}

export async function POST(request: NextRequest) {
  if (!isChinaDeploymentFromRequest(request)) {
    return NextResponse.json({ success: false, error: 'This endpoint is only available in CN environment' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      token?: string;
      openid?: string;
      nickName?: string;
      avatarUrl?: string;
    };

    const token = typeof body?.token === 'string' ? body.token : '';
    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 });
    }

    const verified = await verifySessionToken(token);
    if (!verified?.userId) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const openid = typeof body?.openid === 'string' ? body.openid : '';
    const nickName = typeof body?.nickName === 'string' ? body.nickName : '';
    const avatarUrl = typeof body?.avatarUrl === 'string' ? body.avatarUrl : '';

    const db = await getServiceDbClient();
    const { data: existingUser } = await db
      .from('users')
      .select('id,wechat_openid,display_name,avatar_url')
      .eq('id', verified.userId)
      .single();

    if (!existingUser?.id) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (openid && existingUser.wechat_openid && existingUser.wechat_openid !== openid) {
      return NextResponse.json({ success: false, error: 'openid mismatch' }, { status: 400 });
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (openid && !existingUser.wechat_openid) updateData.wechat_openid = openid;
    if (nickName) updateData.wechat_nickname = nickName;
    if (avatarUrl) updateData.wechat_avatar = avatarUrl;

    if (nickName && (!existingUser.display_name || String(existingUser.display_name).startsWith('微信用户'))) {
      updateData.display_name = nickName;
    }
    if (avatarUrl && !existingUser.avatar_url) {
      updateData.avatar_url = avatarUrl;
    }

    if (Object.keys(updateData).length > 1) {
      await db.from('users').update(updateData).eq('id', verified.userId);
    }

    const host = request.headers.get('host') || '';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const isSecureCookie = isSecureCookieRequest(request) || !isLocalhost;

    const response = NextResponse.json({
      success: true,
      user: {
        id: verified.userId,
        displayName: nickName || existingUser.display_name || '微信用户',
        avatarUrl: avatarUrl || existingUser.avatar_url || '',
      },
    });
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Accel-Expires', '0');

    response.cookies.set('cn_session', token, {
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    if (!isLocalhost) {
      response.cookies.set('cn_session_cross', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}

