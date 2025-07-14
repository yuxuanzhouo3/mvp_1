import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's matches
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id,
        user1_id,
        user2_id,
        compatibility_score,
        match_reasons,
        created_at,
        matched_user:profiles!matches_user2_id_fkey(
          id,
          full_name,
          avatar_url,
          bio
        )
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      return NextResponse.json(
        { error: 'Failed to fetch matches' },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const transformedMatches = matches?.map(match => ({
      id: match.id,
      matchedUser: match.user1_id === user.id ? match.matched_user : {
        id: match.user1_id,
        full_name: 'Unknown User',
        avatar_url: null,
        bio: null
      },
      compatibilityScore: match.compatibility_score,
      matchReasons: match.match_reasons,
      matchedAt: match.created_at
    })) || [];

    return NextResponse.json({ matches: transformedMatches });
  } catch (error) {
    console.error('Error in user matches API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 