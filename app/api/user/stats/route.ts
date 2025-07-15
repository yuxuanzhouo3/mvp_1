import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Mock stats data
const MOCK_STATS = {
  totalMatches: 15,
  totalMessages: 127,
  activeChats: 8,
  profileCompletion: 85,
};

export async function GET(request: NextRequest) {
  try {
    // Check if we're in mock mode
    const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (isMockMode) {
      return NextResponse.json({ stats: MOCK_STATS });
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

    // Get user stats
    const { data: stats, error: statsError } = await supabase
      .rpc('get_user_stats', { user_id: user.id });

    if (statsError) {
      console.error('Error fetching stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      );
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error in user stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 