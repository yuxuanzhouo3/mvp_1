import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    // Check if we're in mock mode
    const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://mock.supabase.co';
    
    if (isMockMode) {
      // Return mock user data
      const mockUser = {
        id: 'mock-user-2',
        full_name: 'Mock User 2',
        avatar_url: 'https://via.placeholder.com/150',
        is_online: true,
        last_seen: new Date().toISOString(),
      };

      return NextResponse.json({ 
        user: mockUser,
        mode: 'mock'
      });
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get chat information to find the other user
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('user1_id, user2_id')
      .eq('id', params.chatId)
      .single();

    if (chatError || !chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Determine which user is the other participant
    const otherUserId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id;

    // Get the other user's profile
    const { data: otherUser, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, last_seen')
      .eq('id', otherUserId)
      .single();

    if (userError || !otherUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Determine if user is online (simple check - if last_seen is within 5 minutes)
    const lastSeen = new Date(otherUser.last_seen || 0);
    const now = new Date();
    const isOnline = (now.getTime() - lastSeen.getTime()) < 5 * 60 * 1000; // 5 minutes

    const chatUser = {
      id: otherUser.id,
      full_name: otherUser.full_name,
      avatar_url: otherUser.avatar_url,
      is_online: isOnline,
      last_seen: otherUser.last_seen,
    };

    return NextResponse.json({ 
      user: chatUser,
      mode: 'real'
    });
  } catch (error) {
    console.error('Error in chat user API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 