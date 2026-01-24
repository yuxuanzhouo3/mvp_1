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
import { requireUser } from '@/lib/auth/requireUser';

// Force dynamic rendering to avoid caching issues
export const dynamic = 'force-dynamic';

// GET - Check if current user is admin
export async function GET(request: NextRequest) {
  try {
    let userId: string;
    try {
      const authUser = await requireUser(request);
      userId = authUser.userId;
    } catch {
      return NextResponse.json({ success: true, isAdmin: false });
    }

    const db = await getServiceDbClient();
    const { data: adminRoles, error: adminError } = await db
      .from('admin_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1);

    if (adminError || !adminRoles || adminRoles.length === 0) {
      return NextResponse.json({ success: true, isAdmin: false });
    }

    return NextResponse.json({
      success: true,
      isAdmin: true,
      userId,
      role: adminRoles[0].role,
    });

  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json(
      { success: false, isAdmin: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
