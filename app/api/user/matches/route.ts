import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get user's matches
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id,
        compatibility_score,
        created_at,
        matched_user:profiles!matches_user2_id_fkey(
          id,
          full_name,
          avatar_url,
          bio,
          location,
          interests
        )
      `)
      .eq('user1_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (matchesError) {
      return NextResponse.json(
        { error: 'Failed to fetch matches' },
        { status: 500 }
      );
    }

    // Also get matches where user is user2
    const { data: reverseMatches, error: reverseError } = await supabase
      .from('matches')
      .select(`
        id,
        compatibility_score,
        created_at,
        matched_user:profiles!matches_user1_id_fkey(
          id,
          full_name,
          avatar_url,
          bio,
          location,
          interests
        )
      `)
      .eq('user2_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (reverseError) {
      return NextResponse.json(
        { error: 'Failed to fetch reverse matches' },
        { status: 500 }
      );
    }

    // Combine and sort matches
    const allMatches = [
      ...(matches || []).map(match => ({
        ...match,
        matched_user: match.matched_user,
      })),
      ...(reverseMatches || []).map(match => ({
        ...match,
        matched_user: match.matched_user,
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ 
      matches: allMatches.slice(0, limit),
      total: allMatches.length
    });
  } catch (error) {
    console.error('Error fetching user matches:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 