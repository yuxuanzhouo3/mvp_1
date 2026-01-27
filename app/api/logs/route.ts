import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/requireUser';
import { getServiceDbClientFromRequest } from '@/lib/db-client';

function isValidLevel(level: unknown): level is 'debug' | 'info' | 'warn' | 'error' {
  return level === 'debug' || level === 'info' || level === 'warn' || level === 'error';
}

function toSafeString(value: unknown, maxLen: number): string {
  const s = typeof value === 'string' ? value : String(value ?? '');
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen);
}

function toSafeJson(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toIsoTimestamp(value: unknown): string {
  if (typeof value === 'string') {
    const t = Date.parse(value);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  return new Date().toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({} as any));
    const logs = Array.isArray(body?.logs) ? body.logs : [];

    if (logs.length === 0) {
      return NextResponse.json({ success: true, inserted: 0 });
    }

    const cappedLogs = logs.slice(0, 200);
    const db = await getServiceDbClientFromRequest(request);

    const rows = cappedLogs
      .map((entry: any) => {
        if (!entry || typeof entry !== 'object') return null;
        const level = isValidLevel(entry.level) ? entry.level : 'info';
        const category = toSafeString(entry.category, 80) || 'Unknown';
        const message = toSafeString(entry.message, 10000) || '';
        if (!message) return null;

        return {
          user_id: user.userId,
          level,
          category,
          message,
          data: toSafeJson(entry.data),
          occurred_at: toIsoTimestamp(entry.timestamp),
          source: 'client',
        };
      })
      .filter(Boolean);

    if (rows.length === 0) {
      return NextResponse.json({ success: true, inserted: 0 });
    }

    const { error } = await db.from('app_logs').insert(rows);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, inserted: rows.length });
  } catch (error: any) {
    const message = error?.message ? String(error.message) : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

