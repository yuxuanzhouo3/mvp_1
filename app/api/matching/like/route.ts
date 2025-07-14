import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { targetUserId } = await request.json();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create a like record
    const { data: like, error: likeError } = await supabase
      .from('likes')
      .insert({
        user_id: user.id,
        target_user_id: targetUserId,
        like_type: 'like'
      })
      .select()
      .single();

    if (likeError) {
      console.error('Error creating like:', likeError);
      return NextResponse.json(
        { error: 'Failed to create like' },
        { status: 500 }
      );
    }

    // Check if this creates a match (both users liked each other)
    const { data: mutualLike } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('target_user_id', user.id)
      .eq('like_type', 'like')
      .single();

    if (mutualLike) {
      // Create a match
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          user1_id: user.id,
          user2_id: targetUserId,
          compatibility_score: Math.floor(Math.random() * 40) + 60,
          match_reasons: ['Mutual interest', 'Compatible personalities']
        })
        .select()
        .single();

      if (matchError) {
        console.error('Error creating match:', matchError);
      } else {
        // Create a chat for the matched users
        await supabase
          .from('chats')
          .insert({
            user1_id: user.id,
            user2_id: targetUserId
          });
      }

      return NextResponse.json({ 
        like, 
        isMatch: true, 
        match: match || null 
      });
    }

    return NextResponse.json({ like, isMatch: false });
  } catch (error) {
    console.error('Error in matching like API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 