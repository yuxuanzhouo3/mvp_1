import crypto from 'crypto';
import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';

export type JwtFailureReason =
  | 'missing_secret'
  | 'malformed'
  | 'expired'
  | 'signature'
  | 'claims'
  | 'unknown';

export interface VerifySessionResult {
  userId: string;
  email?: string;
}

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.WECHAT_APP_SECRET;
  if (!secret) {
    throw Object.assign(new Error('JWT secret not configured'), { code: 'missing_secret' });
  }
  return new TextEncoder().encode(secret);
}

export function fingerprintToken(token: string): string {
  const digest = crypto.createHash('sha256').update(token).digest('hex');
  return digest.slice(0, 16);
}

export async function createUserSession(userId: string, params?: { email?: string; expiresInSeconds?: number }) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresInSeconds = params?.expiresInSeconds ?? 7 * 24 * 60 * 60;
  const secret = getJwtSecret();

  const jwt = await new SignJWT({ email: params?.email })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + expiresInSeconds)
    .setIssuer('personalink')
    .setAudience('web')
    .setSubject(userId)
    .sign(secret);

  return jwt;
}

export async function verifySessionToken(token: string): Promise<
  | { ok: true; value: VerifySessionResult }
  | { ok: false; reason: JwtFailureReason; code: string; message: string }
> {
  try {
    const secret = getJwtSecret();
    const result = await jwtVerify(token, secret, {
      issuer: 'personalink',
      audience: 'web',
    });

    const userId = result.payload.sub;
    if (!userId) {
      return { ok: false, reason: 'claims', code: 'missing_sub', message: 'missing sub' };
    }

    const email = typeof result.payload.email === 'string' ? result.payload.email : undefined;
    return { ok: true, value: { userId, email } };
  } catch (err: any) {
    if (err?.code === 'missing_secret') {
      return { ok: false, reason: 'missing_secret', code: 'missing_secret', message: 'missing secret' };
    }

    if (err instanceof joseErrors.JWTExpired) {
      return { ok: false, reason: 'expired', code: 'jwt_expired', message: err.message };
    }
    if (err instanceof joseErrors.JWSSignatureVerificationFailed) {
      return { ok: false, reason: 'signature', code: 'jwt_signature', message: err.message };
    }
    if (err instanceof joseErrors.JWTClaimValidationFailed) {
      return { ok: false, reason: 'claims', code: 'jwt_claims', message: err.message };
    }
    if (err instanceof joseErrors.JWTInvalid) {
      return { ok: false, reason: 'malformed', code: 'jwt_invalid', message: err.message };
    }

    return { ok: false, reason: 'unknown', code: 'jwt_unknown', message: err instanceof Error ? err.message : String(err) };
  }
}

