/**
 * AI 统计 API (管理员)
 * AI Stats API (Admin)
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCnServiceDbClient, getIntlServiceDbClient, getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { getDeploymentRegionFromRequest } from '@/lib/config/request-region';
import { verifyAdminSessionToken } from '@/utils/session';

export const dynamic = 'force-dynamic';

const MONTHLY_TOKEN_BUDGET = parseInt(process.env.AI_MONTHLY_TOKEN_BUDGET || '1000000');
const BUDGET_WARNING_THRESHOLD = 0.8;

const CN_APP_ORIGIN = process.env.CN_APP_ORIGIN || 'https://personalink.mornscience.top';
const INTL_APP_ORIGIN = process.env.INTL_APP_ORIGIN || 'https://www.mornhub.lat';

function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

type AiRegion = 'CN' | 'INTL';

function parseAiRegion(value: string | null): AiRegion | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  if (normalized === 'CN' || normalized === 'INTL') return normalized as AiRegion;
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

async function getDbForRegion(region: AiRegion): Promise<any> {
  if (region === 'CN') return getCnServiceDbClient();
  return getIntlServiceDbClient();
}

function hasCnDbConfig(): boolean {
  return !!process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID;
}

function hasIntlDbConfig(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getOriginForRegion(region: AiRegion): string {
  return region === 'CN' ? CN_APP_ORIGIN : INTL_APP_ORIGIN;
}

function isInternalProxyRequest(request: NextRequest): boolean {
  const hop = request.headers.get('x-ai-stats-proxy-hop');
  const secret = request.headers.get('x-ai-stats-proxy-secret');
  const expected = process.env.AI_STATS_PROXY_SECRET;
  return hop === '1' && !!expected && secret === expected;
}

async function computeAiStats(db: any, region: AiRegion) {
  const errors: string[] = [];

  const { data: sessions, error: sessionsError } = await db
    .from('ai_chat_sessions')
    .select('id, user_id, session_type, model_used, token_usage, created_at');

  const allSessions = sessionsError ? [] : (sessions || []);
  if (sessionsError) {
    errors.push('ai_chat_sessions 查询失败');
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthSessions = allSessions.filter((s: any) => new Date(s.created_at) >= monthStart);
  const monthlyTokenUsage = monthSessions.reduce((sum: number, s: any) => sum + (s.token_usage || 0), 0);

  const totalTokenUsage = allSessions.reduce((sum: number, s: any) => sum + (s.token_usage || 0), 0);
  const totalSessions = allSessions.length;

  const { data: usageLogs, error: usageLogsError } = await db
    .from('ai_usage_logs')
    .select('user_id, feature, tokens_used, created_at');

  const allUsageLogs = usageLogsError ? [] : (usageLogs || []);
  if (usageLogsError) {
    errors.push('ai_usage_logs 查询失败');
  }

  const monthUsageLogs = allUsageLogs.filter((l: any) => new Date(l.created_at) >= monthStart);
  const personalityUsageLogs = allUsageLogs.filter(
    (l: any) => l.feature === 'analysis' || l.feature === 'personality'
  );
  const monthPersonalityUsageLogs = monthUsageLogs.filter(
    (l: any) => l.feature === 'analysis' || l.feature === 'personality'
  );
  const totalPersonalityCount = personalityUsageLogs.length;
  const monthlyPersonalityCount = monthPersonalityUsageLogs.length;
  const todayStr = now.toISOString().slice(0, 10);
  const todayPersonalityCount = personalityUsageLogs.filter((l: any) => {
    const createdAt = l.created_at;
    if (typeof createdAt === 'string') return createdAt.slice(0, 10) === todayStr;
    try {
      return new Date(createdAt).toISOString().slice(0, 10) === todayStr;
    } catch {
      return false;
    }
  }).length;

  const assistantTokens = monthUsageLogs
    .filter((l: any) => l.feature === 'assistant')
    .reduce((sum: number, l: any) => sum + (l.tokens_used || 0), 0);

  const assistantSessions = allUsageLogs.filter((l: any) => l.feature === 'assistant').length;

  const sessionsByType = {
    free_trial: allSessions.filter((s: any) => s.session_type === 'free_trial').length,
    vip_unlimited: allSessions.filter((s: any) => s.session_type === 'vip_unlimited').length,
    assistant: assistantSessions,
  };

  const dailyStats: Array<{ date: string; sessions: number; tokens: number }> = [];
  const personalityDailyStats: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const daySessions = allSessions.filter((s: any) => {
      try {
        const sessionDate = s.created_at?.substring(0, 10) || new Date(s.created_at).toISOString().split('T')[0];
        return sessionDate === dateStr;
      } catch {
        return false;
      }
    });
    const daySessionTokens = daySessions.reduce((sum: number, s: any) => sum + (s.token_usage || 0), 0);

    const dayUsageLogs = allUsageLogs.filter((l: any) => {
      try {
        const logDate = l.created_at?.substring(0, 10) || new Date(l.created_at).toISOString().split('T')[0];
        return logDate === dateStr;
      } catch {
        return false;
      }
    });
    const dayUsageTokens = dayUsageLogs.reduce((sum: number, l: any) => sum + (l.tokens_used || 0), 0);

    dailyStats.push({
      date: dateStr,
      sessions: daySessions.length + dayUsageLogs.length,
      tokens: daySessionTokens + dayUsageTokens,
    });

    const dayPersonalityCount = dayUsageLogs.filter(
      (l: any) => l.feature === 'analysis' || l.feature === 'personality'
    ).length;
    personalityDailyStats.push({
      date: dateStr,
      count: dayPersonalityCount,
    });
  }

  const userTokenMap: Record<string, number> = {};
  allSessions.forEach((s: any) => {
    userTokenMap[s.user_id] = (userTokenMap[s.user_id] || 0) + (s.token_usage || 0);
  });
  allUsageLogs.forEach((l: any) => {
    userTokenMap[l.user_id] = (userTokenMap[l.user_id] || 0) + (l.tokens_used || 0);
  });

  const topUserIds = Object.entries(userTokenMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId]) => userId);

  let topUsers: Array<{ user_id: string; username: string; total_tokens: number }> = [];
  if (topUserIds.length > 0) {
    const userSelect = region === 'CN' ? 'id, username, display_name, email' : 'id, username, email';
    const { data: users } = await db
      .from('users')
      .select(userSelect)
      .in('id', topUserIds);

    topUsers = topUserIds.map(userId => {
      const user = users?.find((u: any) => u.id === userId);
      return {
        user_id: userId,
        username: user?.username || user?.display_name || user?.email?.split('@')[0] || userId.slice(0, 8),
        total_tokens: userTokenMap[userId],
      };
    });
  }

  const personalityUserMap: Record<string, number> = {};
  personalityUsageLogs.forEach((l: any) => {
    if (!l.user_id) return;
    personalityUserMap[l.user_id] = (personalityUserMap[l.user_id] || 0) + 1;
  });

  const personalityTopUserIds = Object.entries(personalityUserMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId]) => userId);

  let personalityTopUsers: Array<{ user_id: string; username: string; analysis_count: number }> = [];
  if (personalityTopUserIds.length > 0) {
    const userSelect = region === 'CN' ? 'id, username, display_name, email' : 'id, username, email';
    const { data: personalityUsers } = await db
      .from('users')
      .select(userSelect)
      .in('id', personalityTopUserIds);

    personalityTopUsers = personalityTopUserIds.map(userId => {
      const user = personalityUsers?.find((u: any) => u.id === userId);
      return {
        user_id: userId,
        username: user?.username || user?.display_name || user?.email?.split('@')[0] || userId.slice(0, 8),
        analysis_count: personalityUserMap[userId] || 0,
      };
    });
  }

  const { data: usageLimits, error: usageLimitsError } = await db
    .from('ai_usage_limits')
    .select('daily_analysis_count, total_chat_count');

  const totalChatCount = usageLimits?.reduce((sum: number, u: any) => sum + (u.total_chat_count || 0), 0) || 0;
  if (usageLimitsError) {
    errors.push('ai_usage_limits 查询失败');
  }

  const monthlyUsageWithAssistant = monthlyTokenUsage + assistantTokens;
  const totalTokensWithLogs = totalTokenUsage + allUsageLogs.reduce((sum: number, l: any) => sum + (l.tokens_used || 0), 0);

  return {
    budget: {
      monthly_limit: MONTHLY_TOKEN_BUDGET,
      monthly_usage: monthlyUsageWithAssistant,
      usage_percent: Math.round((monthlyUsageWithAssistant / MONTHLY_TOKEN_BUDGET) * 10000) / 100,
      is_warning: monthlyUsageWithAssistant / MONTHLY_TOKEN_BUDGET >= BUDGET_WARNING_THRESHOLD,
      is_over_budget: monthlyUsageWithAssistant / MONTHLY_TOKEN_BUDGET >= 1,
      warning_threshold: BUDGET_WARNING_THRESHOLD * 100,
    },
    overview: {
      total_sessions: totalSessions + assistantSessions,
      total_tokens: totalTokensWithLogs,
      unique_users: new Set(
        [...allSessions.map((s: any) => s.user_id), ...allUsageLogs.map((l: any) => l.user_id)].filter(Boolean)
      ).size,
      total_analysis_count: totalPersonalityCount,
      total_chat_count: totalChatCount,
      assistant_tokens: assistantTokens,
      assistant_sessions: assistantSessions,
    },
    sessions_by_type: sessionsByType,
    daily_stats: dailyStats,
    top_users: topUsers,
    personality: {
      total_count: totalPersonalityCount,
      monthly_count: monthlyPersonalityCount,
      today_count: todayPersonalityCount,
      daily_trend: personalityDailyStats,
      top_users: personalityTopUsers,
    },
    errors,
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const requestedRegion = parseAiRegion(url.searchParams.get('region'));
    const defaultRegion = getDeploymentRegionFromRequest(request);
    const region: AiRegion = requestedRegion || defaultRegion;

    const isInternal = isInternalProxyRequest(request);

    if (!isInternal) {
      const hasAdminSession = await verifyAdminSessionFromCookie(request);
      if (!hasAdminSession) {
        const authHeader = request.headers.get('authorization') || '';
        const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        if (!bearerToken) {
          return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const { isAdmin } = await verifyAdmin(bearerToken);
        if (!isAdmin) {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    const proxyHop = request.headers.get('x-ai-stats-proxy-hop') || '';
    const canServeRequestedRegion = region === 'CN' ? hasCnDbConfig() : hasIntlDbConfig();
    const shouldProxy = proxyHop !== '1' && !canServeRequestedRegion;

    if (shouldProxy) {
      const targetOrigin = getOriginForRegion(region);
      const targetUrl = new URL('/api/admin/ai/stats', targetOrigin);
      targetUrl.searchParams.set('region', region);

      const headers = new Headers();
      headers.set('x-ai-stats-proxy-hop', '1');

      const proxySecret = process.env.AI_STATS_PROXY_SECRET;
      if (!proxySecret) {
        return NextResponse.json(
          {
            success: false,
            error: `未配置 ${region} 环境数据库，且未设置 AI_STATS_PROXY_SECRET，无法跨环境代理请求`,
          },
          { status: 501 }
        );
      }

      headers.set('x-ai-stats-proxy-secret', proxySecret);

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
    const stats = await computeAiStats(db, region);

    return NextResponse.json({
      success: true,
      region,
      ...stats,
    });
  } catch (error) {
    console.error('AI stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
