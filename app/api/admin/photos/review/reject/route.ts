/**
 * 照片审核拒绝 API (管理员)
 * Photo Reject API (Admin)
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { notifyPhotoRejected } from '@/lib/services/notifications';

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

    const { photoId, reason } = await request.json();

    if (!photoId) {
      return NextResponse.json({ success: false, error: 'Photo ID is required' }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, error: 'Rejection reason is required' }, { status: 400 });
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
      .eq('id', photoId)
      .eq('audit_status', 'pending');

    if (updateError) {
      console.error('Error rejecting photo:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to reject photo' }, { status: 500 });
    }

    await db.from('photo_audit_logs').insert({
      photo_id: photoId,
      action: 'rejected',
      reason: reason.trim(),
      reviewed_by: adminId,
      reviewed_at: now,
    });

    // Get photo owner and send notification
    const { data: photo } = await db
      .from('user_photos')
      .select('user_id')
      .eq('id', photoId)
      .single();

    if (photo?.user_id) {
      notifyPhotoRejected(photo.user_id, photoId, reason.trim()).catch((err) => {
        console.warn('[Photo Reject] Failed to send notification:', err);
      });
    }

    return NextResponse.json({ success: true, message: 'Photo rejected successfully' });
  } catch (error) {
    console.error('Reject error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
