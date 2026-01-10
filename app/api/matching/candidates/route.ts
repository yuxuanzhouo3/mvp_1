import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting candidates API...');

    const supabase = createRouteHandlerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', errorCode: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh');
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log('🔍 Finding matches for user:', userId, 'refresh:', refresh, 'limit:', limit);

    // Get all users with their profiles except the current user
    const { data: candidates, error: candidatesError } = await supabase
      .from('users')
      .select(`
        id,
        username,
        avatar_url,
        gender,
        birth_date,
        verification_level,
        last_active_at,
        user_profiles!inner (
          real_name,
          bio,
          city_name,
          occupation,
          education_level,
          mbti
        )
      `)
      .neq('id', userId)
      .eq('account_status', 'active');

    if (candidatesError) {
      console.error('❌ Error fetching candidates:', candidatesError);
      return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
    }

    console.log('✅ Found', candidates?.length || 0, 'candidates');

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({
        candidates: [],
        refresh_token: refresh || Date.now().toString(),
        total_found: 0,
        user_id: userId,
        message: 'No candidates found for matching'
      });
    }

    // Get user interests for all candidates
    const candidateIds = candidates.map(c => c.id);
    const { data: interestsData } = await supabase
      .from('users_interests_map')
      .select(`
        user_id,
        interests!inner (
          name,
          category
        )
      `)
      .in('user_id', [userId, ...candidateIds]);

    // Create interest map
    const interestMap = new Map<string, string[]>();
    interestsData?.forEach(ui => {
      if (!interestMap.has(ui.user_id)) {
        interestMap.set(ui.user_id, []);
      }
      const interest = ui.interests as unknown as { name: string; category: string };
      interestMap.get(ui.user_id)!.push(interest.name);
    });

    const currentUserInterests = interestMap.get(userId) || [];

    // Calculate age from birth_date
    const calculateAge = (birthDate: string | null): number | null => {
      if (!birthDate) return null;
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    };

    // Check if user is online (active in last 5 minutes)
    const isOnline = (lastActive: string | null): boolean => {
      if (!lastActive) return false;
      const lastActiveDate = new Date(lastActive);
      const now = new Date();
      return (now.getTime() - lastActiveDate.getTime()) < 5 * 60 * 1000;
    };

    // Enhanced matching logic with scoring
    const enrichedCandidates = candidates.map((candidate) => {
      const profile = candidate.user_profiles as unknown as {
        real_name: string | null;
        bio: string | null;
        city_name: string | null;
        occupation: string | null;
        education_level: string | null;
        mbti: string | null;
      };

      const candidateInterests = interestMap.get(candidate.id) || [];
      const age = calculateAge(candidate.birth_date);
      const online = isOnline(candidate.last_active_at);
      const isVerified = candidate.verification_level && candidate.verification_level !== 'none';

      // Calculate compatibility score
      let score = 0.3; // Base score

      // Age bonus
      if (age && age >= 18 && age <= 100) {
        score += 0.1;
      }

      // Online status bonus
      if (online) {
        score += 0.1;
      }

      // Verification bonus
      if (isVerified) {
        score += 0.1;
      }

      // Interest overlap
      const commonInterests = candidateInterests.filter(interest =>
        currentUserInterests.includes(interest)
      );
      score += Math.min(commonInterests.length * 0.1, 0.3);

      // Location bonus
      if (profile.city_name) {
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
          id: candidate.id,
          full_name: profile.real_name || candidate.username || 'User',
          avatar_url: candidate.avatar_url,
          age,
          location: profile.city_name,
          bio: profile.bio,
          interests: candidateInterests,
          occupation: profile.occupation,
          education: profile.education_level,
          mbti: profile.mbti,
          is_online: online,
          is_verified: isVerified,
          last_seen: candidate.last_active_at
        },
        score,
        reasons: generateMatchReasons(profile, commonInterests, online, isVerified),
        compatibility_factors: {
          interests: commonInterests.length / Math.max(candidateInterests.length, 1),
          personality: Math.random() * 0.8 + 0.2,
          location: profile.city_name ? 0.8 : 0.3,
          activity: online ? 0.9 : 0.4,
          values: Math.random() * 0.8 + 0.2
        },
        common_interests: commonInterests,
        match_strength: score > 0.7 ? 'high' : score > 0.5 ? 'medium' : 'low',
        conversation_starters: generateConversationStarters(profile, commonInterests)
      };
    });

    // Sort by score and apply refresh variety
    let sortedCandidates = enrichedCandidates.sort((a, b) => b.score - a.score);

    if (refresh) {
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
      total_available: candidates.length
    });
  } catch (error) {
    console.error('❌ Candidates API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateMatchReasons(
  profile: { bio: string | null; city_name: string | null },
  commonInterests: string[],
  isOnline: boolean,
  isVerified: boolean
): string[] {
  const reasons = [];

  if (commonInterests.length > 0) {
    reasons.push(`Shared interests: ${commonInterests.slice(0, 2).join(', ')}`);
  }

  if (isOnline) {
    reasons.push('Currently online and active');
  }

  if (isVerified) {
    reasons.push('Verified profile');
  }

  if (profile.bio && profile.bio.length > 20) {
    reasons.push('Detailed profile');
  }

  if (reasons.length === 0) {
    reasons.push('AI-powered compatibility match');
  }

  return reasons.slice(0, 3);
}

function generateConversationStarters(
  profile: { bio: string | null; city_name: string | null },
  commonInterests: string[]
): string[] {
  const starters = [];

  if (commonInterests.length > 0) {
    starters.push(`I see you're interested in ${commonInterests[0]}! What got you into that?`);
  }

  if (profile.bio) {
    starters.push(`Your bio caught my attention. I'd love to hear more about your journey!`);
  }

  if (profile.city_name) {
    starters.push(`I'm curious about ${profile.city_name}. What's the best thing about living there?`);
  }

  starters.push('What brings you to PersonaLink?');
  starters.push("I'd love to connect and learn more about you!");

  return starters.slice(0, 3);
}

function applyRefreshVariety(candidates: any[], refreshToken: string): any[] {
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
