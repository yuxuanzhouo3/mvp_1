/**
 * 照片统计 API (管理员)
 * Photo Stats API (Admin)
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCnServiceDbClient,
  getIntlServiceDbClient,
  getServiceDbClient,
  isChinaDeployment,
} from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { parseAdminSessionToken, verifyAdminSessionToken } from '@/utils/session';

// Force dynamic rendering to avoid caching issues
export const dynamic = 'force-dynamic';

// INTL 环境
function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

async function verifyAdmin(token: string): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    let userId: string | undefined;

    if (isChinaDeployment()) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        userId = payload.sub || payload.uid;
      } catch {
        const db = await getServiceDbClient();
        const { data, error } = await db.auth.getUser();
        if (error || !data?.user) return { isAdmin: false };
        userId = data.user.id;
      }
    } else {
      const supabase = createSupabaseAdmin();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return { isAdmin: false };
      userId = user.id;
    }

    if (!userId) return { isAdmin: false };

    const db = await getServiceDbClient();
    const { data: adminRoles } = await db
      .from('admin_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1);

    return adminRoles && adminRoles.length > 0 ? { isAdmin: true, userId } : { isAdmin: false };
  } catch {
    return { isAdmin: false };
  }
}

function normalizeEpochMs(value: number): number {
  if (value < 1e12) return value * 1000;
  return value;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(normalizeEpochMs(value));
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toIsoDate(value: unknown): string | null {
  const d = toDate(value);
  if (!d) return null;
  return d.toISOString().split('T')[0];
}

type ReviewerAgg = { approved: number; rejected: number; times: number[] };

async function computePhotoStats(db: any): Promise<{
  stats: {
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    avgReviewTimeHours: number | null;
    approvalRate: number;
    rejectionRate: number;
    topReasons: Array<{ reason: string; count: number }>;
    reviewerStats: Array<{
      reviewerId: string;
      reviewerName: string;
      approvedCount: number;
      rejectedCount: number;
      avgTimeHours: number;
    }>;
    dailyStats: Array<{ date: string; approved: number; rejected: number; pending: number }>;
  };
  totalPhotos: number;
  reviewedCount: number;
  reviewedTimeMsSum: number;
}> {
  const { data: photos } = await db
    .from('user_photos')
    .select('id, audit_status, created_at, reviewed_at, rejected_reason, reviewed_by');

  const normalizedPhotos = (photos || []).map((p: any) => ({
    auditStatus: p.audit_status ?? p.auditStatus,
    createdAt: p.created_at ?? p.createdAt,
    reviewedAt: p.reviewed_at ?? p.reviewedAt,
    rejectedReason: p.rejected_reason ?? p.rejectedReason,
    reviewedBy: p.reviewed_by ?? p.reviewedBy,
  }));

  const totalPhotos = normalizedPhotos.length;

  const totalPending = normalizedPhotos.filter((p: any) => p.auditStatus === 'pending').length;
  const totalApproved = normalizedPhotos.filter((p: any) => p.auditStatus === 'approved').length;
  const totalRejected = normalizedPhotos.filter((p: any) => p.auditStatus === 'rejected').length;
  const totalReviewed = totalApproved + totalRejected;

  const approvalRate = totalReviewed > 0 ? (totalApproved / totalReviewed) * 100 : 0;
  const rejectionRate = totalReviewed > 0 ? (totalRejected / totalReviewed) * 100 : 0;

  const reviewedPhotos = normalizedPhotos.filter((p: any) => p.reviewedAt && p.createdAt);
  let reviewedCount = 0;
  let reviewedTimeMsSum = 0;
  if (reviewedPhotos.length > 0) {
    for (const p of reviewedPhotos) {
      const created = toDate(p.createdAt);
      const reviewed = toDate(p.reviewedAt);
      if (!created || !reviewed) continue;
      reviewedCount += 1;
      reviewedTimeMsSum += reviewed.getTime() - created.getTime();
    }
  }

  const avgReviewTimeHours =
    reviewedCount > 0 ? reviewedTimeMsSum / reviewedCount / (1000 * 60 * 60) : null;

  const rejectionReasons: Record<string, number> = {};
  for (const p of normalizedPhotos) {
    if (p.auditStatus === 'rejected' && p.rejectedReason) {
      const reason = String(p.rejectedReason);
      rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
    }
  }

  const topReasons = Object.entries(rejectionReasons)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const reviewerMap: Record<string, ReviewerAgg> = {};
  for (const p of normalizedPhotos) {
    if (!p.reviewedBy) continue;
    if (p.auditStatus !== 'approved' && p.auditStatus !== 'rejected') continue;

    const reviewerId = String(p.reviewedBy);
    if (!reviewerMap[reviewerId]) reviewerMap[reviewerId] = { approved: 0, rejected: 0, times: [] };

    if (p.auditStatus === 'approved') reviewerMap[reviewerId].approved += 1;
    else reviewerMap[reviewerId].rejected += 1;

    const created = toDate(p.createdAt);
    const reviewed = toDate(p.reviewedAt);
    if (created && reviewed) {
      reviewerMap[reviewerId].times.push((reviewed.getTime() - created.getTime()) / (1000 * 60 * 60));
    }
  }

  const reviewerIds = Object.keys(reviewerMap);
  let reviewers: any[] = [];
  if (reviewerIds.length > 0) {
    try {
      const { data: reviewersData } = await db
        .from('users')
        .select('id, username, email')
        .in('id', reviewerIds);
      reviewers = reviewersData || [];
    } catch {
      reviewers = [];
    }
  }

  const reviewerStats = Object.entries(reviewerMap)
    .map(([id, stats]) => {
      const reviewer = reviewers.find((r) => r.id === id);
      const avgTime =
        stats.times.length > 0 ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length : 0;
      return {
        reviewerId: id,
        reviewerName: reviewer?.username || reviewer?.email || id.slice(0, 8),
        approvedCount: stats.approved,
        rejectedCount: stats.rejected,
        avgTimeHours: avgTime,
      };
    })
    .sort((a, b) => b.approvedCount + b.rejectedCount - (a.approvedCount + a.rejectedCount));

  const dailyMap: Record<string, { approved: number; rejected: number; pending: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyMap[dateStr] = { approved: 0, rejected: 0, pending: 0 };
  }

  for (const p of normalizedPhotos) {
    const dateStr = toIsoDate(p.createdAt);
    if (!dateStr || !dailyMap[dateStr]) continue;
    if (p.auditStatus === 'approved') dailyMap[dateStr].approved += 1;
    else if (p.auditStatus === 'rejected') dailyMap[dateStr].rejected += 1;
    else if (p.auditStatus === 'pending') dailyMap[dateStr].pending += 1;
  }

  const dailyStats = Object.entries(dailyMap).map(([date, stats]) => ({ date, ...stats }));

  return {
    stats: {
      totalPending,
      totalApproved,
      totalRejected,
      avgReviewTimeHours,
      approvalRate,
      rejectionRate,
      topReasons,
      reviewerStats,
      dailyStats,
    },
    totalPhotos,
    reviewedCount,
    reviewedTimeMsSum,
  };
}

export async function GET(request: NextRequest) {
  try {
    const adminSessionToken = request.cookies.get('admin_session')?.value;
    const isSessionAuthed = !!adminSessionToken && verifyAdminSessionToken(adminSessionToken);

    const authHeader = request.headers.get('authorization');
    const hasBearer = !!authHeader && authHeader.startsWith('Bearer ');

    if (!isSessionAuthed && !hasBearer) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSessionAuthed && hasBearer) {
      const token = authHeader!.split(' ')[1];
      const { isAdmin } = await verifyAdmin(token);
      if (!isAdmin) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
    } else if (isSessionAuthed) {
      const session = parseAdminSessionToken(adminSessionToken!);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const sourceParam = (searchParams.get('source') || 'ALL').toUpperCase();
    const source = sourceParam === 'CN' || sourceParam === 'INTL' ? sourceParam : 'ALL';

    const sources: Record<'CN' | 'INTL', { total?: number; error?: string | null }> = {
      CN: { error: null },
      INTL: { error: null },
    };

    const statsBySource: Partial<Record<'CN' | 'INTL', Awaited<ReturnType<typeof computePhotoStats>>>> = {};

    const jobs: Array<Promise<void>> = [];

    if (source === 'CN' || source === 'ALL') {
      jobs.push(
        (async () => {
          try {
            const db = await getCnServiceDbClient();
            const res = await computePhotoStats(db);
            statsBySource.CN = res;
            sources.CN.total = res.totalPhotos;
            sources.CN.error = null;
          } catch (e: any) {
            sources.CN.error = e?.message || 'Failed to load CN stats';
          }
        })()
      );
    }

    if (source === 'INTL' || source === 'ALL') {
      jobs.push(
        (async () => {
          try {
            const db = await getIntlServiceDbClient();
            const res = await computePhotoStats(db);
            statsBySource.INTL = res;
            sources.INTL.total = res.totalPhotos;
            sources.INTL.error = null;
          } catch (e: any) {
            sources.INTL.error = e?.message || 'Failed to load INTL stats';
          }
        })()
      );
    }

    if (jobs.length === 0) {
      const db = await getServiceDbClient();
      const res = await computePhotoStats(db);
      return NextResponse.json({ success: true, ...res.stats, sources: {} });
    }

    await Promise.all(jobs);

    const cn = statsBySource.CN;
    const intl = statsBySource.INTL;

    if (!cn && !intl) {
      return NextResponse.json(
        { success: false, error: 'Failed to load stats', sources },
        { status: 500 }
      );
    }

    if (source === 'CN' && cn) {
      return NextResponse.json({ success: true, ...cn.stats, sources });
    }
    if (source === 'INTL' && intl) {
      return NextResponse.json({ success: true, ...intl.stats, sources });
    }

    const totalPending = (cn?.stats.totalPending || 0) + (intl?.stats.totalPending || 0);
    const totalApproved = (cn?.stats.totalApproved || 0) + (intl?.stats.totalApproved || 0);
    const totalRejected = (cn?.stats.totalRejected || 0) + (intl?.stats.totalRejected || 0);
    const totalReviewed = totalApproved + totalRejected;
    const approvalRate = totalReviewed > 0 ? (totalApproved / totalReviewed) * 100 : 0;
    const rejectionRate = totalReviewed > 0 ? (totalRejected / totalReviewed) * 100 : 0;

    const reviewedCount = (cn?.reviewedCount || 0) + (intl?.reviewedCount || 0);
    const reviewedTimeMsSum = (cn?.reviewedTimeMsSum || 0) + (intl?.reviewedTimeMsSum || 0);
    const avgReviewTimeHours =
      reviewedCount > 0 ? reviewedTimeMsSum / reviewedCount / (1000 * 60 * 60) : null;

    const reasonAgg: Record<string, number> = {};
    for (const entry of cn?.stats.topReasons || []) {
      reasonAgg[entry.reason] = (reasonAgg[entry.reason] || 0) + entry.count;
    }
    for (const entry of intl?.stats.topReasons || []) {
      reasonAgg[entry.reason] = (reasonAgg[entry.reason] || 0) + entry.count;
    }
    const topReasons = Object.entries(reasonAgg)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const reviewerStats = [
      ...(cn?.stats.reviewerStats || []).map((r) => ({
        ...r,
        reviewerId: `CN:${r.reviewerId}`,
        reviewerName: `CN - ${r.reviewerName}`,
      })),
      ...(intl?.stats.reviewerStats || []).map((r) => ({
        ...r,
        reviewerId: `INTL:${r.reviewerId}`,
        reviewerName: `INTL - ${r.reviewerName}`,
      })),
    ].sort(
      (a, b) => b.approvedCount + b.rejectedCount - (a.approvedCount + a.rejectedCount)
    );

    const dailyAgg: Record<string, { approved: number; rejected: number; pending: number }> = {};
    for (const day of cn?.stats.dailyStats || []) {
      if (!dailyAgg[day.date]) dailyAgg[day.date] = { approved: 0, rejected: 0, pending: 0 };
      dailyAgg[day.date].approved += day.approved;
      dailyAgg[day.date].rejected += day.rejected;
      dailyAgg[day.date].pending += day.pending;
    }
    for (const day of intl?.stats.dailyStats || []) {
      if (!dailyAgg[day.date]) dailyAgg[day.date] = { approved: 0, rejected: 0, pending: 0 };
      dailyAgg[day.date].approved += day.approved;
      dailyAgg[day.date].rejected += day.rejected;
      dailyAgg[day.date].pending += day.pending;
    }

    const dailyStats = Object.entries(dailyAgg)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      totalPending,
      totalApproved,
      totalRejected,
      avgReviewTimeHours,
      approvalRate,
      rejectionRate,
      topReasons,
      reviewerStats,
      dailyStats,
      sources,
    });

  } catch (error) {
    console.error('Photo stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
