import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { createUserSession } from '@/lib/auth/session';
import { getRequestIp, rateLimit } from '@/lib/security/rateLimit';
import { findCnUserByEmail, verifyCnEmailVerificationCode } from '@/lib/auth/cn-email-code';

export async function POST(request: NextRequest) {
  if (!isChinaDeployment()) {
    return NextResponse.json(
      { error: 'This endpoint is only available in CN environment' },
      { status: 403 }
    );
  }

  try {
    const ip = getRequestIp(request) || 'unknown';
    const rlIp = await rateLimit({ key: `rl:cn_login:ip:${ip}`, limit: 10, windowMs: 60_000 });
    if (!rlIp.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rlIp.resetAtMs - Date.now()) / 1000));
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const verificationCode = String(body?.verificationCode || '').trim();

    if (!email || !verificationCode) {
      return NextResponse.json(
        { error: '邮箱和验证码为必填项' },
        { status: 400 }
      );
    }

    const rlEmail = await rateLimit({ key: `rl:cn_login:email:${email}`, limit: 5, windowMs: 60_000 });
    if (!rlEmail.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rlEmail.resetAtMs - Date.now()) / 1000));
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    const verifyCodeResult = await verifyCnEmailVerificationCode({
      email,
      code: verificationCode,
      purpose: 'login',
    });
    if (!verifyCodeResult.ok) {
      return NextResponse.json(
        { error: verifyCodeResult.error || '验证码错误' },
        { status: 401 }
      );
    }

    let cloudbase: any;
    try {
      const cloudbaseModule: any = await import('@cloudbase/node-sdk');
      cloudbase = cloudbaseModule?.default || cloudbaseModule;
    } catch (importError) {
      console.error('[CN Login] Cloudbase SDK import error:', importError);
      return NextResponse.json(
        { error: 'Cloudbase SDK not installed. Run: npm install @cloudbase/node-sdk' },
        { status: 500 }
      );
    }

    const envId = process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '';
    if (!envId) {
      return NextResponse.json(
        { error: '服务配置错误：Cloudbase ENV_ID 未设置' },
        { status: 500 }
      );
    }

    const app = cloudbase.init({
      env: envId,
      secretId: process.env.CLOUDBASE_SECRET_ID,
      secretKey: process.env.CLOUDBASE_SECRET_KEY,
    });

    const db = app.database();
    const usersCollection = db.collection('users');

    const user = await findCnUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 401 }
      );
    }

    await usersCollection.doc(user._id).update({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const userId = user.id || user._id;
    const sessionToken = await createUserSession(userId, { email: user.email });

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: user.email,
        displayName: user.display_name || user.email?.split('@')[0],
        avatarUrl: user.avatar_url,
        provider: user.provider || 'email',
      },
    });

    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('X-Accel-Expires', '0');

    const forwardedProto = request.headers.get('x-forwarded-proto');
    const isSecureRequest = forwardedProto
      ? forwardedProto.split(',')[0].trim() === 'https'
      : request.url.startsWith('https://');
    const host = request.headers.get('host') || '';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const isSecureCookie = isSecureRequest || !isLocalhost;

    response.cookies.set('cn_session', sessionToken, {
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    if (!isLocalhost) {
      response.cookies.set('cn_session_cross', sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error: any) {
    console.error('[CN Login] Error:', error);
    return NextResponse.json(
      { error: error.message || '登录失败' },
      { status: 500 }
    );
  }
}
