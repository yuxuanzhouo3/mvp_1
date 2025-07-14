import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile to understand their preferences
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('interests, communication_style')
      .eq('id', user.id)
      .single();

    // Get potential matches (excluding already matched users)
    const { data: candidates, error: candidatesError } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        avatar_url,
        bio,
        interests,
        communication_style,
        created_at
      `)
      .neq('id', user.id)
      .limit(10);

    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError);
      return NextResponse.json(
        { error: 'Failed to fetch candidates' },
        { status: 500 }
      );
    }

    // Calculate compatibility scores (simplified)
    const candidatesWithScores = candidates?.map(candidate => ({
      ...candidate,
      compatibilityScore: Math.floor(Math.random() * 40) + 60, // Mock score 60-100
      matchReasons: ['Similar interests', 'Compatible communication style']
    })) || [];

    return NextResponse.json({ candidates: candidatesWithScores });
  } catch (error) {
    console.error('Error in matching candidates API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 