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

    // Create a super-like record
    const { data: superLike, error: superLikeError } = await supabase
      .from('likes')
      .insert({
        user_id: user.id,
        target_user_id: targetUserId,
        like_type: 'super_like'
      })
      .select()
      .single();

    if (superLikeError) {
      console.error('Error creating super-like:', superLikeError);
      return NextResponse.json(
        { error: 'Failed to create super-like' },
        { status: 500 }
      );
    }

    // Check if this creates a match (target user liked current user)
    const { data: mutualLike } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('target_user_id', user.id)
      .in('like_type', ['like', 'super_like'])
      .single();

    if (mutualLike) {
      // Create a match with higher compatibility score
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          user1_id: user.id,
          user2_id: targetUserId,
          compatibility_score: Math.floor(Math.random() * 20) + 80, // Higher score 80-100
          match_reasons: ['Super like match', 'High compatibility']
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
        superLike, 
        isMatch: true, 
        match: match || null 
      });
    }

    return NextResponse.json({ superLike, isMatch: false });
  } catch (error) {
    console.error('Error in matching super-like API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 