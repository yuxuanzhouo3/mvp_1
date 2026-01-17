/**
 * 待审核照片列表 API (管理员)
 * Pending Photos API (Admin)
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

// GET - List pending photos for review
export async function GET(request: NextRequest) {
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
    const { isAdmin } = await verifyAdmin(token);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const status = searchParams.get('status') || 'pending';
    const userId = searchParams.get('userId');
    const unrated = searchParams.get('unrated') === 'true';

    // Validate pagination
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(50, Math.max(1, pageSize));
    const offset = (validPage - 1) * validPageSize;

    const db = await getServiceDbClient();

    // Build query
    let query = db
      .from('user_photos')
      .select('*')
      .eq('audit_status', status)
      .order('created_at', { ascending: sortOrder === 'asc' });

    // Filter for unrated photos
    if (unrated) {
      query = query.is('admin_rating', null).eq('is_primary', true);
    }

    // Filter by user ID if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Apply pagination
    query = query.range(offset, offset + validPageSize - 1);

    const { data: photos, error } = await query;

    if (error) {
      console.error('Failed to fetch photos:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch photos' },
        { status: 500 }
      );
    }

    // Get user info for each photo
    const userIds = Array.from(new Set((photos || []).map((p: any) => p.user_id)));
    let users: any[] = [];
    if (userIds.length > 0) {
      const { data: usersData } = await db
        .from('users')
        .select('id, username, email')
        .in('id', userIds);
      users = usersData || [];
    }

    // Attach user info to photos
    const photosWithUsers = (photos || []).map((p: any) => ({
      ...p,
      user: users.find(u => u.id === p.user_id) || null
    }));

    // Get total count for pagination
    const { data: allPhotos } = await db
      .from('user_photos')
      .select('id')
      .eq('audit_status', status);
    const count = allPhotos?.length || 0;

    return NextResponse.json({
      success: true,
      photos: photosWithUsers,
      total: count,
      page: validPage,
      pageSize: validPageSize,
      totalPages: Math.ceil(count / validPageSize),
    });

  } catch (error) {
    console.error('Admin photos pending error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
