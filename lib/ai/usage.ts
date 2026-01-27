export type AiUsageLimitType = 'analysis' | 'chat';

export interface AiUsageLimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  is_vip?: boolean;
}

function toIsoDate(value: unknown): string | null {
  if (typeof value === 'string') {
    const t = Date.parse(value);
    if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  }
  try {
    const t = new Date(value as any);
    if (!Number.isNaN(t.getTime())) return t.toISOString().slice(0, 10);
  } catch {}
  return null;
}

async function isVipUser(db: any, userId: string): Promise<boolean> {
  try {
    const { data } = await db
      .from('user_memberships')
      .select('expires_at')
      .eq('user_id', userId)
      .single();

    const expiresAt = data?.expires_at;
    if (!expiresAt) return false;
    const t = Date.parse(String(expiresAt));
    if (Number.isNaN(t)) return false;
    return t > Date.now();
  } catch {
    return false;
  }
}

async function ensureUsageLimitsRow(db: any, userId: string, isVip: boolean) {
  const nowIso = new Date().toISOString();
  const { data: existing } = await db
    .from('ai_usage_limits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) return existing;

  await db.from('ai_usage_limits').insert({
    user_id: userId,
    daily_analysis_count: 0,
    daily_analysis_limit: 3,
    total_chat_count: 0,
    total_chat_limit: isVip ? null : 10,
    last_reset_at: nowIso,
    updated_at: nowIso,
  });

  const { data: created } = await db
    .from('ai_usage_limits')
    .select('*')
    .eq('user_id', userId)
    .single();

  return created;
}

async function resetDailyIfNeeded(db: any, userId: string, row: any) {
  const today = new Date().toISOString().slice(0, 10);
  const lastResetDate = toIsoDate(row?.last_reset_at) || today;
  if (lastResetDate === today) return row;

  const nowIso = new Date().toISOString();
  await db
    .from('ai_usage_limits')
    .update({
      daily_analysis_count: 0,
      last_reset_at: nowIso,
      updated_at: nowIso,
    })
    .eq('user_id', userId);

  const { data: refreshed } = await db
    .from('ai_usage_limits')
    .select('*')
    .eq('user_id', userId)
    .single();

  return refreshed || row;
}

export async function checkAiUsageLimit(
  db: any,
  userId: string,
  limitType: AiUsageLimitType
): Promise<AiUsageLimitCheckResult | null> {
  try {
    if (typeof db?.rpc === 'function') {
      const { data } = await db.rpc('check_ai_usage_limit', {
        p_user_id: userId,
        p_limit_type: limitType,
      });
      if (!data) return null;
      return data as AiUsageLimitCheckResult;
    }
  } catch {}

  try {
    const isVip = await isVipUser(db, userId);
    let row = await ensureUsageLimitsRow(db, userId, isVip);
    row = await resetDailyIfNeeded(db, userId, row);

    if (limitType === 'analysis') {
      const current = typeof row?.daily_analysis_count === 'number' ? row.daily_analysis_count : 0;
      const limit = typeof row?.daily_analysis_limit === 'number' ? row.daily_analysis_limit : 3;
      return { allowed: current < limit, current, limit, is_vip: isVip };
    }

    const current = typeof row?.total_chat_count === 'number' ? row.total_chat_count : 0;
    const limitValue = row?.total_chat_limit;
    if (isVip || limitValue === null) {
      return { allowed: true, current, limit: -1, is_vip: true };
    }
    const limit = typeof limitValue === 'number' ? limitValue : 10;
    return { allowed: current < limit, current, limit, is_vip: isVip };
  } catch {
    return null;
  }
}

export async function deductAiUsage(db: any, userId: string, usageType: AiUsageLimitType): Promise<void> {
  try {
    if (typeof db?.rpc === 'function') {
      await db.rpc('deduct_ai_usage', { p_user_id: userId, p_usage_type: usageType });
      return;
    }
  } catch {}

  const nowIso = new Date().toISOString();
  try {
    if (usageType === 'analysis') {
      const { data } = await db
        .from('ai_usage_limits')
        .select('daily_analysis_count')
        .eq('user_id', userId)
        .single();
      const current = typeof data?.daily_analysis_count === 'number' ? data.daily_analysis_count : 0;
      await db
        .from('ai_usage_limits')
        .update({ daily_analysis_count: current + 1, updated_at: nowIso })
        .eq('user_id', userId);
      return;
    }

    const { data } = await db
      .from('ai_usage_limits')
      .select('total_chat_count')
      .eq('user_id', userId)
      .single();
    const current = typeof data?.total_chat_count === 'number' ? data.total_chat_count : 0;
    await db
      .from('ai_usage_limits')
      .update({ total_chat_count: current + 1, updated_at: nowIso })
      .eq('user_id', userId);
  } catch {}
}

export async function insertAiUsageLog(db: any, row: { user_id: string; feature: string; tokens_used: number; created_at?: string }) {
  try {
    const created_at = typeof row.created_at === 'string' ? row.created_at : new Date().toISOString();
    await db.from('ai_usage_logs').insert({
      user_id: row.user_id,
      feature: row.feature,
      tokens_used: row.tokens_used,
      created_at,
    });
  } catch {}
}

