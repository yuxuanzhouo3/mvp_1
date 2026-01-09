/**
 * 用户在线状态 API
 * POST: 更新用户当前所在的聊天室
 * DELETE: 清除用户的聊天室状态（离开聊天室）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import {
  setUserActiveRoom,
  clearUserActiveRoom,
  refreshUserPresence,
} from '@/lib/services/user-presence';

// POST: 设置/更新用户当前所在的聊天室
export async function POST(request: NextRequest) {
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

    // 解析请求体
    const body = await request.json();
    const { roomId, action } = body;

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    // 根据 action 执行不同操作
    if (action === 'heartbeat') {
      // 心跳：刷新在线状态
      await refreshUserPresence(user.id, roomId);
    } else {
      // 进入聊天室
      await setUserActiveRoom(user.id, roomId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Presence API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 离开聊天室
export async function DELETE(request: NextRequest) {
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

    // 清除用户的活跃聊天室
    await clearUserActiveRoom(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Presence API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
