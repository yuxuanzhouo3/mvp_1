/**
 * 用户离开聊天室 API
 * 专门用于 sendBeacon，因为 sendBeacon 不支持自定义 headers
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment } from '@/lib/db-client';
import { clearUserActiveRoom } from '@/lib/services/user-presence';
import { requireUser } from '@/lib/auth/requireUser';

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireUser(request);

    // 清除用户的活跃聊天室
    await clearUserActiveRoom(authUser.userId);

    return NextResponse.json({ 
      success: true,
      region: isChinaDeployment() ? 'CN' : 'INTL'
    });
  } catch (error) {
    console.error('Presence leave API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
