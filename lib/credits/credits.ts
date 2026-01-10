import { createClient } from '@/lib/supabase/server';

// Credit consumption costs
export const CREDIT_COSTS = {
  MATCH: 10, // Credits per match initiation
  MESSAGE: 1, // Credits per message sent
} as const;

export type CreditConsumeType = 'match' | 'message';

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
 * Check if user has enough credits for a specific action
 */
export async function checkCreditsForAction(
  userId: string,
  action: CreditConsumeType
): Promise<{ hasCredits: boolean; required: number; balance: number }> {
  const required = action === 'match' ? CREDIT_COSTS.MATCH : CREDIT_COSTS.MESSAGE;
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
  referenceId?: string
): Promise<CreditsResult> {
  const supabase = createClient();

  // Determine the transaction type
  const transactionType = type === 'match' ? 'credit_consume_match' : 'credit_consume_message';

  // Use the database function to consume credits atomically
  const { data, error } = await supabase.rpc('consume_user_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_type: transactionType,
    p_reference_id: referenceId || null,
    p_description: type === 'match' ? '发起匹配' : '发送消息',
  });

  if (error) {
    console.error('Failed to consume credits:', error);
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
  const cost = action === 'match' ? CREDIT_COSTS.MATCH : CREDIT_COSTS.MESSAGE;

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
