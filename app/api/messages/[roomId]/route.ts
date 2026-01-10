/**
 * 聊天室消息 API - INTL 环境
 * GET: 获取指定聊天室的消息
 * POST: 发送消息
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { notifyNewMessage } from '@/lib/services/notifications';
import { isUserInRoom } from '@/lib/services/user-presence';
import { checkAndConsumeCredits, CREDIT_COSTS } from '@/lib/credits/credits';

// GET: 获取消息
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = createRouteHandlerClient();
    const roomId = params.roomId;

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

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const before = searchParams.get('before') || null;

    // 调用数据库函数获取消息
    const { data: messages, error: messagesError } = await supabase.rpc('get_messages', {
      p_room_id: roomId,
      p_limit: limit,
      p_before_timestamp: before,
    });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // 标记消息为已读
    await supabase.rpc('mark_messages_as_read', {
      p_room_id: roomId,
      p_user_id: user.id,
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
    const supabase = createRouteHandlerClient();
    const roomId = params.roomId;

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
    const { content, message_type = 'text', metadata = {}, reply_to_message_id } = body;

    if (!content && message_type === 'text') {
      return NextResponse.json({ error: 'Content is required for text messages' }, { status: 400 });
    }

    // Check and consume credits for sending message (1 credit per message)
    const creditResult = await checkAndConsumeCredits(user.id, 'message');
    if (!creditResult.success) {
      return NextResponse.json({
        error: creditResult.error || 'Insufficient credits',
        errorCode: creditResult.errorCode,
        required: CREDIT_COSTS.MESSAGE,
      }, { status: 402 }); // 402 Payment Required
    }

    // 验证用户是否有权限发送消息到此聊天室
    const { data: room, error: roomError } = await supabase
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

    const match = room.matches as { user_1: string; user_2: string };
    if (match.user_1 !== user.id && match.user_2 !== user.id) {
      return NextResponse.json({ error: 'Unauthorized to send message to this room' }, { status: 403 });
    }

    // 插入消息
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: user.id,
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

    // Send push notification to the recipient only if they are NOT in this chat room
    const recipientId = match.user_1 === user.id ? match.user_2 : match.user_1;

    // Check if recipient is currently viewing this chat room
    // If they are, skip push notification to avoid duplicate notifications
    isUserInRoom(recipientId, roomId).then(async (isInRoom) => {
      if (isInRoom) {
        console.log(`[Messages API] Recipient ${recipientId} is in room ${roomId}, skipping push notification`);
        return;
      }

      // Get sender's name for notification
      const { data: senderProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const senderName = senderProfile?.full_name || 'Someone';

      // Send notification (fire and forget)
      notifyNewMessage(
        recipientId,
        senderName,
        content || '',
        roomId,
        user.id,
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

    // 获取要撤回的消息 ID
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // 调用撤回函数
    const { data: success, error: recallError } = await supabase.rpc('recall_message', {
      p_message_id: messageId,
      p_user_id: user.id,
    });

    if (recallError) {
      console.error('Error recalling message:', recallError);
      return NextResponse.json({ error: recallError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      recalled: success,
    });
  } catch (error) {
    console.error('Error in recall message API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

