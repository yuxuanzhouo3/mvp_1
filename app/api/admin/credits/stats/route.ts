import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering to avoid caching issues
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function verifyAdmin(token: string): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return { isAdmin: false };
    }

    const { data: adminRole, error: adminError } = await supabaseAdmin
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError || !adminRole) {
      return { isAdmin: false };
    }

    return { isAdmin: true, userId: user.id };
  } catch (err) {
    return { isAdmin: false };
  }
}

// Define transaction type labels
const transactionTypeLabels: Record<string, string> = {
  credit_purchase: '购买积分',
  credit_consume_like: '喜欢消费',
  credit_consume_super_like: '超级喜欢消费',
  credit_consume_rewind: '撤销消费',
  credit_consume_boost: '曝光加速消费',
  credit_consume_view_liker: '查看谁喜欢我',
  credit_consume_message: '发送消息消费',
  credit_consume_match: '匹配消费',
  membership_grant: '会员月度赠送',
  bonus_grant: '套餐赠送',
  refund: '退款',
  admin_adjust: '管理员调整',
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { isAdmin } = await verifyAdmin(token);

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Get all transactions
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from('transactions')
      .select('id, user_id, type, amount, balance_before, balance_after, created_at');

    if (transactionsError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch transactions' }, { status: 500 });
    }

    const allTransactions = transactions || [];

    // Calculate total issued credits (positive transactions)
    const issuedTransactions = allTransactions.filter(t => t.amount > 0);
    const totalCreditsIssued = issuedTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate total consumed credits (negative transactions)
    const consumedTransactions = allTransactions.filter(t => t.amount < 0);
    const totalCreditsConsumed = consumedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Calculate credits by type
    const creditsByType: Record<string, { count: number; total: number }> = {};
    allTransactions.forEach(t => {
      if (!creditsByType[t.type]) {
        creditsByType[t.type] = { count: 0, total: 0 };
      }
      creditsByType[t.type].count++;
      creditsByType[t.type].total += Math.abs(t.amount);
    });

    // Separate issue and consume stats
    const issueStats = Object.entries(creditsByType)
      .filter(([type]) => ['credit_purchase', 'membership_grant', 'bonus_grant', 'admin_adjust'].includes(type))
      .map(([type, stats]) => ({
        type,
        label: transactionTypeLabels[type] || type,
        count: stats.count,
        total: stats.total,
      }))
      .sort((a, b) => b.total - a.total);

    const consumeStats = Object.entries(creditsByType)
      .filter(([type]) => type.startsWith('credit_consume_'))
      .map(([type, stats]) => ({
        type,
        label: transactionTypeLabels[type] || type,
        count: stats.count,
        total: stats.total,
        percentage: totalCreditsConsumed > 0 ? (stats.total / totalCreditsConsumed) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Get user credits distribution
    const { data: userProfiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, credits');

    if (profilesError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch user profiles' }, { status: 500 });
    }

    const profiles = userProfiles || [];
    const totalCurrentCredits = profiles.reduce((sum, p) => sum + (p.credits || 0), 0);
    const usersWithCredits = profiles.filter(p => (p.credits || 0) > 0).length;
    const totalUsers = profiles.length;

    // Credit distribution buckets
    const distribution = {
      zero: profiles.filter(p => (p.credits || 0) === 0).length,
      '1-50': profiles.filter(p => (p.credits || 0) >= 1 && (p.credits || 0) <= 50).length,
      '51-100': profiles.filter(p => (p.credits || 0) >= 51 && (p.credits || 0) <= 100).length,
      '101-200': profiles.filter(p => (p.credits || 0) >= 101 && (p.credits || 0) <= 200).length,
      '201-500': profiles.filter(p => (p.credits || 0) >= 201 && (p.credits || 0) <= 500).length,
      '500+': profiles.filter(p => (p.credits || 0) > 500).length,
    };

    // Daily transactions for the past 30 days
    const dailyStats: Array<{ date: string; issued: number; consumed: number; net: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayTransactions = allTransactions.filter(t => {
        const txDate = t.created_at.split('T')[0];
        return txDate === dateStr;
      });

      const issued = dayTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

      const consumed = dayTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      dailyStats.push({
        date: dateStr,
        issued,
        consumed,
        net: issued - consumed,
      });
    }

    // Top consumers
    const userConsumeMap: Record<string, number> = {};
    consumedTransactions.forEach(t => {
      userConsumeMap[t.user_id] = (userConsumeMap[t.user_id] || 0) + Math.abs(t.amount);
    });

    const topConsumerIds = Object.entries(userConsumeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId]) => userId);

    let topConsumers: Array<{ user_id: string; username: string; total_consumed: number }> = [];
    if (topConsumerIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, username, email')
        .in('id', topConsumerIds);

      topConsumers = topConsumerIds.map(userId => {
        const user = users?.find(u => u.id === userId);
        return {
          user_id: userId,
          username: user?.username || user?.email?.split('@')[0] || userId.slice(0, 8),
          total_consumed: userConsumeMap[userId],
        };
      });
    }

    return NextResponse.json({
      success: true,
      overview: {
        total_credits_issued: totalCreditsIssued,
        total_credits_consumed: totalCreditsConsumed,
        total_current_credits: totalCurrentCredits,
        total_users: totalUsers,
        users_with_credits: usersWithCredits,
        average_credits_per_user: totalUsers > 0 ? Math.round(totalCurrentCredits / totalUsers) : 0,
      },
      issue_stats: issueStats,
      consume_stats: consumeStats,
      distribution,
      daily_stats: dailyStats,
      top_consumers: topConsumers,
    });

  } catch (error) {
    console.error('Credits stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
