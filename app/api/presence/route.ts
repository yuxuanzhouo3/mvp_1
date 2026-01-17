/**
 * 用户在线状态 API
 * POST: 更新用户当前所在的聊天室
 * DELETE: 清除用户的聊天室状态（离开聊天室）
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import {
  setUserActiveRoom,
  clearUserActiveRoom,
  refreshUserPresence,
} from '@/lib/services/user-presence';

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
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        const anonClient = createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
        const { data: { user }, error } = await anonClient.auth.getUser(token);
        if (!error && user) {
          return { userId: user.id, email: user.email };
        }
      }
    } catch {}
    return null;
  }
}

// POST: 设置/更新用户当前所在的聊天室
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      await refreshUserPresence(authUser.userId, roomId);
    } else {
      // 进入聊天室
      await setUserActiveRoom(authUser.userId, roomId);
    }

    return NextResponse.json({ 
      success: true,
      region: isChinaDeployment() ? 'CN' : 'INTL'
    });
  } catch (error) {
    console.error('Presence API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 离开聊天室
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 清除用户的活跃聊天室
    await clearUserActiveRoom(authUser.userId);

    return NextResponse.json({ 
      success: true,
      region: isChinaDeployment() ? 'CN' : 'INTL'
    });
  } catch (error) {
    console.error('Presence API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
