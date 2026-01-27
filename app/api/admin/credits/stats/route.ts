/**
 * 积分统计 API (管理员)
 * Credits Stats API (Admin)
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCnServiceDbClient, getIntlServiceDbClient } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { getDeploymentRegionFromRequest } from '@/lib/config/request-region';
import { getSupabaseUrl, isPlaceholderSupabaseUrl } from '@/lib/config/supabase-env';
import { verifyAdminSessionToken } from '@/utils/session';
import { aggregateCreditsStats, toNumber } from '@/lib/admin/credits-analytics';

// Force dynamic rendering to avoid caching issues
export const dynamic = 'force-dynamic';

const CN_APP_ORIGIN = process.env.CN_APP_ORIGIN || 'https://personalink.mornscience.top';
const INTL_APP_ORIGIN = process.env.INTL_APP_ORIGIN || 'https://www.mornhub.lat';

function createSupabaseAdmin() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || isPlaceholderSupabaseUrl(url)) {
    throw new Error('Supabase admin configuration missing. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  }
  return createClient(
    url,
    key,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

type CreditsRegion = 'CN' | 'INTL';

function parseCreditsRegion(value: string | null): CreditsRegion | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  if (normalized === 'CN' || normalized === 'INTL') return normalized as CreditsRegion;
  return null;
}

async function verifyAdminSessionFromCookie(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('admin_session')?.value;
  if (!token) return false;
  try {
    return verifyAdminSessionToken(token);
  } catch {
    return false;
  }
}

async function verifyAdminBearerViaSupabase(token: string): Promise<boolean> {
  try {
    const url = getSupabaseUrl();
    if (!url || isPlaceholderSupabaseUrl(url) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
    const supabase = createSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return false;
    const { data: adminRoles } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .limit(1);
    return !!(adminRoles && adminRoles.length > 0);
  } catch {
    return false;
  }
}

async function getDbForRegion(region: CreditsRegion): Promise<any> {
  if (region === 'CN') return getCnServiceDbClient();
  return getIntlServiceDbClient();
}

async function fetchTransactions(db: any, region: CreditsRegion) {
  const baseSelect = 'id, user_id, type, amount, balance_before, balance_after, created_at';
  const { data: transactions, error: transactionsError } = await db
    .from('transactions')
    .select(baseSelect);

  if (!transactionsError) {
    return { data: transactions || [], error: null as Error | null };
  }

  if (region === 'CN') {
    const { data: fallback, error: fallbackError } = await db
      .from('credit_transactions')
      .select(baseSelect);
    if (!fallbackError) return { data: fallback || [], error: null as Error | null };
    return { data: [], error: fallbackError as Error };
  }

  return { data: [], error: transactionsError as Error };
}

async function fetchUserProfiles(db: any, region: CreditsRegion) {
  const { data: userProfiles, error: profilesError } = await db
    .from('user_profiles')
    .select('user_id, credits');

  if (!profilesError) {
    return { data: (userProfiles || []) as Array<{ user_id: string; credits: number }>, error: null as Error | null };
  }

  if (region === 'CN') {
    const { data: users, error: usersError } = await db
      .from('users')
      .select('id, credits');
    if (!usersError) {
      return {
        data: (users || []).map((u: any) => ({ user_id: u.id || u._id, credits: toNumber(u.credits) })),
        error: null as Error | null,
      };
    }
    return { data: [], error: usersError as Error };
  }

  return { data: [], error: profilesError as Error };
}

async function fetchUsersByIds(db: any, ids: string[]) {
  if (!ids.length) return { data: [] as any[], error: null as Error | null };
  const { data: users, error } = await db
    .from('users')
    .select('id, username, email')
    .in('id', ids);
  return { data: users || [], error: (error as Error) || null };
}

function hasCnDbConfig(): boolean {
  return !!process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID;
}

function hasIntlDbConfig(): boolean {
  const url = getSupabaseUrl();
  return !!(url && !isPlaceholderSupabaseUrl(url) && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getOriginForRegion(region: CreditsRegion): string {
  return region === 'CN' ? CN_APP_ORIGIN : INTL_APP_ORIGIN;
}

function isInternalProxyRequest(request: NextRequest): boolean {
  const hop = request.headers.get('x-credits-proxy-hop');
  const secret = request.headers.get('x-credits-proxy-secret');
  const expected = process.env.CREDITS_STATS_PROXY_SECRET || process.env.AI_STATS_PROXY_SECRET;
  return hop === '1' && !!expected && secret === expected;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const requestedRegion = parseCreditsRegion(url.searchParams.get('region'));
    const defaultRegion = getDeploymentRegionFromRequest(request);
    const region = requestedRegion || defaultRegion;

    const isInternal = isInternalProxyRequest(request);

    if (!isInternal) {
      const hasAdminSession = await verifyAdminSessionFromCookie(request);
      if (!hasAdminSession) {
        const authHeader = request.headers.get('authorization') || '';
        const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        if (!bearerToken) {
          return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const isAdmin = await verifyAdminBearerViaSupabase(bearerToken);
        if (!isAdmin) {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    const proxyHop = request.headers.get('x-credits-proxy-hop') || '';
    const canServeRequestedRegion = region === 'CN' ? hasCnDbConfig() : hasIntlDbConfig();
    const shouldProxy = proxyHop !== '1' && !canServeRequestedRegion;

    if (shouldProxy) {
      const targetOrigin = getOriginForRegion(region);
      const targetUrl = new URL('/api/admin/credits/stats', targetOrigin);
      targetUrl.searchParams.set('region', region);

      const headers = new Headers();
      headers.set('x-credits-proxy-hop', '1');

      const proxySecret = process.env.CREDITS_STATS_PROXY_SECRET || process.env.AI_STATS_PROXY_SECRET;
      if (!proxySecret) {
        return NextResponse.json(
          {
            success: false,
            error: `未配置 ${region} 环境数据库，且未设置 CREDITS_STATS_PROXY_SECRET（或 AI_STATS_PROXY_SECRET），无法跨环境代理请求`,
          },
          { status: 501 }
        );
      }

      headers.set('x-credits-proxy-secret', proxySecret);

      const adminSession = request.cookies.get('admin_session')?.value;
      if (adminSession) {
        headers.set('cookie', `admin_session=${adminSession}`);
      }

      const authorization = request.headers.get('authorization');
      if (authorization) {
        headers.set('authorization', authorization);
      }

      const proxied = await fetch(targetUrl.toString(), {
        method: 'GET',
        headers,
        cache: 'no-store',
      });

      const body = await proxied.text();
      return new NextResponse(body, {
        status: proxied.status,
        headers: {
          'content-type': proxied.headers.get('content-type') || 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    }

    if (region === 'CN' && !hasCnDbConfig()) {
      return NextResponse.json(
        { success: false, error: 'CloudBase 未配置，无法查询 CN 数据' },
        { status: 501 }
      );
    }

    if (region === 'INTL' && !hasIntlDbConfig()) {
      return NextResponse.json(
        { success: false, error: 'Supabase 未配置，无法查询 INTL 数据' },
        { status: 501 }
      );
    }

    const db = await getDbForRegion(region);

    const { data: transactions, error: transactionsError } = await fetchTransactions(db, region);
    if (transactionsError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch transactions' }, { status: 500 });
    }

    const { data: profiles, error: profilesError } = await fetchUserProfiles(db, region);
    if (profilesError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch user profiles' }, { status: 500 });
    }

    const consumed = transactions.filter((t: any) => toNumber(t.amount) < 0);
    const userConsumeMap: Record<string, number> = {};
    consumed.forEach((t: any) => {
      const userId = String(t.user_id || '');
      if (!userId) return;
      userConsumeMap[userId] = (userConsumeMap[userId] || 0) + Math.abs(toNumber(t.amount));
    });

    const topConsumerIds = Object.entries(userConsumeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId]) => userId);

    const { data: users } = await fetchUsersByIds(db, topConsumerIds);

    const aggregated = aggregateCreditsStats({ transactions, profiles, users });
    return NextResponse.json({ success: true, region, ...aggregated });

  } catch (error) {
    console.error('Credits stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
