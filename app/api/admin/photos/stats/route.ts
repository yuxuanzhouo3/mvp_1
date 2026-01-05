import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function verifyAdmin(token: string): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      console.error('[stats] Auth error:', error);
      return { isAdmin: false };
    }

    console.log('[stats] Verifying admin for user:', user.id);

    // Check if user is in admin_roles table - use maybeSingle() to avoid errors
    const { data: adminRole, error: adminError } = await supabaseAdmin
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError) {
      console.error('[stats] Admin role query error:', adminError);
      return { isAdmin: false };
    }

    if (!adminRole) {
      console.log('[stats] No admin role found for user:', user.id);
      return { isAdmin: false };
    }

    console.log('[stats] Admin verified:', user.id, 'role:', adminRole.role);
    return { isAdmin: true, userId: user.id };
  } catch (err) {
    console.error('[stats] Verify admin exception:', err);
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

    // Get basic counts
    const { data: photos } = await supabaseAdmin
      .from('user_photos')
      .select('id, audit_status, created_at, reviewed_at, rejected_reason, reviewed_by');

    const totalPending = photos?.filter(p => p.audit_status === 'pending').length || 0;
    const totalApproved = photos?.filter(p => p.audit_status === 'approved').length || 0;
    const totalRejected = photos?.filter(p => p.audit_status === 'rejected').length || 0;
    const totalReviewed = totalApproved + totalRejected;

    // Calculate approval/rejection rates
    const approvalRate = totalReviewed > 0 ? (totalApproved / totalReviewed) * 100 : 0;
    const rejectionRate = totalReviewed > 0 ? (totalRejected / totalReviewed) * 100 : 0;

    // Calculate average review time
    const reviewedPhotos = photos?.filter(p => p.reviewed_at && p.created_at) || [];
    let avgReviewTimeHours: number | null = null;

    if (reviewedPhotos.length > 0) {
      const totalTime = reviewedPhotos.reduce((sum, p) => {
        const created = new Date(p.created_at).getTime();
        const reviewed = new Date(p.reviewed_at).getTime();
        return sum + (reviewed - created);
      }, 0);
      avgReviewTimeHours = totalTime / reviewedPhotos.length / (1000 * 60 * 60);
    }

    // Get top rejection reasons
    const rejectionReasons: Record<string, number> = {};
    photos?.forEach(p => {
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
    photos?.forEach(p => {
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
    const { data: reviewers } = await supabaseAdmin
      .from('users')
      .select('id, username, email')
      .in('id', reviewerIds);

    const reviewerStats = Object.entries(reviewerMap).map(([id, stats]) => {
      const reviewer = reviewers?.find(r => r.id === id);
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

      const dayPhotos = photos?.filter(p => {
        const createdDate = p.created_at.split('T')[0];
        return createdDate === dateStr;
      }) || [];

      dailyStats.push({
        date: dateStr,
        approved: dayPhotos.filter(p => p.audit_status === 'approved').length,
        rejected: dayPhotos.filter(p => p.audit_status === 'rejected').length,
        pending: dayPhotos.filter(p => p.audit_status === 'pending').length,
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
    console.error('Get stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
