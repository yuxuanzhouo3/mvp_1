/**
 * Transactions Summary API - 交易汇总
 * GET /api/transactions/summary - 获取交易汇总统计
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/transactions/summary
 * Get user's transaction summary:
 * - Total credits purchased
 * - Total credits consumed
 * - Remaining credits
 * - Consumption breakdown by type
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's current balance
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to get user profile:', profileError);
    }

    const currentBalance = profile?.credits || 0;

    // Get total credits purchased (positive amounts)
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .gt('amount', 0);

    if (purchaseError) {
      console.error('Failed to get purchase data:', purchaseError);
    }

    const totalPurchased = (purchaseData || []).reduce((sum, t) => sum + t.amount, 0);

    // Get total credits consumed (negative amounts)
    const { data: consumeData, error: consumeError } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('user_id', user.id)
      .lt('amount', 0);

    if (consumeError) {
      console.error('Failed to get consume data:', consumeError);
    }

    const totalConsumed = Math.abs((consumeData || []).reduce((sum, t) => sum + t.amount, 0));

    // Calculate consumption by type
    const consumptionByType: Record<string, number> = {};
    (consumeData || []).forEach(t => {
      const typeName = t.type || 'other';
      if (!consumptionByType[typeName]) {
        consumptionByType[typeName] = 0;
      }
      consumptionByType[typeName] += Math.abs(t.amount);
    });

    // Calculate percentage for each type
    const consumptionBreakdown = Object.entries(consumptionByType).map(([type, amount]) => ({
      type,
      amount,
      percentage: totalConsumed > 0 ? Math.round((amount / totalConsumed) * 100) : 0,
      label: getTypeLabel(type),
    })).sort((a, b) => b.amount - a.amount);

    // Get total payment amount (in USD and CNY)
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select('amount, currency')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    if (paymentError) {
      console.error('Failed to get payment data:', paymentError);
    }

    let totalPaymentUSD = 0;
    let totalPaymentCNY = 0;
    (paymentData || []).forEach(p => {
      if (p.currency === 'CNY') {
        totalPaymentCNY += p.amount;
      } else {
        totalPaymentUSD += p.amount;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        currentBalance,
        totalPurchased,
        totalConsumed,
        totalPayments: {
          usd: totalPaymentUSD,
          cny: totalPaymentCNY,
        },
        consumptionBreakdown,
        summary: {
          remainingCredits: currentBalance,
          lifetimeCreditsEarned: totalPurchased,
          lifetimeCreditsSpent: totalConsumed,
        },
      },
    });
  } catch (error) {
    console.error('Transactions summary API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get human-readable label for transaction type
 */
function getTypeLabel(type: string): { en: string; zh: string } {
  const labels: Record<string, { en: string; zh: string }> = {
    credit_purchase: { en: 'Credit Purchase', zh: '积分购买' },
    credit_consume_like: { en: 'Like', zh: '喜欢' },
    credit_consume_super_like: { en: 'Super Like', zh: '超级喜欢' },
    credit_consume_rewind: { en: 'Rewind', zh: '撤销' },
    credit_consume_boost: { en: 'Boost', zh: '曝光加速' },
    credit_consume_view_liker: { en: 'View Likers', zh: '查看喜欢我的人' },
    credit_consume_message: { en: 'Message', zh: '发送消息' },
    credit_consume_match: { en: 'Match', zh: '匹配' },
    membership_grant: { en: 'Membership Bonus', zh: '会员赠送' },
    bonus_grant: { en: 'Bonus Credits', zh: '赠送积分' },
    refund: { en: 'Refund', zh: '退款' },
    admin_adjust: { en: 'Admin Adjustment', zh: '管理员调整' },
  };

  return labels[type] || { en: type, zh: type };
}
