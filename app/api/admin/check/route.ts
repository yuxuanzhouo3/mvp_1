/**
 * 管理员检查 API
 * Admin Check API
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

// INTL 环境: 创建 Supabase 客户端
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
async function verifyAdmin(token: string): Promise<{ isAdmin: boolean; userId?: string; role?: string }> {
  try {
    let userId: string | undefined;

    if (isChinaDeployment()) {
      // CN 环境
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
      // INTL 环境
      const supabase = createSupabaseAdmin();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return { isAdmin: false };
      userId = user.id;
    }

    if (!userId) return { isAdmin: false };

    // Check if user is in admin_roles table
    const db = await getServiceDbClient();
    const { data: adminRoles, error: adminError } = await db
      .from('admin_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1);

    if (adminError || !adminRoles || adminRoles.length === 0) {
      return { isAdmin: false };
    }

    return { isAdmin: true, userId, role: adminRoles[0].role };
  } catch (err) {
    console.error('Admin verification error:', err);
    return { isAdmin: false };
  }
}

// GET - Check if current user is admin
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: true,
        isAdmin: false
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json({
        success: true,
        isAdmin: false
      });
    }

    const result = await verifyAdmin(token);

    return NextResponse.json({
      success: true,
      isAdmin: result.isAdmin,
      userId: result.userId,
      role: result.role
    });

  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json(
      { success: false, isAdmin: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
