import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';

export const dynamic = 'force-dynamic';

/**
 * 从请求中获取 CN 环境的用户 ID
 */
function getCnUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length);
    if (token.startsWith('cn_')) {
      const userId = token.substring(3);
      return userId || null;
    }
  }

  const cnSession =
    request.cookies.get('cn_session')?.value || request.cookies.get('cn_session_cross')?.value;
  return cnSession || null;
}

export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null;

    // CN 环境认证
    if (isChinaDeployment()) {
      userId = getCnUserId(request);
      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    } else {
      // INTL 环境使用 Supabase 认证
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      userId = user.id;
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    // 使用统一的数据库客户端
    const db = await getServiceDbClient();

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