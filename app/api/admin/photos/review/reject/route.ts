import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyPhotoRejected } from '@/lib/services/notifications';

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
    if (error || !user) return { isAdmin: false };

    const { data: adminRole, error: adminError } = await supabaseAdmin
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminRole) return { isAdmin: false };
    return { isAdmin: true, userId: user.id };
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

    const now = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
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

    await supabaseAdmin.from('photo_audit_logs').insert({
      photo_id: photoId,
      action: 'rejected',
      reason: reason.trim(),
      reviewed_by: adminId,
      reviewed_at: now,
    });

    // Get photo owner and send notification
    const { data: photo } = await supabaseAdmin
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
