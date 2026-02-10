import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { getRequestIp, rateLimit } from '@/lib/security/rateLimit';
import { findCnUserByEmail, sendCnEmailVerificationCode, type CnEmailCodePurpose } from '@/lib/auth/cn-email-code';
import { isAuthEmailSmtpConfigured } from '@/lib/email/smtp';

export async function POST(request: NextRequest) {
  if (!isChinaDeployment()) {
    return NextResponse.json(
      { error: 'This endpoint is only available in CN environment' },
      { status: 403 }
    );
  }

  if (!isAuthEmailSmtpConfigured()) {
    return NextResponse.json(
      { error: 'SMTP is not configured' },
      { status: 500 }
    );
  }

  try {
    const ip = getRequestIp(request) || 'unknown';
    const rlIp = await rateLimit({ key: `rl:cn_email_code_send:ip:${ip}`, limit: 10, windowMs: 60_000 });
    if (!rlIp.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rlIp.resetAtMs - Date.now()) / 1000));
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const purpose = String(body?.purpose || '').trim() as CnEmailCodePurpose;

    if (!email || !purpose) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (!['login', 'register', 'reset_password'].includes(purpose)) {
      return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 });
    }

    const rlEmail = await rateLimit({ key: `rl:cn_email_code_send:email:${email}:${purpose}`, limit: 3, windowMs: 60_000 });
    if (!rlEmail.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rlEmail.resetAtMs - Date.now()) / 1000));
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const user = await findCnUserByEmail(email);

    if (purpose === 'register' && user) {
      return NextResponse.json({ error: '该邮箱已注册' }, { status: 400 });
    }

    if ((purpose === 'login' || purpose === 'reset_password') && !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    await sendCnEmailVerificationCode({
      email,
      purpose,
      ip,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[CN Email Code Send] Error:', error);
    return NextResponse.json(
      { error: error?.message || '发送验证码失败' },
      { status: 500 }
    );
  }
}

