import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getServiceDbClientFromRequest } from '@/lib/db-client';
import { AuthError, jsonAuthError, requireUser } from '@/lib/auth/requireUser';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireUser(request);
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limitRaw = limitParam ? Number(limitParam) : 30;
    const limit = Number.isFinite(limitRaw) ? Math.min(365, Math.max(1, Math.floor(limitRaw))) : 30;

    const db = await getServiceDbClientFromRequest(request);
    const { data, error } = await db
      .from('user_market_value_score_history')
      .select('id,user_id,total_score,percentile,score_breakdown,calculated_at,version,algorithm')
      .eq('user_id', authUser.userId)
      .order('calculated_at', { ascending: false })
      .limit(limit);

    if (error) {
      const message = (error as any)?.message ? String((error as any).message) : String(error);
      const lowered = message.toLowerCase();
      console.error('[market-value-history] query_failed', { userId: authUser.userId, message });
      const allowEmptyFallback =
        lowered.includes('does not exist') ||
        lowered.includes('not exist') ||
        lowered.includes('relation') ||
        lowered.includes('table') ||
        lowered.includes('collection') ||
        lowered.includes('permission') ||
        lowered.includes('cloudbase') ||
        lowered.includes('sdk not available');
      if (allowEmptyFallback) {
        return NextResponse.json({ success: true, data: [] });
      }
      return NextResponse.json({ success: false, error: 'Failed to fetch score history', errorCode: 'HISTORY_QUERY_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonAuthError(err);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('[market-value-history] handler_failed', { message });
    const lowered = message.toLowerCase();
    if (lowered.includes('cloudbase') || lowered.includes('sdk not available')) {
      return NextResponse.json({ success: true, data: [] });
    }
    return NextResponse.json({ success: false, error: 'Internal server error', errorCode: 'HISTORY_HANDLER_FAILED' }, { status: 500 });
  }
}
