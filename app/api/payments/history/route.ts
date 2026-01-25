import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClientFromRequest } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireUser(request);
    const userId = authUser.userId;

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    // 使用统一的数据库客户端
    const db = await getServiceDbClientFromRequest(request);

    // Build query
    let query = db
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: payments, error: paymentsError } = await query;

    if (paymentsError) {
      console.error('Failed to fetch payments:', paymentsError);
      return NextResponse.json(
        { error: 'Failed to fetch payment history' },
        { status: 500 }
      );
    }

    // 转换字段名（Cloudbase 使用 _id，需要统一为 id）
    const normalizedPayments = (payments || []).map((p: any) => ({
      id: p.id || p._id,
      user_id: p.user_id,
      amount: p.amount,
      currency: p.currency,
      credits: p.credits,
      payment_method: p.payment_method || p.method,
      status: p.status,
      created_at: p.created_at,
      updated_at: p.updated_at,
      completed_at: p.completed_at,
      metadata: p.metadata,
    }));

    // Get total count for pagination
    const countQuery = db
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);
    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      payments: normalizedPayments,
      pagination: {
        limit,
        offset,
        total: totalCount || 0,
        hasMore: (offset + limit) < (totalCount || 0),
      },
    });
  } catch (error) {
    console.error('Payment history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
