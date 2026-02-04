import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db-client';
import { isChinaRequest } from '@/lib/config/request-region';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl, isPlaceholderSupabaseUrl } from '@/lib/config/supabase-env';
import { fingerprintToken, verifySessionToken } from '@/lib/auth/session';
import { warn } from '@/lib/logger';
import { getExternalRequestOrigin } from '@/lib/http/request-origin';

export interface AuthenticatedUser {
  userId: string;
  email?: string;
  region: 'CN' | 'INTL';
}

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getAllowedOrigins(request: NextRequest): string[] {
  const origins = new Set<string>();
  const configuredOrigin = getExternalRequestOrigin(request);
  if (configuredOrigin) origins.add(configuredOrigin);
  try {
    origins.add(new URL(request.url).origin);
  } catch {}
  return Array.from(origins);
}

function assertSameOrigin(request: NextRequest) {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

  const allowedOrigins = getAllowedOrigins(request);
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (origin) {
    if (!allowedOrigins.includes(origin)) {
      throw new AuthError(403, 'csrf_origin', 'csrf');
    }
    return;
  }

  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (!allowedOrigins.includes(refOrigin)) {
        throw new AuthError(403, 'csrf_referer', 'csrf');
      }
      return;
    } catch {
      throw new AuthError(403, 'csrf_referer_invalid', 'csrf');
    }
  }

  throw new AuthError(403, 'csrf_missing', 'csrf');
}

function buildRequestId(request: Request): string {
  const headers = request.headers;
  return (
    headers.get('x-request-id') ||
    headers.get('x-correlation-id') ||
    headers.get('cf-ray') ||
    crypto.randomUUID()
  );
}

function logJwtFailure(params: {
  request: Request;
  reason: string;
  code: string;
  message: string;
  tokenFingerprint?: string;
}) {
  const requestId = buildRequestId(params.request);
  const url = new URL(params.request.url);
  warn('Auth', 'jwt_verify_failed', {
    requestId,
    route: url.pathname,
    method: (params.request as any).method,
    reason: params.reason,
    code: params.code,
    message: params.message,
    tokenFingerprint: params.tokenFingerprint,
  });
}

export function jsonAuthError(err: AuthError) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: err.status });
}

export async function requireUser(request: NextRequest): Promise<AuthenticatedUser> {
  if (isChinaRequest(request)) {
    const cookieToken =
      request.cookies.get('cn_session')?.value ||
      request.cookies.get('cn_session_cross')?.value ||
      null;

    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    const token = cookieToken || bearerToken;

    if (!token) {
      throw new AuthError(401, 'missing_token', 'missing token');
    }

    const fp = fingerprintToken(token);
    const verified = await verifySessionToken(token);
    if (!verified.ok) {
      logJwtFailure({
        request,
        reason: verified.reason,
        code: verified.code,
        message: verified.message,
        tokenFingerprint: fp,
      });
      throw new AuthError(401, 'invalid_token', 'invalid token');
    }

    assertSameOrigin(request);
    return { userId: verified.value.userId, email: verified.value.email, region: 'CN' };
  }

  const db = await getDbClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (!error && user) {
    return { userId: user.id, email: user.email, region: 'INTL' };
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice('Bearer '.length);
      const url = getSupabaseUrl();
      const key = getSupabaseAnonKey();
      if (url && key && !isPlaceholderSupabaseUrl(url)) {
        const anonClient = createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: { user: tokenUser }, error: tokenError } = await anonClient.auth.getUser(token);
        if (!tokenError && tokenUser) {
          return { userId: tokenUser.id, email: tokenUser.email, region: 'INTL' };
        }
      }
    } catch {}
  }

  throw new AuthError(401, 'unauthorized', 'unauthorized');
}
