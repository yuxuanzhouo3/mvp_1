/**
 * 照片审核 API (管理员)
 * Photo Review API (Admin)
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
import { getSupabaseUrl, isPlaceholderSupabaseUrl } from '@/lib/config/supabase-env';
import { parseAdminSessionToken, verifyAdminSessionToken } from '@/utils/session';
import {
  calculateMarketValue,
  transformUserToScoringData,
  type MarketValueScore,
} from '@/lib/scoring';
import type { GenderEnum } from '@/types/database';

// Force dynamic rendering to avoid caching issues
export const dynamic = 'force-dynamic';

// INTL 环境
function createSupabaseAdmin() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || isPlaceholderSupabaseUrl(url)) {
    throw new Error('Supabase admin configuration missing. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  }
  return createClient(
    url,
    key,
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
    const adminSessionToken = request.cookies.get('admin_session')?.value;
    const isSessionAuthed =
      !!adminSessionToken && verifyAdminSessionToken(adminSessionToken);

    const authHeader = request.headers.get('authorization');
    const hasBearer = !!authHeader && authHeader.startsWith('Bearer ');

    if (!isSessionAuthed && !hasBearer) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let reviewedBy: string | null = null;
    let adminUsername: string | null = null;

    if (isSessionAuthed) {
      const session = parseAdminSessionToken(adminSessionToken!);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      adminUsername = session.username;
    } else if (hasBearer) {
      const token = authHeader!.split(' ')[1];
      const { isAdmin, userId: adminId } = await verifyAdmin(token);

      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Forbidden - Admin access required' },
          { status: 403 }
        );
      }

      reviewedBy = adminId || null;
    }

    const body = await request.json();
    const { action } = body;
    const sourceParam = (body?.source || '').toString().toUpperCase();
    const source: 'CN' | 'INTL' =
      sourceParam === 'CN' || sourceParam === 'INTL'
        ? sourceParam
        : isChinaDeployment()
          ? 'CN'
          : 'INTL';

    switch (action) {
      case 'approve':
        return handleApprove(body.photoId, { reviewedBy, adminUsername }, source);
      case 'reject':
        return handleReject(body.photoId, body.reason, { reviewedBy, adminUsername }, source);
      case 'batch-approve':
        return handleBatchApprove(body.photoIds, { reviewedBy, adminUsername }, source);
      case 'batch-reject':
        return handleBatchReject(body.photoIds, body.reason, { reviewedBy, adminUsername }, source);
      case 'rate':
        return handleRate(body.photoId, body.rating, { reviewedBy, adminUsername }, source);
      case 'set-primary':
        return handleSetPrimary(body.photoId, { reviewedBy, adminUsername }, source);
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

type AdminActor = { reviewedBy: string | null; adminUsername: string | null };

async function getDbForSource(source: 'CN' | 'INTL') {
  try {
    return source === 'CN' ? await getCnServiceDbClient() : await getIntlServiceDbClient();
  } catch (error) {
    console.error(`[Review] Service client not configured (${source})`, error);
    throw new Error(`Service client not configured for ${source}`);
  }
}

async function recalculateAndSyncMarketValue(db: any, userId: string) {
  const { data: userData, error: userError } = await db
    .from('users')
    .select('id, gender, birth_date')
    .eq('id', userId)
    .single();

  if (userError || !userData) return;

  const { data: profileData, error: profileError } = await db
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError || !profileData) return;

  const { data: photosData } = await db
    .from('user_photos')
    .select('*')
    .eq('user_id', userId)
    .eq('audit_status', 'approved')
    .order('sort_order', { ascending: true });

  let location: { latitude: number; longitude: number } | null = null;
  if (profileData.location) {
    const loc = profileData.location;
    if (typeof loc === 'object' && 'coordinates' in loc) {
      location = {
        longitude: loc.coordinates[0],
        latitude: loc.coordinates[1],
      };
    } else if (typeof loc === 'object' && 'latitude' in loc) {
      location = loc as { latitude: number; longitude: number };
    }
  }

  let bmi: number | null = null;
  if (profileData.height_cm && profileData.weight_kg) {
    const heightInMeters = profileData.height_cm / 100;
    bmi = profileData.weight_kg / (heightInMeters * heightInMeters);
  }

  const scoringData = transformUserToScoringData(
    {
      gender: userData.gender as GenderEnum | null,
      birth_date: userData.birth_date,
    },
    {
      bmi,
      education_level: profileData.education_level,
      company_type: profileData.company_type,
      annual_income_range: profileData.annual_income_range,
      marital_status: profileData.marital_status || 'single',
      relationship_history_count: profileData.relationship_history_count || 0,
      children_preference: profileData.children_preference,
      mbti: profileData.mbti,
      location,
    },
    photosData || []
  );

  const evaluatorGender: GenderEnum =
    userData.gender === 'male' ? 'female' : 'male';

  const result = await calculateMarketValue(
    scoringData,
    evaluatorGender,
    'compatible_match',
    null
  );

  const { data: sameGenderUsers } = await db
    .from('users')
    .select('id')
    .eq('gender', userData.gender);

  let percentile = 50;
  if (sameGenderUsers && sameGenderUsers.length > 0) {
    percentile = Math.min(95, Math.max(5, Math.round(50 + (result.totalScore - 60) * 2)));
  }

  const fullScore: MarketValueScore = {
    ...result,
    percentile,
  };

  await db
    .from('user_profiles')
    .update({ market_value_score: fullScore })
    .eq('user_id', userId);

  try {
    await db.from('user_market_value_score_history').insert({
      user_id: userId,
      total_score: fullScore.totalScore,
      percentile: fullScore.percentile,
      score_breakdown: fullScore.scoreBreakdown,
      calculated_at: (fullScore as any).calculatedAt || new Date().toISOString(),
      version: (fullScore as any).version,
      algorithm: (fullScore as any).algorithmType || 'compatible_match',
    });
  } catch {
    // Ignore history insert errors (CN or missing table)
  }
}

async function handleSetPrimary(photoId: string, actor: AdminActor, source: 'CN' | 'INTL') {
  if (!photoId) {
    return NextResponse.json(
      { success: false, error: 'Photo ID is required' },
      { status: 400 }
    );
  }

  const db = await getDbForSource(source);

  const { data: photo, error: fetchError } = await db
    .from('user_photos')
    .select('id, user_id, is_primary, audit_status')
    .eq('id', photoId)
    .single();

  if (fetchError || !photo) {
    return NextResponse.json(
      { success: false, error: 'Photo not found' },
      { status: 404 }
    );
  }

  if (photo.audit_status !== 'approved') {
    return NextResponse.json(
      { success: false, error: 'Photo must be approved before setting as primary' },
      { status: 400 }
    );
  }

  if (photo.is_primary) {
    return NextResponse.json({ success: true, message: 'Primary photo unchanged', userId: photo.user_id });
  }

  const { error: unsetError } = await db
    .from('user_photos')
    .update({ is_primary: false })
    .eq('user_id', photo.user_id);

  if (unsetError) {
    return NextResponse.json(
      { success: false, error: 'Failed to update primary photo' },
      { status: 500 }
    );
  }

  const { error: setError } = await db
    .from('user_photos')
    .update({ is_primary: true })
    .eq('id', photoId);

  if (setError) {
    return NextResponse.json(
      { success: false, error: 'Failed to update primary photo' },
      { status: 500 }
    );
  }

  try {
    await db.from('photo_audit_logs').insert({
      photo_id: photoId,
      action: 'approved',
      reason: 'Set primary photo',
      reviewed_by: actor.reviewedBy,
      reviewed_at: new Date().toISOString(),
      metadata: actor.adminUsername ? { admin_username: actor.adminUsername } : {},
    });
  } catch {
    // Ignore audit log errors
  }

  try {
    await recalculateAndSyncMarketValue(db, photo.user_id);
  } catch {
    // Ignore recalculation errors
  }

  return NextResponse.json({ success: true, message: 'Primary photo updated', userId: photo.user_id });
}

// Handle single photo approval
async function handleApprove(photoId: string, actor: AdminActor, source: 'CN' | 'INTL') {
  if (!photoId) {
    return NextResponse.json(
      { success: false, error: 'Photo ID is required' },
      { status: 400 }
    );
  }

  const db = await getDbForSource(source);
  const now = new Date().toISOString();
  const updateData: Record<string, any> = {
    audit_status: 'approved',
    reviewed_at: now,
  };
  if (actor.reviewedBy) {
    updateData.reviewed_by = actor.reviewedBy;
  }

  // Update photo status
  const { error: updateError } = await db
    .from('user_photos')
    .update(updateData)
    .eq('id', photoId)
    .eq('audit_status', 'pending');

  if (updateError) {
    return NextResponse.json(
      { success: false, error: 'Failed to approve photo' },
      { status: 500 }
    );
  }

  // Log the action
  try {
    await db.from('photo_audit_logs').insert({
      photo_id: photoId,
      action: 'approved',
      reviewed_by: actor.reviewedBy,
      reviewed_at: now,
      metadata: actor.adminUsername ? { admin_username: actor.adminUsername } : {},
    });
  } catch {
    // Ignore audit log errors
  }

  return NextResponse.json({
    success: true,
    message: 'Photo approved successfully',
  });
}

// Handle single photo rejection
async function handleReject(photoId: string, reason: string, actor: AdminActor, source: 'CN' | 'INTL') {
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

  const db = await getDbForSource(source);
  const now = new Date().toISOString();
  const updateData: Record<string, any> = {
    audit_status: 'rejected',
    rejected_reason: reason.trim(),
    reviewed_at: now,
  };
  if (actor.reviewedBy) {
    updateData.reviewed_by = actor.reviewedBy;
  }

  // Update photo status
  const { error: updateError } = await db
    .from('user_photos')
    .update(updateData)
    .eq('id', photoId)
    .eq('audit_status', 'pending');

  if (updateError) {
    return NextResponse.json(
      { success: false, error: 'Failed to reject photo' },
      { status: 500 }
    );
  }

  // Log the action
  try {
    await db.from('photo_audit_logs').insert({
      photo_id: photoId,
      action: 'rejected',
      reason: reason.trim(),
      reviewed_by: actor.reviewedBy,
      reviewed_at: now,
      metadata: actor.adminUsername ? { admin_username: actor.adminUsername } : {},
    });
  } catch {
    // Ignore audit log errors
  }

  return NextResponse.json({
    success: true,
    message: 'Photo rejected successfully',
  });
}

// Handle batch photo approval
async function handleBatchApprove(photoIds: string[], actor: AdminActor, source: 'CN' | 'INTL') {
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

  const db = await getDbForSource(source);
  const now = new Date().toISOString();
  const updateData: Record<string, any> = {
    audit_status: 'approved',
    reviewed_at: now,
  };
  if (actor.reviewedBy) {
    updateData.reviewed_by = actor.reviewedBy;
  }

  // Update all photos
  const { error: updateError } = await db
    .from('user_photos')
    .update(updateData)
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
    reviewed_by: actor.reviewedBy,
    reviewed_at: now,
    metadata: actor.adminUsername ? { admin_username: actor.adminUsername } : {},
  }));

  try {
    await db.from('photo_audit_logs').insert(auditLogs);
  } catch {
    // Ignore audit log errors
  }

  return NextResponse.json({
    success: true,
    message: `${photoIds.length} photos approved successfully`,
    count: photoIds.length,
  });
}

// Handle batch photo rejection
async function handleBatchReject(photoIds: string[], reason: string, actor: AdminActor, source: 'CN' | 'INTL') {
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

  const db = await getDbForSource(source);
  const now = new Date().toISOString();
  const updateData: Record<string, any> = {
    audit_status: 'rejected',
    rejected_reason: reason.trim(),
    reviewed_at: now,
  };
  if (actor.reviewedBy) {
    updateData.reviewed_by = actor.reviewedBy;
  }

  // Update all photos
  const { error: updateError } = await db
    .from('user_photos')
    .update(updateData)
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
    reviewed_by: actor.reviewedBy,
    reviewed_at: now,
    metadata: actor.adminUsername ? { admin_username: actor.adminUsername } : {},
  }));

  try {
    await db.from('photo_audit_logs').insert(auditLogs);
  } catch {
    // Ignore audit log errors
  }

  return NextResponse.json({
    success: true,
    message: `${photoIds.length} photos rejected successfully`,
    count: photoIds.length,
  });
}

// Handle photo appearance rating
async function handleRate(photoId: string, rating: number, actor: AdminActor, source: 'CN' | 'INTL') {
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

  const db = await getDbForSource(source);

  // Check if the photo is primary
  const { data: photo, error: fetchError } = await db
    .from('user_photos')
    .select('is_primary, audit_status, user_id')
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

  if (photo.audit_status !== 'approved') {
    return NextResponse.json(
      { success: false, error: 'Photo must be approved before rating' },
      { status: 400 }
    );
  }

  // Update the rating
  const { error: updateError } = await db
    .from('user_photos')
    .update({
      admin_rating: rating,
      rated_by: actor.reviewedBy,
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
      reviewed_by: actor.reviewedBy,
      reviewed_at: new Date().toISOString(),
      metadata: actor.adminUsername ? { admin_username: actor.adminUsername } : {},
    });
  } catch {
    // Ignore audit log errors
  }

  try {
    await recalculateAndSyncMarketValue(db, photo.user_id);
  } catch {
    // Ignore recalculation errors
  }

  return NextResponse.json({
    success: true,
    message: 'Photo rated successfully',
    rating,
  });
}
