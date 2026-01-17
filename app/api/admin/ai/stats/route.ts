/**
 * AI 统计 API (管理员)
 * AI Stats API (Admin)
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Monthly budget in tokens (configurable)
const MONTHLY_TOKEN_BUDGET = parseInt(process.env.AI_MONTHLY_TOKEN_BUDGET || '1000000');
const BUDGET_WARNING_THRESHOLD = 0.8; // 80%

// INTL 环境
function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
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
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { isAdmin } = await verifyAdmin(authHeader.split(' ')[1]);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const db = await getServiceDbClient();

    // Get all AI chat sessions
    const { data: sessions, error: sessionsError } = await db
      .from('ai_chat_sessions')
      .select('id, user_id, session_type, model_used, token_usage, created_at');

    if (sessionsError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch sessions' }, { status: 500 });
    }

    const allSessions = sessions || [];

    // Calculate current month stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSessions = allSessions.filter((s: any) => new Date(s.created_at) >= monthStart);
    const monthlyTokenUsage = monthSessions.reduce((sum: number, s: any) => sum + (s.token_usage || 0), 0);

    // Budget status
    const budgetUsagePercent = (monthlyTokenUsage / MONTHLY_TOKEN_BUDGET) * 100;

    // Total stats
    const totalTokenUsage = allSessions.reduce((sum: number, s: any) => sum + (s.token_usage || 0), 0);
    const totalSessions = allSessions.length;

    // Get AI usage logs
    const { data: usageLogs } = await db
      .from('ai_usage_logs')
      .select('user_id, feature, tokens_used, created_at');

    const allUsageLogs = usageLogs || [];
    const monthUsageLogs = allUsageLogs.filter((l: any) => new Date(l.created_at) >= monthStart);
    const assistantTokens = monthUsageLogs
      .filter((l: any) => l.feature === 'assistant')
      .reduce((sum: number, l: any) => sum + (l.tokens_used || 0), 0);

    const assistantSessions = allUsageLogs.filter((l: any) => l.feature === 'assistant').length;

    // Sessions by type
    const sessionsByType = {
      free_trial: allSessions.filter((s: any) => s.session_type === 'free_trial').length,
      vip_unlimited: allSessions.filter((s: any) => s.session_type === 'vip_unlimited').length,
      assistant: assistantSessions,
    };

    // Daily stats for past 30 days
    const dailyStats: Array<{ date: string; sessions: number; tokens: number }> = [];
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
    }

    // Top users by token usage
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
      const { data: users } = await db
        .from('users')
        .select('id, username, email')
        .in('id', topUserIds);

      topUsers = topUserIds.map(userId => {
        const user = users?.find((u: any) => u.id === userId);
        return {
          user_id: userId,
          username: user?.username || user?.email?.split('@')[0] || userId.slice(0, 8),
          total_tokens: userTokenMap[userId],
        };
      });
    }

    // Get AI usage limits stats
    const { data: usageLimits } = await db
      .from('ai_usage_limits')
      .select('daily_analysis_count, total_chat_count');

    const totalAnalysisCount = usageLimits?.reduce((sum: number, u: any) => sum + (u.daily_analysis_count || 0), 0) || 0;
    const totalChatCount = usageLimits?.reduce((sum: number, u: any) => sum + (u.total_chat_count || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      budget: {
        monthly_limit: MONTHLY_TOKEN_BUDGET,
        monthly_usage: monthlyTokenUsage + assistantTokens,
        usage_percent: Math.round(((monthlyTokenUsage + assistantTokens) / MONTHLY_TOKEN_BUDGET) * 10000) / 100,
        is_warning: ((monthlyTokenUsage + assistantTokens) / MONTHLY_TOKEN_BUDGET) >= BUDGET_WARNING_THRESHOLD,
        is_over_budget: ((monthlyTokenUsage + assistantTokens) / MONTHLY_TOKEN_BUDGET) >= 1,
        warning_threshold: BUDGET_WARNING_THRESHOLD * 100,
      },
      overview: {
        total_sessions: totalSessions + assistantSessions,
        total_tokens: totalTokenUsage + allUsageLogs.reduce((sum, l) => sum + (l.tokens_used || 0), 0),
        unique_users: new Set([...allSessions.map(s => s.user_id), ...allUsageLogs.map(l => l.user_id)]).size,
        total_analysis_count: totalAnalysisCount,
        total_chat_count: totalChatCount,
        assistant_tokens: assistantTokens,
        assistant_sessions: assistantSessions,
      },
      sessions_by_type: sessionsByType,
      daily_stats: dailyStats,
      top_users: topUsers,
    });
  } catch (error) {
    console.error('AI stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
