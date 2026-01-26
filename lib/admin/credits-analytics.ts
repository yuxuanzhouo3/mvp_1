export type CreditsStatsPayload = {
  overview: {
    total_credits_issued: number;
    total_credits_consumed: number;
    total_current_credits: number;
    total_users: number;
    users_with_credits: number;
    average_credits_per_user: number;
  };
  issue_stats: Array<{
    type: string;
    label: string;
    count: number;
    total: number;
  }>;
  consume_stats: Array<{
    type: string;
    label: string;
    count: number;
    total: number;
    percentage: number;
  }>;
  distribution: {
    zero: number;
    '1-50': number;
    '51-100': number;
    '101-200': number;
    '201-500': number;
    '500+': number;
  };
  daily_stats: Array<{
    date: string;
    issued: number;
    consumed: number;
    net: number;
  }>;
  top_consumers: Array<{
    user_id: string;
    username: string;
    total_consumed: number;
  }>;
};

export const creditsTransactionTypeLabels: Record<string, string> = {
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

export function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function aggregateCreditsStats(params: {
  transactions: any[];
  profiles: Array<{ user_id: string; credits: number }>;
  users: any[];
  labels?: Record<string, string>;
  now?: Date;
}): CreditsStatsPayload {
  const { transactions, profiles, users } = params;
  const labels = params.labels || creditsTransactionTypeLabels;
  const now = params.now || new Date();

  const issuedByType: Record<string, { count: number; total: number }> = {};
  const consumedByType: Record<string, { count: number; total: number }> = {};

  for (const t of transactions) {
    const type = String(t?.type || 'unknown');
    const amount = toNumber(t?.amount);
    if (amount > 0) {
      if (!issuedByType[type]) issuedByType[type] = { count: 0, total: 0 };
      issuedByType[type].count += 1;
      issuedByType[type].total += amount;
    } else if (amount < 0) {
      if (!consumedByType[type]) consumedByType[type] = { count: 0, total: 0 };
      consumedByType[type].count += 1;
      consumedByType[type].total += Math.abs(amount);
    }
  }

  const issuedTransactions = transactions.filter((t: any) => toNumber(t.amount) > 0);
  const totalCreditsIssued = issuedTransactions.reduce(
    (sum: number, t: any) => sum + toNumber(t.amount),
    0
  );

  const consumedTransactions = transactions.filter((t: any) => toNumber(t.amount) < 0);
  const totalCreditsConsumed = consumedTransactions.reduce(
    (sum: number, t: any) => sum + Math.abs(toNumber(t.amount)),
    0
  );

  const issueStats = Object.entries(issuedByType)
    .filter(([type]) =>
      ['credit_purchase', 'membership_grant', 'bonus_grant', 'refund', 'admin_adjust'].includes(type)
    )
    .map(([type, stats]) => ({
      type,
      label: labels[type] || type,
      count: stats.count,
      total: stats.total,
    }))
    .sort((a, b) => b.total - a.total);

  const featureConsumeStats = Object.entries(consumedByType)
    .filter(([type]) => type.startsWith('credit_consume_'))
    .map(([type, stats]) => ({
      type,
      label: labels[type] || type,
      count: stats.count,
      total: stats.total,
    }))
    .sort((a, b) => b.total - a.total);

  const featureConsumedTotal = featureConsumeStats.reduce((sum, item) => sum + item.total, 0);
  const otherConsumedTotal = Math.max(0, totalCreditsConsumed - featureConsumedTotal);
  const otherConsumedCount = Object.entries(consumedByType)
    .filter(([type]) => !type.startsWith('credit_consume_'))
    .reduce((sum, [, stats]) => sum + stats.count, 0);

  const consumeStats = [
    ...featureConsumeStats.map(item => ({
      ...item,
      percentage: totalCreditsConsumed > 0 ? (item.total / totalCreditsConsumed) * 100 : 0,
    })),
    ...(otherConsumedTotal > 0
      ? [
          {
            type: 'other_consumption',
            label: '其他扣减',
            count: otherConsumedCount,
            total: otherConsumedTotal,
            percentage: totalCreditsConsumed > 0 ? (otherConsumedTotal / totalCreditsConsumed) * 100 : 0,
          },
        ]
      : []),
  ].sort((a, b) => b.total - a.total);

  const totalCurrentCredits = profiles.reduce((sum: number, p: any) => sum + toNumber(p.credits), 0);
  const usersWithCredits = profiles.filter((p: any) => toNumber(p.credits) > 0).length;
  const totalUsers = profiles.length;

  const distribution = {
    zero: profiles.filter((p: any) => toNumber(p.credits) === 0).length,
    '1-50': profiles.filter((p: any) => toNumber(p.credits) >= 1 && toNumber(p.credits) <= 50).length,
    '51-100': profiles.filter((p: any) => toNumber(p.credits) >= 51 && toNumber(p.credits) <= 100).length,
    '101-200': profiles.filter((p: any) => toNumber(p.credits) >= 101 && toNumber(p.credits) <= 200).length,
    '201-500': profiles.filter((p: any) => toNumber(p.credits) >= 201 && toNumber(p.credits) <= 500).length,
    '500+': profiles.filter((p: any) => toNumber(p.credits) > 500).length,
  };

  const start = new Date(now);
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  const byDate = new Map<string, { issued: number; consumed: number }>();
  for (const t of transactions) {
    const createdAt = typeof t.created_at === 'string' ? new Date(t.created_at) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) continue;
    if (createdAt < start) continue;
    const dateStr = createdAt.toISOString().split('T')[0];
    const amount = toNumber(t.amount);
    const current = byDate.get(dateStr) || { issued: 0, consumed: 0 };
    if (amount > 0) current.issued += amount;
    if (amount < 0) current.consumed += Math.abs(amount);
    byDate.set(dateStr, current);
  }

  const dailyStats: Array<{ date: string; issued: number; consumed: number; net: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const day = byDate.get(dateStr) || { issued: 0, consumed: 0 };
    dailyStats.push({
      date: dateStr,
      issued: day.issued,
      consumed: day.consumed,
      net: day.issued - day.consumed,
    });
  }

  const userConsumeMap: Record<string, number> = {};
  consumedTransactions.forEach((t: any) => {
    const userId = String(t.user_id || '');
    if (!userId) return;
    userConsumeMap[userId] = (userConsumeMap[userId] || 0) + Math.abs(toNumber(t.amount));
  });

  const topConsumerIds = Object.entries(userConsumeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId]) => userId);

  const topConsumers = topConsumerIds.map(userId => {
    const user = users?.find((u: any) => u.id === userId);
    const username = user?.username || (typeof user?.email === 'string' ? user.email.split('@')[0] : undefined) || userId.slice(0, 8);
    return {
      user_id: userId,
      username,
      total_consumed: userConsumeMap[userId],
    };
  });

  return {
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
  };
}
