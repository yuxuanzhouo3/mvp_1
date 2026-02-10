import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { getRequestIp, rateLimit } from '@/lib/security/rateLimit';
import { verifyCnEmailVerificationCode, type CnEmailCodePurpose } from '@/lib/auth/cn-email-code';

export async function POST(request: NextRequest) {
  if (!isChinaDeployment()) {
    return NextResponse.json(
      { error: 'This endpoint is only available in CN environment' },
      { status: 403 }
    );
  }

  try {
    const ip = getRequestIp(request) || 'unknown';
    const rlIp = await rateLimit({ key: `rl:cn_email_code_verify:ip:${ip}`, limit: 20, windowMs: 60_000 });
    if (!rlIp.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rlIp.resetAtMs - Date.now()) / 1000));
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const code = String(body?.code || '').trim();
    const purpose = String(body?.purpose || '').trim() as CnEmailCodePurpose;

    if (!email || !code || !purpose) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (!['login', 'register', 'reset_password'].includes(purpose)) {
      return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 });
    }

    const result = await verifyCnEmailVerificationCode({ email, code, purpose });
    if (!result.ok) {
      return NextResponse.json({ error: result.error || '验证码验证失败' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[CN Email Code Verify] Error:', error);
    return NextResponse.json(
      { error: error?.message || '验证码验证失败' },
      { status: 500 }
    );
  }
}

