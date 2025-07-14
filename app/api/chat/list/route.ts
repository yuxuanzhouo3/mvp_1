import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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

    // Transform data for frontend
    const transformedChats = chats?.map(chat => ({
      id: chat.id,
      otherUser: chat.user1_id === user.id ? chat.other_user : {
        id: chat.user1_id,
        full_name: 'Unknown User',
        avatar_url: null,
        bio: null
      },
      lastMessage: null, // This would be populated from messages table
      updatedAt: chat.updated_at
    })) || [];

    return NextResponse.json({ chats: transformedChats });
  } catch (error) {
    console.error('Error in chat list API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 