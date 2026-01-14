import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Monthly budget in tokens (configurable)
const MONTHLY_TOKEN_BUDGET = parseInt(process.env.AI_MONTHLY_TOKEN_BUDGET || '1000000');
const BUDGET_WARNING_THRESHOLD = 0.8; // 80%

async function verifyAdmin(token: string): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return { isAdmin: false };

    const { data: adminRole } = await supabaseAdmin
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    return adminRole ? { isAdmin: true, userId: user.id } : { isAdmin: false };
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

    // Get all AI chat sessions
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('ai_chat_sessions')
      .select('id, user_id, session_type, model_used, token_usage, created_at');

    if (sessionsError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch sessions' }, { status: 500 });
    }

    const allSessions = sessions || [];

    // Calculate current month stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSessions = allSessions.filter(s => new Date(s.created_at) >= monthStart);
    const monthlyTokenUsage = monthSessions.reduce((sum, s) => sum + (s.token_usage || 0), 0);

    // Budget status
    const budgetUsagePercent = (monthlyTokenUsage / MONTHLY_TOKEN_BUDGET) * 100;
    const isOverBudget = budgetUsagePercent >= 100;
    const isWarning = budgetUsagePercent >= BUDGET_WARNING_THRESHOLD * 100;

    // Total stats
    const totalTokenUsage = allSessions.reduce((sum, s) => sum + (s.token_usage || 0), 0);
    const totalSessions = allSessions.length;
    const uniqueUsers = new Set(allSessions.map(s => s.user_id)).size;

    // Sessions by type
    const sessionsByType = {
      free_trial: allSessions.filter(s => s.session_type === 'free_trial').length,
      vip_unlimited: allSessions.filter(s => s.session_type === 'vip_unlimited').length,
    };

    // Daily stats for past 30 days
    const dailyStats: Array<{ date: string; sessions: number; tokens: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const daySessions = allSessions.filter(s => s.created_at.split('T')[0] === dateStr);
      dailyStats.push({
        date: dateStr,
        sessions: daySessions.length,
        tokens: daySessions.reduce((sum, s) => sum + (s.token_usage || 0), 0),
      });
    }

    // Top users by token usage
    const userTokenMap: Record<string, number> = {};
    allSessions.forEach(s => {
      userTokenMap[s.user_id] = (userTokenMap[s.user_id] || 0) + (s.token_usage || 0);
    });

    const topUserIds = Object.entries(userTokenMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId]) => userId);

    let topUsers: Array<{ user_id: string; username: string; total_tokens: number }> = [];
    if (topUserIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, username, email')
        .in('id', topUserIds);

      topUsers = topUserIds.map(userId => {
        const user = users?.find(u => u.id === userId);
        return {
          user_id: userId,
          username: user?.username || user?.email?.split('@')[0] || userId.slice(0, 8),
          total_tokens: userTokenMap[userId],
        };
      });
    }

    // Get AI usage logs (includes AI Assistant)
    const { data: usageLogs } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('user_id, feature, tokens_used, created_at');

    const allUsageLogs = usageLogs || [];
    const monthUsageLogs = allUsageLogs.filter(l => new Date(l.created_at) >= monthStart);
    const assistantTokens = monthUsageLogs
      .filter(l => l.feature === 'assistant')
      .reduce((sum, l) => sum + (l.tokens_used || 0), 0);

    // Get AI usage limits stats
    const { data: usageLimits } = await supabaseAdmin
      .from('ai_usage_limits')
      .select('daily_analysis_count, total_chat_count');

    const totalAnalysisCount = usageLimits?.reduce((sum, u) => sum + (u.daily_analysis_count || 0), 0) || 0;
    const totalChatCount = usageLimits?.reduce((sum, u) => sum + (u.total_chat_count || 0), 0) || 0;

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
        total_sessions: totalSessions,
        total_tokens: totalTokenUsage + allUsageLogs.reduce((sum, l) => sum + (l.tokens_used || 0), 0),
        unique_users: uniqueUsers,
        total_analysis_count: totalAnalysisCount,
        total_chat_count: totalChatCount,
        assistant_tokens: assistantTokens,
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
