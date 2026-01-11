import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role key for server-side operations
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Create a Supabase client with anon key for token verification only
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');

    // Create clients
    const anonClient = createAnonClient();
    const supabase = createServiceClient();

    // Verify the token and get user
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get total matches count (user_1 and user_2 fields, active matches where unmatched_at IS NULL)
    const { count: totalMatches, error: matchError } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
      .is('unmatched_at', null);

    // Get total messages sent by user
    const { count: totalMessages, error: msgError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', user.id);

    // Get active chats count (rooms where user is a participant)
    const { count: activeChats, error: chatError } = await supabase
      .from('chat_rooms')
      .select('*', { count: 'exact', head: true })
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('is_active', true);

    // Get user profile for completion calculation
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get user basic info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('gender, birth_date, avatar_url')
      .eq('id', user.id)
      .single();

    // Calculate profile completion percentage
    let profileCompletion = 0;
    if (profile || userData) {
      // Fields from user_profiles table
      const profileFields = [
        { value: profile?.real_name, weight: 1 },
        { value: profile?.bio, weight: 1 },
        { value: profile?.city_name || profile?.location, weight: 1 },
        { value: profile?.height_cm, weight: 1 },
        { value: profile?.education_level, weight: 1 },
        { value: profile?.occupation, weight: 1 },
        { value: profile?.mbti, weight: 0.5 },
      ];

      // Fields from users table
      const userFields = [
        { value: userData?.gender, weight: 1 },
        { value: userData?.birth_date, weight: 1 },
        { value: userData?.avatar_url, weight: 1 },
      ];

      const allFields = [...profileFields, ...userFields];
      let completedWeight = 0;
      let totalWeight = 0;

      for (const field of allFields) {
        totalWeight += field.weight;
        if (field.value !== null && field.value !== undefined && field.value !== '' &&
            !(Array.isArray(field.value) && field.value.length === 0)) {
          completedWeight += field.weight;
        }
      }

      profileCompletion = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
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
