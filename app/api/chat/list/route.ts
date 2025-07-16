import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if we're in mock mode
    const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://mock.supabase.co';
    
    if (isMockMode) {
      // In mock mode, return mock chat data matching the frontend's expected structure
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

    // Real Supabase authentication and data fetching
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's chats
    const { data: chats, error: chatsError } = await supabase
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
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('updated_at', { ascending: false });

    if (chatsError) {
      console.error('Error fetching chats:', chatsError);
      return NextResponse.json(
        { error: 'Failed to fetch chats' },
        { status: 500 }
      );
    }

    // Transform data for frontend (should match ChatPreview interface)
    const transformedChats = chats?.map(chat => ({
      id: chat.id,
      matched_user: chat.user1_id === user.id ? chat.other_user : {
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
      mode: 'real'
    });
  } catch (error) {
    console.error('Error in chat list API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 