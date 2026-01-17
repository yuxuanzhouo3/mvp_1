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
import { createClient } from '@supabase/supabase-js';
import { clearUserActiveRoom } from '@/lib/services/user-presence';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    let userId: string | null = null;

    if (isChinaDeployment()) {
      // CN 环境: 支持 cn_ 前缀的用户 ID token
      if (token.startsWith('cn_')) {
        userId = token.substring(3);
      } else {
        // 从 token 中解析用户信息 (JWT)
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          userId = payload.sub || payload.uid;
        } catch {
          return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
      }
    } else {
      // INTL 环境: 使用 Supabase 验证 token
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (url && key) {
          const anonClient = createClient(url, key, {
            auth: { autoRefreshToken: false, persistSession: false }
          });
          const { data: { user }, error } = await anonClient.auth.getUser(token);
          if (!error && user) {
            userId = user.id;
          }
        }
      } catch {}
    }

    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 清除用户的活跃聊天室
    await clearUserActiveRoom(userId);

    return NextResponse.json({ 
      success: true,
      region: isChinaDeployment() ? 'CN' : 'INTL'
    });
  } catch (error) {
    console.error('Presence leave API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
