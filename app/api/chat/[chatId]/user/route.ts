/**
 * 聊天对象用户信息 API
 * GET /api/chat/[chatId]/user - 获取聊天对象的用户信息
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { defaultPrivacySettings } from '@/lib/validations/settings';

// 统一认证函数
async function authenticateUser(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization');

  if (isChinaDeployment()) {
    // CN 环境
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    // CN 环境: 支持 cn_ 前缀的用户 ID token
    if (token.startsWith('cn_')) {
      const userId = token.substring(3);
      if (userId) {
        return { userId };
      }
    }
    // 从 token 中解析用户信息 (JWT)
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return {
        userId: payload.sub || payload.uid,
        email: payload.email,
      };
    } catch {
      return null;
    }
  } else {
    // INTL 环境: 使用 Supabase 验证 token
    const db = await getDbClient();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) {
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (url && key) {
            const anonClient = createClient(url, key, {
              auth: { autoRefreshToken: false, persistSession: false }
            });
            const { data: { user: tokenUser }, error: tokenError } = await anonClient.auth.getUser(token);
            if (!tokenError && tokenUser) {
              return { userId: tokenUser.id, email: tokenUser.email };
            }
          }
        } catch {}
      }
      return null;
    }
    return { userId: user.id, email: user.email };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    // Check if we're in mock mode
    const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://mock.supabase.co';

    if (isMockMode) {
      // Return mock user data
      const mockUser = {
        id: 'mock-user-2',
        full_name: 'Mock User 2',
        avatar_url: 'https://via.placeholder.com/150',
        is_online: true,
        last_seen: new Date().toISOString(),
      };

      return NextResponse.json({
        user: mockUser,
        mode: 'mock'
      });
    }

    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const db = await getDbClient();

    // Get chat information to find the other user
    let otherUserId: string | null = null;

    const { data: chatRoom } = await db
      .from('chat_rooms')
      .select('id, match_id')
      .eq('id', params.chatId)
      .single();

    if (chatRoom?.match_id) {
      const { data: match } = await db
        .from('matches')
        .select('user_1, user_2')
        .eq('id', chatRoom.match_id)
        .single();

      if (match?.user_1 && match?.user_2) {
        const isParticipant = match.user_1 === authUser.userId || match.user_2 === authUser.userId;
        if (!isParticipant) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        otherUserId = match.user_1 === authUser.userId ? match.user_2 : match.user_1;
      }
    }

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Get the other user's basic info from users table
    const { data: otherUser, error: userError } = await db
      .from('users')
      .select('id, username, avatar_url, last_active_at')
      .eq('id', otherUserId)
      .single();

    if (userError || !otherUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { data: otherProfile } = await db
      .from('user_profiles')
      .select('privacy_settings')
      .eq('user_id', otherUserId)
      .single();

    const privacy = {
      ...defaultPrivacySettings,
      ...(otherProfile?.privacy_settings || {}),
    };

    // Determine if user is online (simple check - if last_active_at is within 5 minutes)
    const lastActive = new Date(otherUser.last_active_at || 0);
    const now = new Date();
    const isOnline = privacy.show_online_status
      ? (now.getTime() - lastActive.getTime()) < 5 * 60 * 1000
      : false;

    const chatUser = {
      id: otherUser.id,
      full_name: otherUser.username || 'User',
      avatar_url: otherUser.avatar_url,
      is_online: isOnline,
      last_seen: privacy.show_last_active ? otherUser.last_active_at : null,
    };

    return NextResponse.json({
      user: chatUser,
      mode: 'real',
      region: isChinaDeployment() ? 'CN' : 'INTL'
    });
  } catch (error) {
    console.error('Error in chat user API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
