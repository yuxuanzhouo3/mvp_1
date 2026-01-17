/**
 * 消息 API - 获取用户的聊天室列表
 * GET /api/messages - 获取聊天室列表
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';

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

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDbClient();
    const isCN = isChinaDeployment();

    // 尝试调用 RPC 函数获取聊天室列表 (INTL 环境)
    if (!isCN) {
      try {
        const { data: rooms, error: roomsError } = await db.rpc('get_chat_rooms_for_user', {
          p_user_id: authUser.userId,
        });

        if (!roomsError && rooms) {
          // 转换数据格式
          const formattedRooms = (rooms || []).map((room: Record<string, unknown>) => ({
            id: room.room_id,
            match_id: room.match_id,
            last_message_content: room.last_message_content,
            last_message_type: room.last_message_type || 'text',
            last_message_at: room.last_message_at,
            unread_count: room.unread_count || 0,
            is_active: room.is_active,
            created_at: room.created_at,
            other_user: {
              id: room.other_user_id,
              username: room.other_user_username,
              avatar_url: room.other_user_avatar_url,
              gender: room.other_user_gender,
              last_active_at: room.other_user_last_active,
            },
          }));

          return NextResponse.json({
            success: true,
            rooms: formattedRooms,
            region: 'INTL'
          });
        }
      } catch (rpcError) {
        console.log('RPC not available, falling back to direct query');
      }
    }

    // 直接查询聊天室 (CN 环境或 RPC 失败时)
    const { data: chatRooms, error: chatRoomsError } = await db
      .from('chat_rooms')
      .select(`
        id,
        match_id,
        is_active,
        last_message_content,
        last_message_at,
        created_at
      `)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false });

    if (chatRoomsError) {
      console.error('Error fetching chat rooms:', chatRoomsError);
      return NextResponse.json({ error: 'Failed to fetch chat rooms' }, { status: 500 });
    }

    // 获取 match 信息
    const matchIds = chatRooms?.map(r => r.match_id).filter(Boolean) || [];
    let matches: any[] = [];
    
    if (matchIds.length > 0) {
      const { data } = await db
        .from('matches')
        .select('id, user_1, user_2')
        .in('id', matchIds);
      matches = data || [];
    }

    const matchMap = new Map(matches.map(m => [m.id, m]));

    // 过滤出当前用户参与的聊天室
    const userRooms = chatRooms?.filter(room => {
      const match = matchMap.get(room.match_id);
      return match && (match.user_1 === authUser.userId || match.user_2 === authUser.userId);
    }) || [];

    // 获取其他用户信息
    const otherUserIds = userRooms.map(room => {
      const match = matchMap.get(room.match_id);
      if (!match) return null;
      return match.user_1 === authUser.userId ? match.user_2 : match.user_1;
    }).filter(Boolean);

    let otherUsers: any[] = [];
    if (otherUserIds.length > 0) {
      const { data } = await db
        .from('users')
        .select('id, username, avatar_url, gender, last_active_at')
        .in('id', otherUserIds);
      otherUsers = data || [];
    }

    const userMap = new Map(otherUsers.map(u => [u.id, u]));

    // 组装返回数据
    const formattedRooms = userRooms.map(room => {
      const match = matchMap.get(room.match_id);
      const otherUserId = match?.user_1 === authUser.userId ? match?.user_2 : match?.user_1;
      const otherUser = otherUserId ? userMap.get(otherUserId) : null;

      return {
        id: room.id,
        match_id: room.match_id,
        last_message_content: room.last_message_content,
        last_message_type: 'text',
        last_message_at: room.last_message_at,
        unread_count: 0,
        is_active: room.is_active,
        created_at: room.created_at,
        other_user: otherUser ? {
          id: otherUser.id,
          username: otherUser.username,
          avatar_url: otherUser.avatar_url,
          gender: otherUser.gender,
          last_active_at: otherUser.last_active_at,
        } : null,
      };
    });

    return NextResponse.json({
      success: true,
      rooms: formattedRooms,
      region: isCN ? 'CN' : 'INTL'
    });
  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
