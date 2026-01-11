import { createClient } from '@/lib/supabase/server';

// Credit consumption costs based on PRD v2.0
export const CREDIT_COSTS = {
  LIKE: 5,          // 普通喜欢
  SUPER_LIKE: 10,   // 超级喜欢
  REWIND: 2,        // 撤销操作
  BOOST: 2,         // 曝光加速 (30分钟)
  VIEW_LIKER: 5,    // 查看谁喜欢我
  MESSAGE: 1,       // 发送消息 (非匹配用户)
  // Legacy
  MATCH: 10,        // 兼容旧版匹配消费
} as const;

export type CreditConsumeType =
  | 'like'
  | 'super_like'
  | 'rewind'
  | 'boost'
  | 'view_liker'
  | 'message'
  | 'match'; // legacy

// Transaction type mapping
export const CREDIT_TRANSACTION_TYPES: Record<CreditConsumeType, string> = {
  like: 'credit_consume_like',
  super_like: 'credit_consume_super_like',
  rewind: 'credit_consume_rewind',
  boost: 'credit_consume_boost',
  view_liker: 'credit_consume_view_liker',
  message: 'credit_consume_message',
  match: 'credit_consume_match', // legacy
};

// Action descriptions for transaction records
export const CREDIT_ACTION_DESCRIPTIONS: Record<CreditConsumeType, { en: string; zh: string }> = {
  like: { en: 'Like action', zh: '喜欢操作' },
  super_like: { en: 'Super Like action', zh: '超级喜欢操作' },
  rewind: { en: 'Rewind action', zh: '撤销操作' },
  boost: { en: 'Profile Boost (30min)', zh: '曝光加速 (30分钟)' },
  view_liker: { en: 'View who liked me', zh: '查看谁喜欢我' },
  message: { en: 'Send message', zh: '发送消息' },
  match: { en: 'Match action', zh: '匹配操作' }, // legacy
};

interface CreditsResult {
  success: boolean;
  newBalance?: number;
  error?: string;
}

/**
 * Get user's current credits balance
 */
export async function getCreditsBalance(userId: string): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('credits')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Failed to get credits balance:', error);
    return 0;
  }

  return data?.credits || 0;
}

/**
 * Check if user has enough credits
 */
export async function checkCredits(userId: string, required: number): Promise<boolean> {
  const balance = await getCreditsBalance(userId);
  return balance >= required;
}

/**
 * Get credit cost for a specific action
 */
export function getCreditCost(action: CreditConsumeType): number {
  switch (action) {
    case 'like':
      return CREDIT_COSTS.LIKE;
    case 'super_like':
      return CREDIT_COSTS.SUPER_LIKE;
    case 'rewind':
      return CREDIT_COSTS.REWIND;
    case 'boost':
      return CREDIT_COSTS.BOOST;
    case 'view_liker':
      return CREDIT_COSTS.VIEW_LIKER;
    case 'message':
      return CREDIT_COSTS.MESSAGE;
    case 'match':
      return CREDIT_COSTS.MATCH;
    default:
      return 0;
  }
}

/**
 * Check if user has enough credits for a specific action
 */
export async function checkCreditsForAction(
  userId: string,
  action: CreditConsumeType
): Promise<{ hasCredits: boolean; required: number; balance: number }> {
  const required = getCreditCost(action);
  const balance = await getCreditsBalance(userId);

  return {
    hasCredits: balance >= required,
    required,
    balance,
  };
}

/**
 * Consume credits for a specific action
 */
export async function consumeCredits(
  userId: string,
  amount: number,
  type: CreditConsumeType,
  referenceId?: string,
  description?: string
): Promise<CreditsResult> {
  const supabase = createClient();

  // Determine the transaction type
  const transactionType = CREDIT_TRANSACTION_TYPES[type] || 'credit_consume_match';
  const defaultDescription = CREDIT_ACTION_DESCRIPTIONS[type]?.zh || '积分消费';

  // Use the database function to consume credits atomically
  const { data, error } = await supabase.rpc('consume_user_credits_v2', {
    p_user_id: userId,
    p_amount: amount,
    p_type: transactionType,
    p_reference_id: referenceId || null,
    p_description: description || defaultDescription,
  });

  if (error) {
    // Fallback to old function if v2 doesn't exist
    const { data: oldData, error: oldError } = await supabase.rpc('consume_user_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_type: type === 'match' || type === 'like' || type === 'super_like' ? 'credit_consume_match' : 'credit_consume_message',
      p_reference_id: referenceId || null,
      p_description: description || defaultDescription,
    });

    if (oldError) {
      console.error('Failed to consume credits:', oldError);
      return {
        success: false,
        error: oldError.message,
      };
    }

    const oldResult = oldData?.[0];
    if (!oldResult?.success) {
      return {
        success: false,
        error: oldResult?.error_message || '积分扣除失败',
      };
    }

    return {
      success: true,
      newBalance: oldResult.new_balance,
    };
  }

  // The RPC returns a table, get the first row
  const result = data?.[0];

  if (!result?.success) {
    return {
      success: false,
      error: result?.error_message || '积分扣除失败',
    };
  }

  return {
    success: true,
    newBalance: result.new_balance,
  };
}

/**
 * Consume credits for matching
 */
export async function consumeCreditsForMatch(
  userId: string,
  matchId?: string
): Promise<CreditsResult> {
  return consumeCredits(userId, CREDIT_COSTS.MATCH, 'match', matchId);
}

/**
 * Consume credits for sending a message
 */
export async function consumeCreditsForMessage(
  userId: string,
  messageId?: string
): Promise<CreditsResult> {
  return consumeCredits(userId, CREDIT_COSTS.MESSAGE, 'message', messageId);
}

/**
 * Consume credits for like action (5 credits)
 */
export async function consumeCreditsForLike(
  userId: string,
  swipeId?: string
): Promise<CreditsResult> {
  return consumeCredits(userId, CREDIT_COSTS.LIKE, 'like', swipeId);
}

/**
 * Consume credits for super like action (10 credits)
 */
export async function consumeCreditsForSuperLike(
  userId: string,
  swipeId?: string
): Promise<CreditsResult> {
  return consumeCredits(userId, CREDIT_COSTS.SUPER_LIKE, 'super_like', swipeId);
}

/**
 * Consume credits for rewind action (2 credits)
 */
export async function consumeCreditsForRewind(
  userId: string,
  swipeId?: string
): Promise<CreditsResult> {
  return consumeCredits(userId, CREDIT_COSTS.REWIND, 'rewind', swipeId);
}

/**
 * Consume credits for boost action (2 credits)
 */
export async function consumeCreditsForBoost(
  userId: string,
  boostId?: string
): Promise<CreditsResult> {
  return consumeCredits(userId, CREDIT_COSTS.BOOST, 'boost', boostId);
}

/**
 * Consume credits for viewing who liked me (5 credits)
 */
export async function consumeCreditsForViewLiker(
  userId: string
): Promise<CreditsResult> {
  return consumeCredits(userId, CREDIT_COSTS.VIEW_LIKER, 'view_liker');
}

/**
 * Add credits to user (after successful payment)
 */
export async function addCredits(
  userId: string,
  amount: number,
  paymentId: string
): Promise<CreditsResult> {
  const supabase = createClient();

  // Use the database function to add credits atomically
  const { data, error } = await supabase.rpc('add_user_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_payment_id: paymentId,
    p_description: '购买积分包',
  });

  if (error) {
    console.error('Failed to add credits:', error);
    return {
      success: false,
      error: error.message,
    };
  }

  // The RPC returns a table, get the first row
  const result = data?.[0];

  if (!result?.success) {
    return {
      success: false,
      error: result?.error_message || '积分添加失败',
    };
  }

  return {
    success: true,
    newBalance: result.new_balance,
  };
}

/**
 * Get user's transaction history
 */
export async function getTransactionHistory(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    balance_after: number;
    description: string;
    created_at: string;
  }>;
  total: number;
}> {
  const supabase = createClient();

  // Get transactions
  const { data, error, count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Failed to get transaction history:', error);
    return { transactions: [], total: 0 };
  }

  return {
    transactions: data || [],
    total: count || 0,
  };
}

/**
 * Check and consume credits for an action, returning appropriate error if insufficient
 */
export async function checkAndConsumeCredits(
  userId: string,
  action: CreditConsumeType,
  referenceId?: string
): Promise<{
  success: boolean;
  newBalance?: number;
  error?: string;
  errorCode?: 'INSUFFICIENT_CREDITS' | 'SYSTEM_ERROR';
}> {
  const cost = getCreditCost(action);

  // First check if user has enough credits
  const { hasCredits, balance, required } = await checkCreditsForAction(userId, action);

  if (!hasCredits) {
    return {
      success: false,
      error: `积分不足。需要 ${required} 积分，当前余额 ${balance} 积分`,
      errorCode: 'INSUFFICIENT_CREDITS',
    };
  }

  // Consume credits
  const result = await consumeCredits(userId, cost, action, referenceId);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      errorCode: 'SYSTEM_ERROR',
    };
  }

  return {
    success: true,
    newBalance: result.newBalance,
  };
}
