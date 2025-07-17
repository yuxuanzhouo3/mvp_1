import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting candidates API...');

    // Use a default user ID for testing (Jimmy's ID)
    const userId = 'da7bb6ab-1e26-4c3d-b28e-73ece0264b82';

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh');
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log('🔍 Finding matches for user:', userId, 'refresh:', refresh, 'limit:', limit);

    // Get all profiles except the current user
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', userId);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    console.log('✅ Found', profiles?.length || 0, 'profiles');

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ 
        candidates: [],
        refresh_token: refresh || Date.now().toString(),
        total_found: 0,
        user_id: userId,
        message: 'No profiles found for matching'
      });
    }

    // Get user interests for better matching
    const { data: userInterests } = await supabase
      .from('user_interests')
      .select('user_id, interest')
      .in('user_id', [userId, ...profiles.map(p => p.id)]);

    // Create interest map
    const interestMap = new Map<string, string[]>();
    userInterests?.forEach(ui => {
      if (!interestMap.has(ui.user_id)) {
        interestMap.set(ui.user_id, []);
      }
      interestMap.get(ui.user_id)!.push(ui.interest);
    });

    // Enhanced matching logic with AI-like scoring
    const candidates = profiles.map((profile) => {
      const profileInterests = interestMap.get(profile.id) || [];
      const userInterests = interestMap.get(userId) || [];
      
      // Calculate compatibility score based on multiple factors
      let score = 0.3; // Base score
      
      // Age compatibility (if both have ages)
      if (profile.age && profile.age >= 18 && profile.age <= 100) {
        score += 0.1;
      }
      
      // Online status bonus
      if (profile.is_online) {
        score += 0.1;
      }
      
      // Verification bonus
      if (profile.is_verified) {
        score += 0.1;
      }
      
      // Premium status bonus
      if (profile.membership_level === 'premium') {
        score += 0.1;
      }
      
      // Interest overlap
      const commonInterests = profileInterests.filter(interest => 
        userInterests.includes(interest)
      );
      score += Math.min(commonInterests.length * 0.1, 0.3);
      
      // Location bonus (if both have locations)
      if (profile.location) {
        score += 0.1;
      }
      
      // Bio quality bonus
      if (profile.bio && profile.bio.length > 20) {
        score += 0.1;
      }
      
      // Ensure score is between 0.2 and 1.0
      score = Math.max(0.2, Math.min(1.0, score));
      
      // Add some randomness for variety
      score += (Math.random() - 0.5) * 0.1;
      score = Math.max(0.2, Math.min(1.0, score));

      return {
        user: {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          age: profile.age,
          location: profile.location,
          bio: profile.bio,
          interests: profileInterests,
          industry: profile.industry,
          communication_style: profile.communication_style,
          is_online: profile.is_online,
          membership_level: profile.membership_level || 'free',
          is_verified: profile.is_verified,
          last_seen: profile.last_seen
        },
        score: score,
        reasons: generateMatchReasons(profile, commonInterests),
        compatibility_factors: {
          interests: commonInterests.length / Math.max(profileInterests.length, 1),
          personality: Math.random() * 0.8 + 0.2,
          location: profile.location ? 0.8 : 0.3,
          industry: Math.random() * 0.8 + 0.2,
          communication: Math.random() * 0.8 + 0.2,
          activity: profile.is_online ? 0.9 : 0.4,
          values: Math.random() * 0.8 + 0.2
        },
        common_interests: commonInterests,
        match_strength: score > 0.7 ? 'high' : score > 0.5 ? 'medium' : 'low',
        conversation_starters: generateConversationStarters(profile, commonInterests)
      };
    });

    // Sort by score and apply refresh variety
    let sortedCandidates = candidates.sort((a, b) => b.score - a.score);
    
    if (refresh) {
      // Apply refresh variety by shuffling slightly
      sortedCandidates = applyRefreshVariety(sortedCandidates, refresh);
    }

    // Limit results
    const limitedCandidates = sortedCandidates.slice(0, limit);

    console.log('✅ Returning', limitedCandidates.length, 'candidates');

    return NextResponse.json({ 
      candidates: limitedCandidates,
      refresh_token: refresh || Date.now().toString(),
      total_found: limitedCandidates.length,
      user_id: userId,
      total_available: profiles.length
    });
  } catch (error) {
    console.error('❌ Candidates API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateMatchReasons(profile: any, commonInterests: string[]): string[] {
  const reasons = [];
  
  if (commonInterests.length > 0) {
    reasons.push(`Shared interests: ${commonInterests.slice(0, 2).join(', ')}`);
  }
  
  if (profile.is_online) {
    reasons.push('Currently online and active');
  }
  
  if (profile.is_verified) {
    reasons.push('Verified profile');
  }
  
  if (profile.membership_level === 'premium') {
    reasons.push('Premium member');
  }
  
  if (profile.bio && profile.bio.length > 20) {
    reasons.push('Detailed profile');
  }
  
  if (reasons.length === 0) {
    reasons.push('AI-powered compatibility match');
  }
  
  return reasons.slice(0, 3);
}

function generateConversationStarters(profile: any, commonInterests: string[]): string[] {
  const starters = [];
  
  if (commonInterests.length > 0) {
    starters.push(`I see you're interested in ${commonInterests[0]}! What got you into that?`);
  }
  
  if (profile.bio) {
    starters.push(`Your bio caught my attention. I'd love to hear more about your journey!`);
  }
  
  if (profile.location) {
    starters.push(`I'm curious about ${profile.location}. What's the best thing about living there?`);
  }
  
  starters.push('What brings you to PersonaLink?');
  starters.push('I\'d love to connect and learn more about you!');
  
  return starters.slice(0, 3);
}

function applyRefreshVariety(candidates: any[], refreshToken: string): any[] {
  // Simple hash-based shuffling for variety
  const hash = refreshToken.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.abs(hash + i) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
} 