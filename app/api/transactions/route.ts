/**
 * 交易流水 API
 * Transactions API
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, getServiceDbClient } from '@/lib/db-client';

/**
 * GET /api/transactions
 * Get user's transaction history with optional filters
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
    const type = searchParams.get('type'); // Optional type filter
    const startDate = searchParams.get('start_date'); // Optional date range
    const endDate = searchParams.get('end_date');

    // Use service client for data operations
    const serviceDb = await getServiceDbClient();

    // Build query
    let query = serviceDb
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Failed to get transactions:', error);
      return NextResponse.json(
        { error: 'Failed to get transactions' },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { data: allTransactions } = await serviceDb
      .from('transactions')
      .select('id')
      .eq('user_id', user.id);
    
    const count = allTransactions?.length || 0;

    return NextResponse.json({
      success: true,
      data: {
        transactions: (transactions || []).map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          balanceBefore: t.balance_before,
          balanceAfter: t.balance_after,
          referenceType: t.reference_type,
          referenceId: t.reference_id,
          description: t.description,
          createdAt: t.created_at,
        })),
        pagination: {
          total: count,
          limit,
          offset,
          hasMore: (offset + limit) < count,
        },
      },
    });
  } catch (error) {
    console.error('Transactions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
