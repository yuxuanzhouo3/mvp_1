import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client for this request
    const supabase = createRouteHandlerClient();

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get total matches count
    const { count: totalMatches, error: matchError } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('status', 'matched');

    // Get total messages sent by user
    const { count: totalMessages, error: msgError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', user.id);

    // Get active chats count
    const { count: activeChats, error: chatError } = await supabase
      .from('chat_rooms')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get user profile for completion calculation
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Calculate profile completion percentage
    let profileCompletion = 0;
    if (profile) {
      const fields = [
        'full_name',
        'avatar_url',
        'bio',
        'location',
        'gender',
        'birth_date',
        'height_cm',
        'education_level',
        'occupation',
        'interests'
      ];

      let completedFields = 0;
      for (const field of fields) {
        const value = profile[field];
        if (value !== null && value !== undefined && value !== '' &&
            !(Array.isArray(value) && value.length === 0)) {
          completedFields++;
        }
      }
      profileCompletion = Math.round((completedFields / fields.length) * 100);
    }

    const stats = {
      totalMatches: totalMatches || 0,
      totalMessages: totalMessages || 0,
      activeChats: activeChats || 0,
      profileCompletion
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
