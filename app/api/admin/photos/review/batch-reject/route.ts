/**
 * 批量照片审核拒绝 API (管理员)
 * Batch Photo Reject API (Admin)
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, isPlaceholderSupabaseUrl } from '@/lib/config/supabase-env';

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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { isAdmin, userId: adminId } = await verifyAdmin(token);

    if (!isAdmin || !adminId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { photoIds, reason } = await request.json();

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Photo IDs are required' }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, error: 'Rejection reason is required' }, { status: 400 });
    }

    if (photoIds.length > 100) {
      return NextResponse.json({ success: false, error: 'Maximum 100 photos per batch' }, { status: 400 });
    }

    const db = await getServiceDbClient();
    const now = new Date().toISOString();

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
      console.error('Error batch rejecting photos:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to reject photos' }, { status: 500 });
    }

    const auditLogs = photoIds.map((photoId: string) => ({
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
  } catch (error) {
    console.error('Batch reject error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
