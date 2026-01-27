/**
 * 聊天列表 API
 * GET /api/chat/list - 获取用户的聊天列表
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';
import { getSupabaseUrl, isPlaceholderSupabaseUrl } from '@/lib/config/supabase-env';

export const dynamic = 'force-dynamic';

// 统一认证函数
async function authenticateUser(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  try {
    const user = await requireUser(request);
    return { userId: user.userId, email: user.email };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if we're in mock mode
    const url = getSupabaseUrl();
    const isMockMode = url === 'https://mock.supabase.co' || isPlaceholderSupabaseUrl(url);

    if (isMockMode) {
      // In mock mode, return mock chat data
      const mockChats = [
        {
          id: 'mock-chat-1',
          matched_user: {
            id: 'mock-user-2',
            full_name: 'Mock User 2',
            avatar_url: 'https://via.placeholder.com/150',
            is_online: true,
            last_seen: new Date().toISOString(),
          },
          last_message: {
            content: 'Hello! How are you?',
            sender_id: 'mock-user-2',
            created_at: new Date().toISOString(),
            message_type: 'text',
          },
          unread_count: 2,
          compatibility_score: 92,
          matched_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'mock-chat-2',
          matched_user: {
            id: 'mock-user-3',
            full_name: 'Mock User 3',
            avatar_url: 'https://via.placeholder.com/150',
            is_online: false,
            last_seen: new Date(Date.now() - 3600000).toISOString(),
          },
          last_message: {
            content: 'Nice to meet you!',
            sender_id: 'mock-user-3',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            message_type: 'text',
          },
          unread_count: 0,
          compatibility_score: 85,
          matched_at: new Date(Date.now() - 172800000).toISOString(),
        }
      ];

      return NextResponse.json({
        chats: mockChats,
        mode: 'mock'
      });
    }

    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const db = await getDbClient();

    // Get user's chats
    const { data: chats, error: chatsError } = await db
      .from('chats')
      .select(`
        id,
        user1_id,
        user2_id,
        created_at,
        updated_at,
        other_user:profiles!chats_user2_id_fkey(
          id,
          full_name,
          avatar_url,
          bio
        )
      `)
      .or(`user1_id.eq.${authUser.userId},user2_id.eq.${authUser.userId}`)
      .order('updated_at', { ascending: false });

    if (chatsError) {
      console.error('Error fetching chats:', chatsError);
      return NextResponse.json(
        { error: 'Failed to fetch chats' },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const transformedChats = chats?.map((chat: any) => ({
      id: chat.id,
      matched_user: chat.user1_id === authUser.userId ? chat.other_user : {
        id: chat.user1_id,
        full_name: 'Unknown User',
        avatar_url: null,
        is_online: false,
        last_seen: null,
      },
      last_message: {
        content: '',
        sender_id: '',
        created_at: chat.updated_at,
        message_type: 'text',
      },
      unread_count: 0,
      compatibility_score: 80,
      matched_at: chat.created_at,
    })) || [];

    return NextResponse.json({ 
      chats: transformedChats,
      mode: 'real',
      region: isChinaDeployment() ? 'CN' : 'INTL'
    });
  } catch (error) {
    console.error('Error in chat list API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
