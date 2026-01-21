/**
 * 聊天消息 API
 * GET /api/chat/[chatId]/messages - 获取聊天消息
 * POST /api/chat/[chatId]/messages - 发送消息
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { checkAndConsumeCredits, CREDIT_COSTS } from '@/lib/credits/credits';
import { canSendMessage } from '@/lib/api/privacyFilter';

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
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDbClient();

    // Get messages for the chat room
    const { data: messages, error: messagesError } = await db
      .from('messages')
      .select(`
        id,
        content,
        message_type,
        sent_at,
        sender_id
      `)
      .eq('room_id', params.chatId)
      .is('deleted_at', null)
      .order('sent_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Get sender info for all messages
    const senderIds = Array.from(new Set(messages?.map((m: any) => m.sender_id) || []));
    let senders: any[] = [];
    
    if (senderIds.length > 0) {
      const { data } = await db
        .from('users')
        .select('id, username, avatar_url')
        .in('id', senderIds);
      senders = data || [];
    }

    const senderMap = new Map(senders.map((s: any) => [s.id, s]));

    // Map messages with sender info
    const messagesWithSenders = messages?.map((m: any) => ({
      id: m.id,
      content: m.content,
      message_type: m.message_type,
      created_at: m.sent_at,
      sender: senderMap.get(m.sender_id) ? {
        id: m.sender_id,
        full_name: senderMap.get(m.sender_id)?.username || 'User',
        avatar_url: senderMap.get(m.sender_id)?.avatar_url,
      } : null,
    })) || [];

    return NextResponse.json({ messages: messagesWithSenders });
  } catch (error) {
    console.error('Error in chat messages API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getDbClient();
    const { content, messageType = 'text' } = await request.json();

    const { data: chatRoom } = await db
      .from('chat_rooms')
      .select('id, match_id')
      .eq('id', params.chatId)
      .single();

    if (!chatRoom?.match_id) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const { data: match } = await db
      .from('matches')
      .select('user_1, user_2')
      .eq('id', chatRoom.match_id)
      .single();

    if (!match?.user_1 || !match?.user_2) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const isParticipant = match.user_1 === authUser.userId || match.user_2 === authUser.userId;
    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const otherUserId = match.user_1 === authUser.userId ? match.user_2 : match.user_1;
    const { data: otherProfile } = await db
      .from('user_profiles')
      .select('privacy_settings')
      .eq('user_id', otherUserId)
      .single();

    if (!canSendMessage(otherProfile?.privacy_settings, true)) {
      return NextResponse.json(
        { error: isChinaDeployment() ? '对方已关闭接收消息' : 'Messaging is disabled by the recipient' },
        { status: 403 }
      );
    }

    // Check and consume credits for sending a message
    const creditsResult = await checkAndConsumeCredits(authUser.userId, 'message');

    if (!creditsResult.success) {
      return NextResponse.json(
        {
          error: creditsResult.error || 'INSUFFICIENT_CREDITS',
          errorCode: creditsResult.errorCode || 'INSUFFICIENT_CREDITS',
          requiredCredits: CREDIT_COSTS.MESSAGE,
        },
        { status: 402 }
      );
    }

    // Create new message
    const { data: message, error: messageError } = await db
      .from('messages')
      .insert({
        room_id: params.chatId,
        sender_id: authUser.userId,
        content,
        message_type: messageType,
      })
      .select(`
        id,
        content,
        message_type,
        sent_at,
        sender_id
      `)
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      );
    }

    // Get sender info
    const { data: sender } = await db
      .from('users')
      .select('id, username, avatar_url')
      .eq('id', authUser.userId)
      .single();

    const messageWithSender = {
      id: message.id,
      content: message.content,
      message_type: message.message_type,
      created_at: message.sent_at,
      sender: sender ? {
        id: sender.id,
        full_name: sender.username || 'User',
        avatar_url: sender.avatar_url,
      } : null,
    };

    return NextResponse.json({ message: messageWithSender });
  } catch (error) {
    console.error('Error in chat messages API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
