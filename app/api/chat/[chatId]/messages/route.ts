import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { checkAndConsumeCredits, CREDIT_COSTS } from '@/lib/credits/credits';

export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get messages for the chat room
    const { data: messages, error: messagesError } = await supabase
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
    const senderIds = Array.from(new Set(messages?.map(m => m.sender_id) || []));
    const { data: senders } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .in('id', senderIds);

    const senderMap = new Map(senders?.map(s => [s.id, s]) || []);

    // Map messages with sender info
    const messagesWithSenders = messages?.map(m => ({
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
    const supabase = createClient();
    const { content, messageType = 'text' } = await request.json();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check and consume credits for sending a message
    const creditsResult = await checkAndConsumeCredits(user.id, 'message');

    if (!creditsResult.success) {
      return NextResponse.json(
        {
          error: creditsResult.error || 'INSUFFICIENT_CREDITS',
          errorCode: creditsResult.errorCode || 'INSUFFICIENT_CREDITS',
          requiredCredits: CREDIT_COSTS.MESSAGE,
        },
        { status: 402 } // Payment Required
      );
    }

    // Create new message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        room_id: params.chatId,
        sender_id: user.id,
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
    const { data: sender } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .eq('id', user.id)
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