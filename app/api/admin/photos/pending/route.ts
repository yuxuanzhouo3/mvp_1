/**
 * 待审核照片列表 API (管理员)
 * Pending Photos API (Admin)
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
    const adminSessionToken = request.cookies.get('admin_session')?.value;
    const isSessionAuthed =
      !!adminSessionToken && verifyAdminSessionToken(adminSessionToken);

    const authHeader = request.headers.get('authorization');
    const hasBearer = !!authHeader && authHeader.startsWith('Bearer ');

    if (!isSessionAuthed && !hasBearer) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSessionAuthed && hasBearer) {
      const token = authHeader!.split(' ')[1];
      const { isAdmin } = await verifyAdmin(token);

      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: 'Forbidden - Admin access required' },
          { status: 403 }
        );
      }
    } else if (isSessionAuthed) {
      const session = parseAdminSessionToken(adminSessionToken!);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const status = searchParams.get('status') || 'pending';
    const userId = searchParams.get('userId');
    const unrated = searchParams.get('unrated') === 'true';
    const sourceParam = (searchParams.get('source') || 'ALL').toUpperCase();
    const source = sourceParam === 'CN' || sourceParam === 'INTL' ? sourceParam : 'ALL';

    // Validate pagination
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(50, Math.max(1, pageSize));
    const offset = (validPage - 1) * validPageSize;
    const end = offset + validPageSize - 1;
    const prefetchEnd = end;

    const buildPhotosQuery = (db: any) => {
      let query = db
        .from('user_photos')
        .select('*')
        .eq('audit_status', status)
        .order('created_at', { ascending: sortOrder === 'asc' });

      if (unrated) {
        query = query.is('admin_rating', null).eq('is_primary', true);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      return query;
    };

    const buildCountQuery = (db: any) => {
      let query = db
        .from('user_photos')
        .select('id')
        .eq('audit_status', status);

      if (unrated) {
        query = query.is('admin_rating', null).eq('is_primary', true);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      return query;
    };

    const attachUsers = async (db: any, photos: any[]) => {
      const userIds = Array.from(new Set((photos || []).map((p: any) => p.user_id)));
      if (userIds.length === 0) return photos || [];
      const { data: usersData } = await db
        .from('users')
        .select('id, username, email')
        .in('id', userIds);
      const users = usersData || [];
      return (photos || []).map((p: any) => ({
        ...p,
        user: users.find((u: any) => u.id === p.user_id) || null,
      }));
    };

    const fetchFromSource = async (target: 'CN' | 'INTL') => {
      let db: any;
      try {
        db = target === 'CN' ? await getCnServiceDbClient() : await getIntlServiceDbClient();
      } catch (error) {
        console.error(`[Pending] Service client not configured (${target})`, error);
        return { photos: [], total: 0, error: 'not_configured' as const };
      }

      const { data: prefetched, error } = await buildPhotosQuery(db).range(0, prefetchEnd);
      if (error) {
        console.error(`[Pending] Failed to fetch photos (${target}):`, error);
        return { photos: [], total: 0, error: 'query_failed' as const };
      }

      const photosWithUsers = await attachUsers(db, prefetched || []);
      const { data: allPhotos } = await buildCountQuery(db);
      const total = allPhotos?.length || 0;

      return {
        photos: (photosWithUsers || []).map((p: any) => ({ ...p, source: target })),
        total,
        error: null,
      };
    };

    const sourcesToQuery: Array<'CN' | 'INTL'> = source === 'ALL' ? ['CN', 'INTL'] : [source];
    const [cnResult, intlResult] = await Promise.all([
      sourcesToQuery.includes('CN') ? fetchFromSource('CN') : Promise.resolve({ photos: [], total: 0 }),
      sourcesToQuery.includes('INTL') ? fetchFromSource('INTL') : Promise.resolve({ photos: [], total: 0 }),
    ]);

    const combined = [...cnResult.photos, ...intlResult.photos].sort((a: any, b: any) => {
      const at = new Date(a.created_at || 0).getTime();
      const bt = new Date(b.created_at || 0).getTime();
      return sortOrder === 'asc' ? at - bt : bt - at;
    });

    const photosWithUsers = combined.slice(offset, offset + validPageSize);
    const count = cnResult.total + intlResult.total;

    return NextResponse.json({
      success: true,
      photos: photosWithUsers,
      total: count,
      page: validPage,
      pageSize: validPageSize,
      totalPages: Math.ceil(count / validPageSize),
      source,
      sources: {
        CN: { total: cnResult.total, error: (cnResult as any).error || null },
        INTL: { total: intlResult.total, error: (intlResult as any).error || null },
      },
    });

  } catch (error) {
    console.error('Admin photos pending error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
