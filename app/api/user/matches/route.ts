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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    // Query matches from database where user is either user_1 or user_2
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id,
        user_1,
        user_2,
        match_score,
        matched_at
      `)
      .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
      .order('matched_at', { ascending: false })
      .limit(limit);

    if (matchesError) {
      console.error('Failed to fetch matches:', matchesError);
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    // If no matches found, return empty array
    if (!matchesData || matchesData.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    // Get the IDs of matched users (the other user in each match)
    const matchedUserIds = matchesData.map(match =>
      match.user_1 === user.id ? match.user_2 : match.user_1
    );

    // Fetch user profiles for matched users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .in('id', matchedUserIds);

    // Also try to get real_name from user_profiles
    const { data: profilesData } = await supabase
      .from('user_profiles')
      .select('user_id, real_name')
      .in('user_id', matchedUserIds);

    // Create a map of user data for quick lookup
    const userMap = new Map();
    usersData?.forEach(u => {
      userMap.set(u.id, {
        id: u.id,
        full_name: u.username || 'User',
        avatar_url: u.avatar_url
      });
    });

    // Merge with profile data (real_name takes priority)
    profilesData?.forEach(p => {
      if (userMap.has(p.user_id) && p.real_name) {
        const userData = userMap.get(p.user_id);
        userData.full_name = p.real_name;
      }
    });

    // Build the response
    const matches = matchesData.map(match => {
      const matchedUserId = match.user_1 === user.id ? match.user_2 : match.user_1;
      const matchedUser = userMap.get(matchedUserId) || {
        id: matchedUserId,
        full_name: 'User',
        avatar_url: null
      };

      return {
        id: match.id,
        matched_user: matchedUser,
        compatibility_score: match.match_score || Math.floor(Math.random() * 30) + 70, // Fallback to random 70-100 if no score
        matched_at: match.matched_at
      };
    });

    return NextResponse.json({ matches });
  } catch (error) {
    console.error('Matches API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
