/**
 * Candidates API - 获取匹配候选人
 * GET /api/matching/candidates - 获取候选人列表
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';

// 统一认证函数
async function authenticateUser(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization');

  if (isChinaDeployment()) {
    // CN 环境
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    // CN 环境: 支持 cn_ 前缀的用户 ID token
    if (token.startsWith('cn_')) {
      const userId = token.substring(3);
      if (userId) {
        return { userId };
      }
    }
    // 从 token 中解析用户信息 (JWT)
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return {
        userId: payload.sub || payload.uid,
        email: payload.email,
      };
    } catch {
      return null;
    }
  } else {
    // INTL 环境: 使用 Supabase 验证 token
    const db = await getDbClient();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) {
      // 尝试从 header 验证
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (url && key) {
            const anonClient = createClient(url, key, {
              auth: { autoRefreshToken: false, persistSession: false }
            });
            const { data: { user: tokenUser }, error: tokenError } = await anonClient.auth.getUser(token);
            if (!tokenError && tokenUser) {
              return { userId: tokenUser.id, email: tokenUser.email };
            }
          }
        } catch {}
      }
      return null;
    }
    return { userId: user.id, email: user.email };
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting candidates API...');

    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized', errorCode: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const userId = authUser.userId;
    const db = await getDbClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh');
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log('🔍 Finding matches for user:', userId, 'refresh:', refresh, 'limit:', limit);

    // Get all users with their profiles except the current user
    const { data: candidates, error: candidatesError } = await db
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
    const candidateIds = candidates.map((c: any) => c.id);
    const { data: interestsData } = await db
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
    interestsData?.forEach((ui: any) => {
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
    const enrichedCandidates = candidates.map((candidate: any) => {
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
    let sortedCandidates = enrichedCandidates.sort((a: any, b: any) => b.score - a.score);

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
      total_available: candidates.length,
      region: isChinaDeployment() ? 'CN' : 'INTL'
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
  const isCN = isChinaDeployment();
  const reasons = [];

  if (commonInterests.length > 0) {
    reasons.push(isCN 
      ? `共同兴趣: ${commonInterests.slice(0, 2).join(', ')}`
      : `Shared interests: ${commonInterests.slice(0, 2).join(', ')}`);
  }

  if (isOnline) {
    reasons.push(isCN ? '当前在线' : 'Currently online and active');
  }

  if (isVerified) {
    reasons.push(isCN ? '已认证用户' : 'Verified profile');
  }

  if (profile.bio && profile.bio.length > 20) {
    reasons.push(isCN ? '资料详尽' : 'Detailed profile');
  }

  if (reasons.length === 0) {
    reasons.push(isCN ? 'AI智能匹配推荐' : 'AI-powered compatibility match');
  }

  return reasons.slice(0, 3);
}

function generateConversationStarters(
  profile: { bio: string | null; city_name: string | null },
  commonInterests: string[]
): string[] {
  const isCN = isChinaDeployment();
  const starters = [];

  if (commonInterests.length > 0) {
    starters.push(isCN 
      ? `我看到你也喜欢${commonInterests[0]}！是什么让你对它产生兴趣的？`
      : `I see you're interested in ${commonInterests[0]}! What got you into that?`);
  }

  if (profile.bio) {
    starters.push(isCN 
      ? '你的个人简介很有趣，能多分享一些吗？'
      : `Your bio caught my attention. I'd love to hear more about your journey!`);
  }

  if (profile.city_name) {
    starters.push(isCN 
      ? `${profile.city_name}是什么样的地方？最喜欢那里的什么？`
      : `I'm curious about ${profile.city_name}. What's the best thing about living there?`);
  }

  starters.push(isCN ? '是什么让你来到这个平台的？' : 'What brings you to PersonaLink?');
  starters.push(isCN ? '很高兴认识你，想了解更多关于你的事！' : "I'd love to connect and learn more about you!");

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
