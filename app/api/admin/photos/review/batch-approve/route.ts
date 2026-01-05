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

    const { photoIds } = await request.json();

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Photo IDs are required' }, { status: 400 });
    }

    if (photoIds.length > 100) {
      return NextResponse.json({ success: false, error: 'Maximum 100 photos per batch' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from('user_photos')
      .update({
        audit_status: 'approved',
        reviewed_by: adminId,
        reviewed_at: now,
      })
      .in('id', photoIds)
      .eq('audit_status', 'pending');

    if (updateError) {
      console.error('Error batch approving photos:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to approve photos' }, { status: 500 });
    }

    const auditLogs = photoIds.map((photoId: string) => ({
      photo_id: photoId,
      action: 'approved',
      reviewed_by: adminId,
      reviewed_at: now,
    }));

    await supabaseAdmin.from('photo_audit_logs').insert(auditLogs);

    return NextResponse.json({
      success: true,
      message: `${photoIds.length} photos approved successfully`,
      count: photoIds.length,
    });
  } catch (error) {
    console.error('Batch approve error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
