import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MatchingEngine } from '@/lib/matching/engine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh');
    const limit = parseInt(searchParams.get('limit') || '10');
    const refreshToken = refresh || Date.now().toString();

    console.log('🔍 Finding matches for user:', user.id, 'refresh:', refresh, 'limit:', limit);

    // Initialize matching engine
    const matchingEngine = MatchingEngine.getInstance();
    await matchingEngine.loadUserProfiles();

    // Get user preferences
    const { data: preferences } = await supabase
      .from('match_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Find matches using AI engine
    const matches = await matchingEngine.findMatches(
      user.id, 
      limit, 
      refreshToken,
      preferences
    );

    console.log('✅ Found', matches.length, 'matches for user:', user.id);

    // Transform matches to candidate format
    const candidates = matches.map(match => ({
      id: match.user.id,
      full_name: match.user.full_name,
      avatar_url: match.user.avatar_url,
      age: match.user.age,
      location: match.user.location,
      bio: match.user.bio,
      interests: match.user.interests,
      industry: match.user.industry,
      communication_style: match.user.communication_style,
      compatibility_score: match.score,
      common_interests: match.common_interests,
      match_reasons: match.reasons,
      match_strength: match.match_strength,
      conversation_starters: match.conversation_starters,
      is_online: match.user.is_online,
      is_premium: match.user.is_premium,
      is_verified: match.user.is_verified,
      last_seen: match.user.last_seen,
      compatibility_factors: match.compatibility_factors
    }));

    return NextResponse.json({ 
      candidates,
      refresh_token: refreshToken,
      total_found: matches.length,
      user_id: user.id
    });
  } catch (error) {
    console.error('❌ Candidates API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 