/**
 * CN 环境聊天室列表 API
 * 从 CloudBase 获取用户的聊天室数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { isChinaDeployment, getServiceDbClient } from '@/lib/db-client';

export async function GET(request: NextRequest) {
  if (!isChinaDeployment()) {
    return NextResponse.json({ error: 'Only available in CN region' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 从 token 中获取用户 ID
  const token = authHeader.replace('Bearer ', '');
  let userId: string | null = null;

  if (token.startsWith('cn_')) {
    userId = token.substring(3);
  } else {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.sub || payload.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  }

  if (!userId) {
    return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
  }

  try {
    const db = await getServiceDbClient();

    // 获取用户参与的 matches
    const { data: matches, error: matchError } = await db
      .from('matches')
      .select('id, user_1, user_2, matched_at')
      .or(`user_1.eq.${userId},user_2.eq.${userId}`);

    if (matchError || !matches?.length) {
      return NextResponse.json({ rooms: [] });
    }

    // 获取对应的 chat_rooms
    const matchIds = matches.map((m: any): any => m.id);
    const { data: chatRooms, error: roomError } = await db
      .from('chat_rooms')
      .select('id, match_id, is_active, created_at, updated_at')
      .in('match_id', matchIds)
      .eq('is_active', true);

    if (roomError || !chatRooms?.length) {
      return NextResponse.json({ rooms: [] });
    }

    // 获取对方用户信息
    const otherUserIds = matches.map((m: any): any =>
      m.user_1 === userId ? m.user_2 : m.user_1
    );

    const { data: users } = await db
      .from('users')
      .select('id, username, avatar_url')
      .in('id', otherUserIds);

    const userMap = new Map((users || []).map((u: any): any => [u.id, u]));
    const matchMap = new Map(matches.map((m: any): any => [m.id, m]));

    // 转换为聊天室格式
    const rooms = chatRooms.map((room: any): any => {
      const match = matchMap.get(room.match_id) as any;
      const otherUserId = match ? (match.user_1 === userId ? match.user_2 : match.user_1) : '';
      const otherUser = userMap.get(otherUserId) as any;

      return {
        id: otherUserId,
        matchId: room.match_id,
        participants: [userId, otherUserId],
        isActive: room.is_active,
        createdAt: room.created_at,
        updatedAt: room.updated_at,
        otherUser: {
          id: otherUserId,
          username: otherUser?.username || otherUserId,
          avatarUrl: otherUser?.avatar_url,
        },
      };
    });

    return NextResponse.json({ rooms });
  } catch (error: any) {
    console.error('[CN Rooms API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }
}
