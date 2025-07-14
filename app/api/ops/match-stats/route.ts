import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get match statistics
    const { data: matches, error: matchesError } = await supabase
      .from('user_matches')
      .select('*');

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      return NextResponse.json(
        { error: 'Failed to fetch matches' },
        { status: 500 }
      );
    }

    // Get match history for scores
    const { data: matchHistory, error: historyError } = await supabase
      .from('match_history')
      .select('*');

    if (historyError) {
      console.error('Error fetching match history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch match history' },
        { status: 500 }
      );
    }

    // Get user interests for top interests
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('interests');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const totalMatches = matches?.length || 0;
    const successfulMatches = totalMatches; // All matches in user_matches are successful
    const averageScore = matchHistory?.length > 0 
      ? matchHistory.reduce((sum, match) => sum + match.score, 0) / matchHistory.length 
      : 0;

    // Calculate top interests
    const interestCounts: Record<string, number> = {};
    profiles?.forEach(profile => {
      profile.interests?.forEach((interest: string) => {
        interestCounts[interest] = (interestCounts[interest] || 0) + 1;
      });
    });

    const topInterests = Object.entries(interestCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([interest]) => interest);

    const stats = {
      totalMatches,
      successfulMatches,
      averageScore: Math.round(averageScore * 100) / 100,
      topInterests,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Match stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 