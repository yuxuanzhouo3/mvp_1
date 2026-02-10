import crypto from 'crypto';
import { sendSmtpEmail } from '@/lib/email/smtp';

export type CnEmailCodePurpose = 'login' | 'register' | 'reset_password';

const CODE_COLLECTION = 'auth_email_verification_codes';
const CODE_EXPIRES_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

let codeCollectionReady = false;
let codeCollectionReadyPromise: Promise<void> | null = null;

function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

function getCodeSecret(): string {
  return (
    process.env.AUTH_EMAIL_CODE_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.CLOUDBASE_SECRET_KEY ||
    'cn-email-code-secret-dev'
  );
}

function hashCode(email: string, purpose: CnEmailCodePurpose, code: string): string {
  const payload = `${normalizeEmail(email)}:${purpose}:${String(code || '').trim()}`;
  return crypto
    .createHmac('sha256', getCodeSecret())
    .update(payload)
    .digest('hex');
}

function generateCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

function codeContent(purpose: CnEmailCodePurpose, code: string) {
  const subjectMap: Record<CnEmailCodePurpose, string> = {
    login: '登录验证码',
    register: '注册验证码',
    reset_password: '找回密码验证码',
  };

  const actionMap: Record<CnEmailCodePurpose, string> = {
    login: '登录',
    register: '注册',
    reset_password: '重置密码',
  };

  const action = actionMap[purpose];

  const text = `您正在进行${action}操作，验证码：${code}。10分钟内有效，请勿泄露给他人。`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <h2 style="margin:0 0 12px">${action}验证码</h2>
      <p>您正在进行${action}操作，请使用以下验证码：</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px;margin:14px 0">${code}</div>
      <p>验证码 <strong>10 分钟</strong> 内有效，请勿泄露给他人。</p>
    </div>
  `;

  return {
    subject: subjectMap[purpose],
    text,
    html,
  };
}

async function getCloudbaseDb() {
  const cloudbaseModule: any = await import('@cloudbase/node-sdk');
  const cloudbase = cloudbaseModule?.default || cloudbaseModule;
  const envId = process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID || '';

  if (!envId) {
    throw new Error('Cloudbase ENV_ID is not configured');
  }

  const app = cloudbase.init({
    env: envId,
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
  });

  return app.database();
}

function toDateMs(value: any): number {
  const dateMs = new Date(value || 0).getTime();
  return Number.isFinite(dateMs) ? dateMs : 0;
}

function isCollectionNotExistError(error: any): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return (
    code.includes('DATABASE_COLLECTION_NOT_EXIST') ||
    message.includes('DATABASE_COLLECTION_NOT_EXIST') ||
    message.includes('Db or Table not exist')
  );
}

function isCollectionAlreadyExistError(error: any): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return (
    code.includes('DATABASE_COLLECTION_EXIST') ||
    message.includes('already exist') ||
    message.includes('already exists')
  );
}

async function ensureCodeCollection(db: any): Promise<void> {
  if (codeCollectionReady) return;
  if (codeCollectionReadyPromise) {
    await codeCollectionReadyPromise;
    return;
  }

  codeCollectionReadyPromise = (async () => {
    try {
      await db.collection(CODE_COLLECTION).limit(1).get();
      codeCollectionReady = true;
      return;
    } catch (error: any) {
      if (!isCollectionNotExistError(error)) {
        throw error;
      }
    }

    try {
      await db.createCollection(CODE_COLLECTION);
      codeCollectionReady = true;
      return;
    } catch (error: any) {
      if (isCollectionAlreadyExistError(error)) {
        codeCollectionReady = true;
        return;
      }
      throw error;
    }
  })();

  try {
    await codeCollectionReadyPromise;
  } finally {
    codeCollectionReadyPromise = null;
  }
}

export async function findCnUserByEmail(email: string): Promise<any | null> {
  const normalizedEmail = normalizeEmail(email);
  const db = await getCloudbaseDb();
  const usersCollection = db.collection('users');

  const lower = await usersCollection.where({ email: normalizedEmail }).limit(1).get();
  if (lower?.data?.length) return lower.data[0];

  const raw = String(email || '').trim();
  if (raw && raw !== normalizedEmail) {
    const exact = await usersCollection.where({ email: raw }).limit(1).get();
    if (exact?.data?.length) return exact.data[0];
  }

  return null;
}

export async function sendCnEmailVerificationCode(params: {
  email: string;
  purpose: CnEmailCodePurpose;
  ip?: string;
}): Promise<void> {
  const email = normalizeEmail(params.email);
  const code = generateCode();
  const codeHash = hashCode(email, params.purpose, code);
  const nowIso = new Date().toISOString();
  const expiresAtIso = new Date(Date.now() + CODE_EXPIRES_MS).toISOString();

  const db = await getCloudbaseDb();
  await ensureCodeCollection(db);
  const codeCollection = db.collection(CODE_COLLECTION);

  await codeCollection.where({ email, purpose: params.purpose, consumed_at: null }).remove().catch(() => null);

  const addRes = await codeCollection.add({
    email,
    purpose: params.purpose,
    code_hash: codeHash,
    attempts: 0,
    consumed_at: null,
    expires_at: expiresAtIso,
    created_at: nowIso,
    updated_at: nowIso,
    ip: params.ip || null,
  });

  try {
    const content = codeContent(params.purpose, code);
    await sendSmtpEmail({
      to: email,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
  } catch (error) {
    if (addRes?.id) {
      await codeCollection.doc(addRes.id).remove().catch(() => null);
    }
    throw error;
  }
}

export async function verifyCnEmailVerificationCode(params: {
  email: string;
  purpose: CnEmailCodePurpose;
  code: string;
}): Promise<{ ok: boolean; error?: string }> {
  const email = normalizeEmail(params.email);
  const code = String(params.code || '').trim();
  if (!code) {
    return { ok: false, error: '验证码不能为空' };
  }

  const db = await getCloudbaseDb();
  await ensureCodeCollection(db);
  const codeCollection = db.collection(CODE_COLLECTION);

  const codeResult = await codeCollection
    .where({
      email,
      purpose: params.purpose,
      consumed_at: null,
    })
    .limit(20)
    .get();

  const allRows = Array.isArray(codeResult?.data) ? codeResult.data : [];
  const now = Date.now();
  const availableRows = allRows.filter((row: any) => toDateMs(row.expires_at) > now);

  if (!availableRows.length) {
    return { ok: false, error: '验证码已过期或不存在' };
  }

  let latestRow = availableRows[0];
  for (const row of availableRows) {
    if (toDateMs(row.created_at) > toDateMs(latestRow?.created_at)) {
      latestRow = row;
    }
  }

  const attempts = Number(latestRow?.attempts || 0);
  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    return { ok: false, error: '验证码尝试次数过多，请重新获取' };
  }

  const expectedHash = hashCode(email, params.purpose, code);
  if (expectedHash !== latestRow.code_hash) {
    const nextAttempts = attempts + 1;
    await codeCollection.doc(latestRow._id).update({
      attempts: nextAttempts,
      updated_at: new Date().toISOString(),
      consumed_at: nextAttempts >= MAX_VERIFY_ATTEMPTS ? new Date().toISOString() : null,
    });
    return { ok: false, error: '验证码错误' };
  }

  await codeCollection.doc(latestRow._id).update({
    consumed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return { ok: true };
}
