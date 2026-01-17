/**
 * 照片统计 API (管理员)
 * Photo Stats API (Admin)
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';

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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { isAdmin } = await verifyAdmin(token);

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const db = await getServiceDbClient();

    // Get basic counts
    const { data: photos } = await db
      .from('user_photos')
      .select('id, audit_status, created_at, reviewed_at, rejected_reason, reviewed_by');

    const totalPending = photos?.filter((p: any) => p.audit_status === 'pending').length || 0;
    const totalApproved = photos?.filter((p: any) => p.audit_status === 'approved').length || 0;
    const totalRejected = photos?.filter((p: any) => p.audit_status === 'rejected').length || 0;
    const totalReviewed = totalApproved + totalRejected;

    // Calculate approval/rejection rates
    const approvalRate = totalReviewed > 0 ? (totalApproved / totalReviewed) * 100 : 0;
    const rejectionRate = totalReviewed > 0 ? (totalRejected / totalReviewed) * 100 : 0;

    // Calculate average review time
    const reviewedPhotos = photos?.filter((p: any) => p.reviewed_at && p.created_at) || [];
    let avgReviewTimeHours: number | null = null;

    if (reviewedPhotos.length > 0) {
      const totalTime = reviewedPhotos.reduce((sum: number, p: any) => {
        const created = new Date(p.created_at).getTime();
        const reviewed = new Date(p.reviewed_at).getTime();
        return sum + (reviewed - created);
      }, 0);
      avgReviewTimeHours = totalTime / reviewedPhotos.length / (1000 * 60 * 60);
    }

    // Get top rejection reasons
    const rejectionReasons: Record<string, number> = {};
    photos?.forEach((p: any) => {
      if (p.audit_status === 'rejected' && p.rejected_reason) {
        rejectionReasons[p.rejected_reason] = (rejectionReasons[p.rejected_reason] || 0) + 1;
      }
    });

    const topReasons = Object.entries(rejectionReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get reviewer stats
    const reviewerMap: Record<string, { approved: number; rejected: number; times: number[] }> = {};
    photos?.forEach((p: any) => {
      if (p.reviewed_by && (p.audit_status === 'approved' || p.audit_status === 'rejected')) {
        if (!reviewerMap[p.reviewed_by]) {
          reviewerMap[p.reviewed_by] = { approved: 0, rejected: 0, times: [] };
        }

        if (p.audit_status === 'approved') {
          reviewerMap[p.reviewed_by].approved++;
        } else {
          reviewerMap[p.reviewed_by].rejected++;
        }

        if (p.reviewed_at && p.created_at) {
          const timeHours =
            (new Date(p.reviewed_at).getTime() - new Date(p.created_at).getTime()) /
            (1000 * 60 * 60);
          reviewerMap[p.reviewed_by].times.push(timeHours);
        }
      }
    });

    // Get reviewer names
    const reviewerIds = Object.keys(reviewerMap);
    let reviewers: any[] = [];
    if (reviewerIds.length > 0) {
      const { data: reviewersData } = await db
        .from('users')
        .select('id, username, email')
        .in('id', reviewerIds);
      reviewers = reviewersData || [];
    }

    const reviewerStats = Object.entries(reviewerMap).map(([id, stats]) => {
      const reviewer = reviewers.find(r => r.id === id);
      const avgTime = stats.times.length > 0
        ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length
        : 0;

      return {
        reviewerId: id,
        reviewerName: reviewer?.username || reviewer?.email || id.slice(0, 8),
        approvedCount: stats.approved,
        rejectedCount: stats.rejected,
        avgTimeHours: avgTime,
      };
    }).sort((a, b) => (b.approvedCount + b.rejectedCount) - (a.approvedCount + a.rejectedCount));

    // Get daily stats for the past 7 days
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayPhotos = photos?.filter((p: any) => {
        const createdDate = p.created_at.split('T')[0];
        return createdDate === dateStr;
      }) || [];

      dailyStats.push({
        date: dateStr,
        approved: dayPhotos.filter((p: any) => p.audit_status === 'approved').length,
        rejected: dayPhotos.filter((p: any) => p.audit_status === 'rejected').length,
        pending: dayPhotos.filter((p: any) => p.audit_status === 'pending').length,
      });
    }

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
    });

  } catch (error) {
    console.error('Photo stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
