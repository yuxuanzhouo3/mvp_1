import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MatchingEngine } from '@/lib/matching/engine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const matchingEngine = MatchingEngine.getInstance();
    await matchingEngine.loadUserProfiles();
    
    const matches = await matchingEngine.findMatches(userId, limit);

    // Save match history for analytics
    for (const match of matches.slice(0, 5)) { // Save top 5 matches
      await matchingEngine.saveMatch(
        userId,
        match.user.id,
        match.score,
        match.reasons
      );
    }

    return NextResponse.json({
      matches,
      total: matches.length,
    });
  } catch (error) {
    console.error('Matching error:', error);
    return NextResponse.json(
      { error: 'Failed to find matches' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, matchedUserId, action } = await request.json();

    if (!userId || !matchedUserId || !action) {
      return NextResponse.json(
        { error: 'User ID, matched user ID, and action are required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'like':
        // Create a match if both users like each other
        const { data: existingMatch } = await supabase
          .from('user_matches')
          .select('*')
          .or(`user_id.eq.${matchedUserId},matched_user_id.eq.${matchedUserId}`)
          .or(`user_id.eq.${userId},matched_user_id.eq.${userId}`)
          .single();

        if (existingMatch) {
          // Both users have liked each other - create a match
          await supabase.from('user_matches').insert({
            user_id: userId,
            matched_user_id: matchedUserId,
          });

          return NextResponse.json({
            message: 'It\'s a match!',
            isMatch: true,
          });
        } else {
          // First like - store for potential future match
          await supabase.from('user_likes').insert({
            user_id: userId,
            liked_user_id: matchedUserId,
          });

          return NextResponse.json({
            message: 'Like recorded',
            isMatch: false,
          });
        }

      case 'pass':
        // Record pass to avoid showing this user again
        await supabase.from('user_passes').insert({
          user_id: userId,
          passed_user_id: matchedUserId,
        });

        return NextResponse.json({
          message: 'Pass recorded',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Match action error:', error);
    return NextResponse.json(
      { error: 'Failed to process match action' },
      { status: 500 }
    );
  }
} 