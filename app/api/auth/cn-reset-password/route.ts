import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/config/deployment.config';
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
    const rlIp = await rateLimit({ key: `rl:cn_reset_password:ip:${ip}`, limit: 20, windowMs: 60_000 });
    if (!rlIp.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rlIp.resetAtMs - Date.now()) / 1000));
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const verificationCode = String(body?.verificationCode || '').trim();
    const password = String(body?.password || '');

    if (!email || !verificationCode || !password) {
      return NextResponse.json(
        { error: '邮箱、验证码和新密码为必填项' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少6位' },
        { status: 400 }
      );
    }

    const verifyCodeResult = await verifyCnEmailVerificationCode({
      email,
      code: verificationCode,
      purpose: 'reset_password',
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
      console.error('[CN Reset Password] Cloudbase SDK import error:', importError);
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
    const bcrypt = await import('bcryptjs');

    const user = await findCnUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await usersCollection.doc(user._id).update({
      password: hashedPassword,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: '密码重置成功',
    });
  } catch (error: any) {
    console.error('[CN Reset Password] Error:', error);
    return NextResponse.json(
      { error: error.message || '密码重置失败' },
      { status: 500 }
    );
  }
}
