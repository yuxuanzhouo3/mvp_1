import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Mock matches data
const MOCK_MATCHES = [
  {
    id: 'match-1',
    matched_user: {
      id: 'user-1',
      full_name: 'Sarah Chen',
      avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    },
    compatibility_score: 85,
    matched_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'match-2',
    matched_user: {
      id: 'user-2',
      full_name: 'Alex Johnson',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    },
    compatibility_score: 92,
    matched_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'match-3',
    matched_user: {
      id: 'user-3',
      full_name: 'Maria Garcia',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    },
    compatibility_score: 78,
    matched_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  try {
    // Check if we're in mock mode
    const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (isMockMode) {
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get('limit') || '10');
      const mockMatches = MOCK_MATCHES.slice(0, limit);
      return NextResponse.json({ matches: mockMatches });
    }

    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user matches
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id,
        matched_user:profiles!matches_match_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        compatibility_score:score,
        matched_at:created_at
      `)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      return NextResponse.json(
        { error: 'Failed to fetch matches' },
        { status: 500 }
      );
    }

    return NextResponse.json({ matches });
  } catch (error) {
    console.error('Error in user matches API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 