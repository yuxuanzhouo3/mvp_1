/**
 * 聊天室消息 API
 * GET: 获取指定聊天室的消息
 * POST: 发送消息
 * DELETE: 撤回消息
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { notifyNewMessage } from '@/lib/services/notifications';
import { isUserInRoom } from '@/lib/services/user-presence';
import { checkAndConsumeCredits, CREDIT_COSTS } from '@/lib/credits/credits';

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

// GET: 获取消息
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDbClient();
    const roomId = params.roomId;
    const isCN = isChinaDeployment();

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const before = searchParams.get('before') || null;

    // 尝试调用 RPC 函数获取消息 (INTL 环境)
    if (!isCN) {
      try {
        const { data: messages, error: messagesError } = await db.rpc('get_messages', {
          p_room_id: roomId,
          p_limit: limit,
          p_before_timestamp: before,
        });

        if (!messagesError && messages) {
          // 标记消息为已读
          await db.rpc('mark_messages_as_read', {
            p_room_id: roomId,
            p_user_id: authUser.userId,
          });

          // 转换数据格式
          const formattedMessages = (messages || []).map((msg: Record<string, unknown>) => ({
            id: msg.message_id,
            room_id: msg.room_id,
            sender_id: msg.sender_id,
            content: msg.content,
            message_type: msg.message_type || 'text',
            reply_to_message_id: msg.reply_to_message_id,
            metadata: msg.metadata || {},
            is_read: msg.is_read || false,
            read_at: msg.read_at,
            sent_at: msg.sent_at,
            deleted_at: msg.deleted_at,
            reply_content: msg.reply_content,
            reply_sender_id: msg.reply_sender_id,
          }));

          return NextResponse.json({
            success: true,
            messages: formattedMessages,
            region: 'INTL'
          });
        }
      } catch (rpcError) {
        console.log('RPC not available, falling back to direct query');
      }
    }

    // 直接查询消息 (CN 环境或 RPC 失败时)
    let query = db
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .is('deleted_at', null)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('sent_at', before);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messages: (messages || []).reverse(),
      region: isCN ? 'CN' : 'INTL'
    });
  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: 发送消息
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDbClient();
    const roomId = params.roomId;
    const isCN = isChinaDeployment();

    // 解析请求体
    const body = await request.json();
    const { content, message_type = 'text', metadata = {}, reply_to_message_id } = body;

    if (!content && message_type === 'text') {
      return NextResponse.json({ error: 'Content is required for text messages' }, { status: 400 });
    }

    // Check and consume credits for sending message
    const creditResult = await checkAndConsumeCredits(authUser.userId, 'message');
    if (!creditResult.success) {
      return NextResponse.json({
        error: creditResult.error || 'Insufficient credits',
        errorCode: creditResult.errorCode,
        required: CREDIT_COSTS.MESSAGE,
      }, { status: 402 });
    }

    // 验证用户是否有权限发送消息到此聊天室
    const { data: room, error: roomError } = await db
      .from('chat_rooms')
      .select(`
        id,
        match_id,
        matches!inner (
          user_1,
          user_2
        )
      `)
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Chat room not found' }, { status: 404 });
    }

    const match = room.matches as unknown as { user_1: string; user_2: string };
    if (!match || (match.user_1 !== authUser.userId && match.user_2 !== authUser.userId)) {
      return NextResponse.json({ error: 'Unauthorized to send message to this room' }, { status: 403 });
    }

    // 插入消息
    const { data: message, error: insertError } = await db
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: authUser.userId,
        content,
        message_type,
        metadata,
        reply_to_message_id: reply_to_message_id || null,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Send push notification to the recipient
    const recipientId = match.user_1 === authUser.userId ? match.user_2 : match.user_1;

    // Check if recipient is currently viewing this chat room
    isUserInRoom(recipientId, roomId).then(async (isInRoom) => {
      if (isInRoom) {
        console.log(`[Messages API] Recipient ${recipientId} is in room ${roomId}, skipping push notification`);
        return;
      }

      // Get sender's name for notification
      const { data: senderProfile } = await db
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', authUser.userId)
        .single();

      const senderName = senderProfile?.full_name || (isCN ? '有人' : 'Someone');

      // Send notification
      notifyNewMessage(
        recipientId,
        senderName,
        content || '',
        roomId,
        authUser.userId,
        message_type
      ).catch((err) => {
        console.warn('[Messages API] Failed to send push notification:', err);
      });
    }).catch((err) => {
      console.warn('[Messages API] Failed to check user presence:', err);
    });

    return NextResponse.json({
      success: true,
      message,
      region: isCN ? 'CN' : 'INTL'
    });
  } catch (error) {
    console.error('Error in send message API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 撤回消息
export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDbClient();
    const isCN = isChinaDeployment();

    // 获取要撤回的消息 ID
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // INTL 环境尝试调用 RPC 函数
    if (!isCN) {
      try {
        const { data: success, error: recallError } = await db.rpc('recall_message', {
          p_message_id: messageId,
          p_user_id: authUser.userId,
        });

        if (!recallError) {
          return NextResponse.json({
            success: true,
            recalled: success,
            region: 'INTL'
          });
        }
      } catch (rpcError) {
        console.log('RPC not available, falling back to direct update');
      }
    }

    // 直接更新消息 (CN 环境或 RPC 失败时)
    // 首先验证消息是否属于当前用户
    const { data: message, error: msgError } = await db
      .from('messages')
      .select('id, sender_id, sent_at')
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.sender_id !== authUser.userId) {
      return NextResponse.json({ error: 'Cannot recall message sent by others' }, { status: 403 });
    }

    // 检查是否在撤回时间限制内 (2分钟)
    const sentAt = new Date(message.sent_at).getTime();
    const now = Date.now();
    if (now - sentAt > 2 * 60 * 1000) {
      return NextResponse.json({ error: isCN ? '消息撤回时间已过' : 'Message recall time limit exceeded' }, { status: 400 });
    }

    // 标记消息为已删除
    const { error: updateError } = await db
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId);

    if (updateError) {
      console.error('Error recalling message:', updateError);
      return NextResponse.json({ error: 'Failed to recall message' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      recalled: true,
      region: isCN ? 'CN' : 'INTL'
    });
  } catch (error) {
    console.error('Error in recall message API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
