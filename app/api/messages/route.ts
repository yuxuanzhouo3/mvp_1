/**
 * 消息 API - INTL 环境
 * GET: 获取用户的聊天室列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();

    // 获取授权头
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 验证 token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 调用数据库函数获取聊天室列表
    const { data: rooms, error: roomsError } = await supabase.rpc('get_chat_rooms_for_user', {
      p_user_id: user.id,
    });

    if (roomsError) {
      console.error('Error fetching chat rooms:', roomsError);
      return NextResponse.json({ error: 'Failed to fetch chat rooms' }, { status: 500 });
    }

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
    });
  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

