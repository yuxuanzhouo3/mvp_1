/**
 * 积分历史 API
 * Credits History API
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db-client';
import { getTransactionHistory } from '@/lib/credits/credits';

/**
 * GET /api/credits/history
 * Get user's credits transaction history
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDbClient();

    // Get current user
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get transaction history
    const { transactions, total } = await getTransactionHistory(user.id, limit, offset);

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          balanceAfter: t.balance_after,
          description: t.description,
          createdAt: t.created_at,
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    console.error('Credits history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
