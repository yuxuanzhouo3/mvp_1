import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { createUserSession } from '@/lib/auth/session';
import { getRequestIp, rateLimit } from '@/lib/security/rateLimit';
import { verifyCnEmailVerificationCode } from '@/lib/auth/cn-email-code';

export async function POST(request: NextRequest) {
  if (!isChinaDeployment()) {
    return NextResponse.json(
      { error: 'This endpoint is only available in CN environment' },
      { status: 403 }
    );
  }

  try {
    const ip = getRequestIp(request) || 'unknown';
    const rlIp = await rateLimit({ key: `rl:cn_register:ip:${ip}`, limit: 5, windowMs: 60_000 });
    if (!rlIp.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rlIp.resetAtMs - Date.now()) / 1000));
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const displayName = typeof body?.displayName === 'string' ? body.displayName : undefined;
    const phone = typeof body?.phone === 'string' ? body.phone : null;
    const verificationCode = String(body?.verificationCode || '').trim();

    if (!email || !password || !verificationCode) {
      return NextResponse.json(
        { error: '邮箱、密码和验证码为必填项' },
        { status: 400 }
      );
    }

    const rlEmail = await rateLimit({ key: `rl:cn_register:email:${email}`, limit: 3, windowMs: 60_000 });
    if (!rlEmail.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rlEmail.resetAtMs - Date.now()) / 1000));
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少6位' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    const verifyCodeResult = await verifyCnEmailVerificationCode({
      email,
      code: verificationCode,
      purpose: 'register',
    });
    if (!verifyCodeResult.ok) {
      return NextResponse.json(
        { error: verifyCodeResult.error || '验证码校验失败' },
        { status: 400 }
      );
    }

    let cloudbase: any;
    try {
      const cloudbaseModule: any = await import('@cloudbase/node-sdk');
      cloudbase = cloudbaseModule?.default || cloudbaseModule;
    } catch (importError) {
      console.error('[CN Register] Cloudbase SDK import error:', importError);
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

    const existingUser = await usersCollection.where({ email }).limit(1).get();
    if (existingUser.data && existingUser.data.length > 0) {
      return NextResponse.json(
        { error: '该邮箱已注册' },
        { status: 400 }
      );
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    await usersCollection.add({
      id: userId,
      email,
      password: hashedPassword,
      display_name: (displayName || email.split('@')[0]).trim(),
      phone,
      avatar_url: null,
      provider: 'email',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      email_verified: true,
    });

    const sessionToken = await createUserSession(userId, { email });

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        displayName: (displayName || email.split('@')[0]).trim(),
        provider: 'email',
      },
    });

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
    console.error('[CN Register] Error:', error);
    return NextResponse.json(
      { error: error.message || '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
