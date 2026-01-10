import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

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

    // Create Supabase client for this request
    const supabase = createRouteHandlerClient();

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
    // First, try chat_rooms table (new schema)
    let otherUserId: string | null = null;

    const { data: chatRoom, error: chatRoomError } = await supabase
      .from('chat_rooms')
      .select(`
        id,
        match_id,
        matches!inner(user_1, user_2)
      `)
      .eq('id', params.chatId)
      .single();

    if (chatRoom && !chatRoomError) {
      // Determine which user is the other participant
      const matches = chatRoom.matches as unknown as { user_1: string; user_2: string };
      otherUserId = matches.user_1 === user.id ? matches.user_2 : matches.user_1;
    }

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Get the other user's basic info from users table
    const { data: otherUser, error: userError } = await supabase
      .from('users')
      .select('id, username, avatar_url, last_active_at')
      .eq('id', otherUserId)
      .single();

    if (userError || !otherUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Determine if user is online (simple check - if last_active_at is within 5 minutes)
    const lastActive = new Date(otherUser.last_active_at || 0);
    const now = new Date();
    const isOnline = (now.getTime() - lastActive.getTime()) < 5 * 60 * 1000; // 5 minutes

    const chatUser = {
      id: otherUser.id,
      full_name: otherUser.username || 'User',
      avatar_url: otherUser.avatar_url,
      is_online: isOnline,
      last_seen: otherUser.last_active_at,
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
