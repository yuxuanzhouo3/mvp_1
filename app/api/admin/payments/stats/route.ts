/**
 * 支付统计 API (管理员)
 * Payment Stats API (Admin)
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCnServiceDbClient, getIntlServiceDbClient, getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminSessionToken } from '@/utils/session';

// Force dynamic rendering to avoid caching issues
export const dynamic = 'force-dynamic';

const CN_APP_ORIGIN = process.env.CN_APP_ORIGIN || 'https://personalink.mornscience.top';
const INTL_APP_ORIGIN = process.env.INTL_APP_ORIGIN || 'https://www.mornhub.lat';

type PaymentsRegion = 'ALL' | 'CN' | 'INTL';

function parsePaymentsRegion(value: string | null): PaymentsRegion {
  const normalized = (value || '').toUpperCase();
  if (normalized === 'CN' || normalized === 'INTL') return normalized;
  return 'ALL';
}

function hasCnDbConfig(): boolean {
  return !!(process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID && process.env.CLOUDBASE_SECRET_ID && process.env.CLOUDBASE_SECRET_KEY);
}

function hasIntlDbConfig(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getProxySecret(): string | null {
  return process.env.ADMIN_PROXY_SECRET || process.env.AI_STATS_PROXY_SECRET || null;
}

function isInternalProxyRequest(request: NextRequest): boolean {
  const hop = request.headers.get('x-admin-proxy-hop');
  const secret = request.headers.get('x-admin-proxy-secret');
  const expected = getProxySecret();
  return hop === '1' && !!expected && secret === expected;
}

function safeNumber(value: any): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

function toDayString(value: any): string | null {
  if (!value) return null;
  try {
    if (typeof value === 'string') return value.split('T')[0];
    return new Date(value).toISOString().split('T')[0];
  } catch {
    return null;
  }
}

type PaymentRow = {
  id?: string;
  user_id?: string;
  amount?: any;
  currency?: string;
  credits?: number;
  payment_method?: string;
  status?: string;
  metadata?: any;
  created_at?: any;
  completed_at?: any;
};

function computeAggregates(payments: PaymentRow[]) {
  const completedPayments = payments.filter((p) => p.status === 'completed');
  const failedPayments = payments.filter((p) => p.status === 'failed');
  const pendingPayments = payments.filter((p) => p.status === 'pending');

  const totalAttempts = completedPayments.length + failedPayments.length;
  const successRate = totalAttempts > 0 ? (completedPayments.length / totalAttempts) * 100 : 0;

  const revenueByCurrency: Record<string, number> = {};
  for (const p of completedPayments) {
    const currency = p.currency || 'CNY';
    revenueByCurrency[currency] = (revenueByCurrency[currency] || 0) + safeNumber(p.amount);
  }

  const dailyRevenue: Array<{ date: string; amount_cny: number; amount_usd: number; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayPayments = completedPayments.filter((p) => {
      const paymentDate = toDayString(p.completed_at || p.created_at);
      return paymentDate === dateStr;
    });

    let amountCny = 0;
    let amountUsd = 0;
    for (const p of dayPayments) {
      const amount = safeNumber(p.amount);
      if (p.currency === 'USD') amountUsd += amount;
      else amountCny += amount;
    }

    dailyRevenue.push({ date: dateStr, amount_cny: amountCny, amount_usd: amountUsd, count: dayPayments.length });
  }

  const monthlyRevenue: Array<{ month: string; amount_cny: number; amount_usd: number; count: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const monthPayments = completedPayments.filter((p) => {
      const d = new Date(p.completed_at || p.created_at || 0);
      if (Number.isNaN(d.getTime())) return false;
      const paymentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return paymentMonth === monthStr;
    });

    let amountCny = 0;
    let amountUsd = 0;
    for (const p of monthPayments) {
      const amount = safeNumber(p.amount);
      if (p.currency === 'USD') amountUsd += amount;
      else amountCny += amount;
    }

    monthlyRevenue.push({ month: monthStr, amount_cny: amountCny, amount_usd: amountUsd, count: monthPayments.length });
  }

  const paymentMethodStats: Record<string, { count: number; revenue_cny: number; revenue_usd: number }> = {};
  for (const p of completedPayments) {
    const method = String(p.payment_method || 'unknown');
    if (!paymentMethodStats[method]) {
      paymentMethodStats[method] = { count: 0, revenue_cny: 0, revenue_usd: 0 };
    }
    paymentMethodStats[method].count++;
    const amount = safeNumber(p.amount);
    if (p.currency === 'USD') paymentMethodStats[method].revenue_usd += amount;
    else paymentMethodStats[method].revenue_cny += amount;
  }

  const totalRevenueCny = revenueByCurrency['CNY'] || 0;
  const totalRevenueUsd = revenueByCurrency['USD'] || 0;
  const totalCreditsIssued = completedPayments.reduce((sum, p: any) => sum + (Number(p.credits) || 0), 0);

  return {
    overview: {
      total_payments: completedPayments.length,
      total_revenue_cny: totalRevenueCny,
      total_revenue_usd: totalRevenueUsd,
      total_credits_issued: totalCreditsIssued,
      pending_payments: pendingPayments.length,
      failed_payments: failedPayments.length,
      success_rate: successRate,
    },
    daily_revenue: dailyRevenue,
    monthly_revenue: monthlyRevenue,
    payment_method_stats: Object.entries(paymentMethodStats).map(([method, stats]) => ({ method, ...stats })),
  };
}

function computePackageStats(
  payments: PaymentRow[],
  packages: any[],
  region: 'CN' | 'INTL'
) {
  const completedPayments = payments.filter((p) => p.status === 'completed');
  const packageSales: Record<string, { count: number; revenue_cny: number; revenue_usd: number }> = {};

  for (const p of completedPayments) {
    const packageId = String(p.metadata?.package_id || 'unknown');
    if (!packageSales[packageId]) {
      packageSales[packageId] = { count: 0, revenue_cny: 0, revenue_usd: 0 };
    }
    packageSales[packageId].count++;
    const amount = safeNumber(p.amount);
    if (p.currency === 'USD') packageSales[packageId].revenue_usd += amount;
    else packageSales[packageId].revenue_cny += amount;
  }

  return Object.entries(packageSales)
    .map(([id, stats]) => {
      const pkg = (packages || []).find((p: any) => p.id === id);
      const name = pkg?.name_zh || pkg?.name_en || id;
      return {
        package_id: `${region}:${id}`,
        package_name: `${region} - ${name}`,
        credits: pkg?.credits || 0,
        ...stats,
      };
    })
    .sort((a, b) => b.count - a.count);
}

async function proxyFetchRegion(request: NextRequest, targetOrigin: string, region: 'CN' | 'INTL') {
  const currentOrigin = new URL(request.url).origin;
  if (currentOrigin === targetOrigin) {
    throw new Error(`Proxy origin equals current origin (${currentOrigin})`);
  }

  const proxySecret = getProxySecret();
  if (!proxySecret) {
    throw new Error('未配置 ADMIN_PROXY_SECRET（或 AI_STATS_PROXY_SECRET），无法跨环境代理请求');
  }

  const targetUrl = new URL('/api/admin/payments/stats', targetOrigin);
  targetUrl.searchParams.set('region', region);

  const headers = new Headers();
  headers.set('x-admin-proxy-hop', '1');
  headers.set('x-admin-proxy-secret', proxySecret);

  const adminSession = request.cookies.get('admin_session')?.value;
  if (adminSession) {
    headers.set('cookie', `admin_session=${adminSession}`);
  }

  const authorization = request.headers.get('authorization');
  if (authorization) {
    headers.set('authorization', authorization);
  }

  const res = await fetch(targetUrl.toString(), { method: 'GET', headers, cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Proxy failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

// INTL 环境
function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

async function verifyAdmin(token: string): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    let userId: string | undefined;

    if (isChinaDeployment()) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        userId = payload.sub || payload.uid;
      } catch {
        const db = await getServiceDbClient();
        const { data, error } = await db.auth.getUser();
        if (error || !data?.user) return { isAdmin: false };
        userId = data.user.id;
      }
    } else {
      const supabase = createSupabaseAdmin();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return { isAdmin: false };
      userId = user.id;
    }

    if (!userId) return { isAdmin: false };

    const db = await getServiceDbClient();
    const { data: adminRoles } = await db
      .from('admin_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1);

    return adminRoles && adminRoles.length > 0 ? { isAdmin: true, userId } : { isAdmin: false };
  } catch {
    return { isAdmin: false };
  }
}

export async function GET(request: NextRequest) {
  try {
    const internal = isInternalProxyRequest(request);

    const adminSessionToken = request.cookies.get('admin_session')?.value;
    const isSessionAuthed = !!adminSessionToken && verifyAdminSessionToken(adminSessionToken);

    const authHeader = request.headers.get('authorization');
    if (!internal && !isSessionAuthed && (!authHeader || !authHeader.startsWith('Bearer '))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!internal && !isSessionAuthed) {
      const token = authHeader!.split(' ')[1];
      const { isAdmin } = await verifyAdmin(token);
      if (!isAdmin) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
    }

    const url = new URL(request.url);
    const region = parsePaymentsRegion(url.searchParams.get('region'));

    const canProxy = !internal;

    const loadRegion = async (r: 'CN' | 'INTL') => {
      if (r === 'CN') {
        if (hasCnDbConfig()) {
          const db = await getCnServiceDbClient();
          const { data: payments, error } = await db
            .from('payments')
            .select('id, user_id, amount, currency, credits, payment_method, status, metadata, created_at, completed_at');
          if (error) throw error;
          const { data: packages } = await db.from('credit_packages').select('id, name_en, name_zh, credits');
          return { payments: (payments || []) as PaymentRow[], packages: packages || [] };
        }
        if (canProxy) {
          const remote = await proxyFetchRegion(request, CN_APP_ORIGIN, 'CN');
          return { proxied: true as const, remote };
        }
        throw new Error('CN 数据源未配置');
      }

      if (hasIntlDbConfig()) {
        const db = await getIntlServiceDbClient();
        const { data: payments, error } = await db
          .from('payments')
          .select('id, user_id, amount, currency, credits, payment_method, status, metadata, created_at, completed_at');
        if (error) throw error;
        const { data: packages } = await db.from('credit_packages').select('id, name_en, name_zh, credits');
        return { payments: (payments || []) as PaymentRow[], packages: packages || [] };
      }
      if (canProxy) {
        const remote = await proxyFetchRegion(request, INTL_APP_ORIGIN, 'INTL');
        return { proxied: true as const, remote };
      }
      throw new Error('INTL 数据源未配置');
    };

    const mergeFromRemote = (remote: any) => {
      return {
        overview: remote?.overview || remote?.data?.overview,
        daily_revenue: remote?.daily_revenue || remote?.data?.daily_revenue,
        monthly_revenue: remote?.monthly_revenue || remote?.data?.monthly_revenue,
        package_stats: remote?.package_stats || remote?.data?.package_stats,
        payment_method_stats: remote?.payment_method_stats || remote?.data?.payment_method_stats,
      };
    };

    let cnPayments: PaymentRow[] = [];
    let intlPayments: PaymentRow[] = [];
    let packageStats: any[] = [];

    if (region === 'CN') {
      const result: any = await loadRegion('CN');
      if (result.proxied) {
        const proxied = mergeFromRemote(result.remote);
        return NextResponse.json({ success: true, ...proxied }, { headers: { 'cache-control': 'no-store' } });
      }
      cnPayments = result.payments;
      packageStats = computePackageStats(result.payments, result.packages, 'CN');
      const computed = computeAggregates(result.payments);
      return NextResponse.json({ success: true, ...computed, package_stats: packageStats }, { headers: { 'cache-control': 'no-store' } });
    }

    if (region === 'INTL') {
      const result: any = await loadRegion('INTL');
      if (result.proxied) {
        const proxied = mergeFromRemote(result.remote);
        return NextResponse.json({ success: true, ...proxied }, { headers: { 'cache-control': 'no-store' } });
      }
      intlPayments = result.payments;
      packageStats = computePackageStats(result.payments, result.packages, 'INTL');
      const computed = computeAggregates(result.payments);
      return NextResponse.json({ success: true, ...computed, package_stats: packageStats }, { headers: { 'cache-control': 'no-store' } });
    }

    const [cnRes, intlRes]: any[] = await Promise.allSettled([loadRegion('CN'), loadRegion('INTL')]);

    const empty = {
      overview: {
        total_payments: 0,
        total_revenue_cny: 0,
        total_revenue_usd: 0,
        total_credits_issued: 0,
        pending_payments: 0,
        failed_payments: 0,
        success_rate: 0,
      },
      daily_revenue: [] as any[],
      monthly_revenue: [] as any[],
      package_stats: [] as any[],
      payment_method_stats: [] as any[],
    };

    const buildSide = (res: any, r: 'CN' | 'INTL') => {
      if (res.status !== 'fulfilled') return empty;
      if (res.value?.proxied) {
        const proxied = mergeFromRemote(res.value.remote);
        return {
          overview: proxied.overview || empty.overview,
          daily_revenue: proxied.daily_revenue || empty.daily_revenue,
          monthly_revenue: proxied.monthly_revenue || empty.monthly_revenue,
          package_stats: proxied.package_stats || empty.package_stats,
          payment_method_stats: proxied.payment_method_stats || empty.payment_method_stats,
        };
      }
      const payments = (res.value?.payments || []) as PaymentRow[];
      const packages = res.value?.packages || [];
      const computed = computeAggregates(payments);
      return {
        ...computed,
        package_stats: computePackageStats(payments, packages, r),
      };
    };

    const cnSide = buildSide(cnRes, 'CN');
    const intlSide = buildSide(intlRes, 'INTL');

    const mergeByKey = <T extends Record<string, any>>(
      a: T[],
      b: T[],
      key: string,
      merge: (x: T, y: T) => T
    ) => {
      const map = new Map<string, T>();
      for (const item of a || []) map.set(String(item[key]), item);
      for (const item of b || []) {
        const k = String(item[key]);
        const prev = map.get(k);
        map.set(k, prev ? merge(prev, item) : item);
      }
      return Array.from(map.values());
    };

    const daily = mergeByKey(
      cnSide.daily_revenue,
      intlSide.daily_revenue,
      'date',
      (x, y) => ({
        date: x.date,
        amount_cny: safeNumber(x.amount_cny) + safeNumber(y.amount_cny),
        amount_usd: safeNumber(x.amount_usd) + safeNumber(y.amount_usd),
        count: safeNumber(x.count) + safeNumber(y.count),
      })
    ).sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));

    const monthly = mergeByKey(
      cnSide.monthly_revenue,
      intlSide.monthly_revenue,
      'month',
      (x, y) => ({
        month: x.month,
        amount_cny: safeNumber(x.amount_cny) + safeNumber(y.amount_cny),
        amount_usd: safeNumber(x.amount_usd) + safeNumber(y.amount_usd),
        count: safeNumber(x.count) + safeNumber(y.count),
      })
    ).sort((a: any, b: any) => String(a.month).localeCompare(String(b.month)));

    const methods = mergeByKey(
      cnSide.payment_method_stats,
      intlSide.payment_method_stats,
      'method',
      (x, y) => ({
        method: x.method,
        count: safeNumber(x.count) + safeNumber(y.count),
        revenue_cny: safeNumber(x.revenue_cny) + safeNumber(y.revenue_cny),
        revenue_usd: safeNumber(x.revenue_usd) + safeNumber(y.revenue_usd),
      })
    ).sort((a: any, b: any) => safeNumber(b.count) - safeNumber(a.count));

    const combined = {
      overview: {
        total_payments: safeNumber(cnSide.overview.total_payments) + safeNumber(intlSide.overview.total_payments),
        total_revenue_cny: safeNumber(cnSide.overview.total_revenue_cny) + safeNumber(intlSide.overview.total_revenue_cny),
        total_revenue_usd: safeNumber(cnSide.overview.total_revenue_usd) + safeNumber(intlSide.overview.total_revenue_usd),
        total_credits_issued: safeNumber(cnSide.overview.total_credits_issued) + safeNumber(intlSide.overview.total_credits_issued),
        pending_payments: safeNumber(cnSide.overview.pending_payments) + safeNumber(intlSide.overview.pending_payments),
        failed_payments: safeNumber(cnSide.overview.failed_payments) + safeNumber(intlSide.overview.failed_payments),
        success_rate: Math.max(safeNumber(cnSide.overview.success_rate), safeNumber(intlSide.overview.success_rate)),
      },
      daily_revenue: daily,
      monthly_revenue: monthly,
      package_stats: [...(cnSide.package_stats || []), ...(intlSide.package_stats || [])],
      payment_method_stats: methods,
    };

    return NextResponse.json(
      {
        success: true,
        ...combined,
        regions: {
          cn: cnSide,
          intl: intlSide,
        },
      },
      { headers: { 'cache-control': 'no-store' } }
    );

  } catch (error) {
    console.error('Payment stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
