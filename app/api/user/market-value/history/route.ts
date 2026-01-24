import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient } from '@/lib/db-client';
import { AuthError, jsonAuthError, requireUser } from '@/lib/auth/requireUser';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireUser(request);
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limitRaw = limitParam ? Number(limitParam) : 30;
    const limit = Number.isFinite(limitRaw) ? Math.min(365, Math.max(1, Math.floor(limitRaw))) : 30;

    const db = await getServiceDbClient();
    const { data, error } = await db
      .from('user_market_value_score_history')
      .select('id,user_id,total_score,percentile,score_breakdown,calculated_at,version,algorithm')
      .eq('user_id', authUser.userId)
      .order('calculated_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch score history' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonAuthError(err);
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

