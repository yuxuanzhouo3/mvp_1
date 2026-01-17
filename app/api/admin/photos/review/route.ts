/**
 * 照片审核 API (管理员)
 * Photo Review API (Admin)
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

// Helper function to verify admin status
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

// POST /api/admin/photos/review - Route handler for approve/reject/batch operations
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { isAdmin, userId: adminId } = await verifyAdmin(token);

    if (!isAdmin || !adminId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'approve':
        return handleApprove(body.photoId, adminId);
      case 'reject':
        return handleReject(body.photoId, body.reason, adminId);
      case 'batch-approve':
        return handleBatchApprove(body.photoIds, adminId);
      case 'batch-reject':
        return handleBatchReject(body.photoIds, body.reason, adminId);
      case 'rate':
        return handleRate(body.photoId, body.rating, adminId);
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Photo review error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle single photo approval
async function handleApprove(photoId: string, adminId: string) {
  if (!photoId) {
    return NextResponse.json(
      { success: false, error: 'Photo ID is required' },
      { status: 400 }
    );
  }

  const db = await getServiceDbClient();

  // Update photo status
  const { error: updateError } = await db
    .from('user_photos')
    .update({
      audit_status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', photoId)
    .eq('audit_status', 'pending');

  if (updateError) {
    return NextResponse.json(
      { success: false, error: 'Failed to approve photo' },
      { status: 500 }
    );
  }

  // Log the action
  await db.from('photo_audit_logs').insert({
    photo_id: photoId,
    action: 'approved',
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    message: 'Photo approved successfully',
  });
}

// Handle single photo rejection
async function handleReject(photoId: string, reason: string, adminId: string) {
  if (!photoId) {
    return NextResponse.json(
      { success: false, error: 'Photo ID is required' },
      { status: 400 }
    );
  }

  if (!reason || !reason.trim()) {
    return NextResponse.json(
      { success: false, error: 'Rejection reason is required' },
      { status: 400 }
    );
  }

  const db = await getServiceDbClient();

  // Update photo status
  const { error: updateError } = await db
    .from('user_photos')
    .update({
      audit_status: 'rejected',
      rejected_reason: reason.trim(),
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', photoId)
    .eq('audit_status', 'pending');

  if (updateError) {
    return NextResponse.json(
      { success: false, error: 'Failed to reject photo' },
      { status: 500 }
    );
  }

  // Log the action
  await db.from('photo_audit_logs').insert({
    photo_id: photoId,
    action: 'rejected',
    reason: reason.trim(),
    reviewed_by: adminId,
    reviewed_at: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    message: 'Photo rejected successfully',
  });
}

// Handle batch photo approval
async function handleBatchApprove(photoIds: string[], adminId: string) {
  if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Photo IDs are required' },
      { status: 400 }
    );
  }

  // Limit batch size
  if (photoIds.length > 100) {
    return NextResponse.json(
      { success: false, error: 'Maximum 100 photos per batch' },
      { status: 400 }
    );
  }

  const db = await getServiceDbClient();
  const now = new Date().toISOString();

  // Update all photos
  const { error: updateError } = await db
    .from('user_photos')
    .update({
      audit_status: 'approved',
      reviewed_by: adminId,
      reviewed_at: now,
    })
    .in('id', photoIds)
    .eq('audit_status', 'pending');

  if (updateError) {
    return NextResponse.json(
      { success: false, error: 'Failed to approve photos' },
      { status: 500 }
    );
  }

  // Log all actions
  const auditLogs = photoIds.map((photoId) => ({
    photo_id: photoId,
    action: 'approved',
    reviewed_by: adminId,
    reviewed_at: now,
  }));

  await db.from('photo_audit_logs').insert(auditLogs);

  return NextResponse.json({
    success: true,
    message: `${photoIds.length} photos approved successfully`,
    count: photoIds.length,
  });
}

// Handle batch photo rejection
async function handleBatchReject(photoIds: string[], reason: string, adminId: string) {
  if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Photo IDs are required' },
      { status: 400 }
    );
  }

  if (!reason || !reason.trim()) {
    return NextResponse.json(
      { success: false, error: 'Rejection reason is required' },
      { status: 400 }
    );
  }

  // Limit batch size
  if (photoIds.length > 100) {
    return NextResponse.json(
      { success: false, error: 'Maximum 100 photos per batch' },
      { status: 400 }
    );
  }

  const db = await getServiceDbClient();
  const now = new Date().toISOString();

  // Update all photos
  const { error: updateError } = await db
    .from('user_photos')
    .update({
      audit_status: 'rejected',
      rejected_reason: reason.trim(),
      reviewed_by: adminId,
      reviewed_at: now,
    })
    .in('id', photoIds)
    .eq('audit_status', 'pending');

  if (updateError) {
    return NextResponse.json(
      { success: false, error: 'Failed to reject photos' },
      { status: 500 }
    );
  }

  // Log all actions
  const auditLogs = photoIds.map((photoId) => ({
    photo_id: photoId,
    action: 'rejected',
    reason: reason.trim(),
    reviewed_by: adminId,
    reviewed_at: now,
  }));

  await db.from('photo_audit_logs').insert(auditLogs);

  return NextResponse.json({
    success: true,
    message: `${photoIds.length} photos rejected successfully`,
    count: photoIds.length,
  });
}

// Handle photo appearance rating (INTL only)
async function handleRate(photoId: string, rating: number, adminId: string) {
  // Validate photo ID
  if (!photoId) {
    return NextResponse.json(
      { success: false, error: 'Photo ID is required' },
      { status: 400 }
    );
  }

  // Validate rating range (1-100)
  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 100) {
    return NextResponse.json(
      { success: false, error: 'Rating must be between 1 and 100' },
      { status: 400 }
    );
  }

  const db = await getServiceDbClient();

  // Check if the photo is primary
  const { data: photo, error: fetchError } = await db
    .from('user_photos')
    .select('is_primary, audit_status')
    .eq('id', photoId)
    .single();

  if (fetchError || !photo) {
    return NextResponse.json(
      { success: false, error: 'Photo not found' },
      { status: 404 }
    );
  }

  if (!photo.is_primary) {
    return NextResponse.json(
      { success: false, error: 'Only primary photos can be rated' },
      { status: 400 }
    );
  }

  // Update the rating
  const { error: updateError } = await db
    .from('user_photos')
    .update({
      admin_rating: rating,
      rated_by: adminId,
      rated_at: new Date().toISOString(),
    })
    .eq('id', photoId);

  if (updateError) {
    return NextResponse.json(
      { success: false, error: 'Failed to rate photo' },
      { status: 500 }
    );
  }

  // Log the action (non-blocking)
  try {
    await db.from('photo_audit_logs').insert({
      photo_id: photoId,
      action: 'approved',
      reason: `Appearance rating: ${rating}/100`,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    });
  } catch {
    // Ignore audit log errors
  }

  return NextResponse.json({
    success: true,
    message: 'Photo rated successfully',
    rating,
  });
}
