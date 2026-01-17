/**
 * 用户匹配列表 API
 * GET /api/user/matches - 获取用户的匹配列表
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

  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');

  if (isChinaDeployment()) {
    // CN 环境: 支持 cn_ 前缀的用户 ID token
    if (token.startsWith('cn_')) {
      const userId = token.substring(3);
      if (userId) {
        return { userId };
      }
    }

    // 尝试从 token 中解析用户信息 (JWT)
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
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        const anonClient = createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
        const { data: { user }, error } = await anonClient.auth.getUser(token);
        if (!error && user) {
          return { userId: user.id, email: user.email };
        }
      }
    } catch {}
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    const db = await getDbClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    // Query matches from database where user is either user_1 or user_2
    const { data: matchesData, error: matchesError } = await db
      .from('matches')
      .select(`
        id,
        user_1,
        user_2,
        match_score,
        matched_at
      `)
      .or(`user_1.eq.${authUser.userId},user_2.eq.${authUser.userId}`)
      .order('matched_at', { ascending: false })
      .limit(limit);

    if (matchesError) {
      console.error('Failed to fetch matches:', matchesError);
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
    }

    // If no matches found, return empty array
    if (!matchesData || matchesData.length === 0) {
      return NextResponse.json({ 
        matches: [],
        region: isChinaDeployment() ? 'CN' : 'INTL'
      });
    }

    // Get the IDs of matched users (the other user in each match)
    const matchedUserIds = matchesData.map((match: any) =>
      match.user_1 === authUser.userId ? match.user_2 : match.user_1
    );

    // Fetch user profiles for matched users
    const { data: usersData } = await db
      .from('users')
      .select('id, username, avatar_url')
      .in('id', matchedUserIds);

    // Also try to get real_name from user_profiles
    const { data: profilesData } = await db
      .from('user_profiles')
      .select('user_id, real_name')
      .in('user_id', matchedUserIds);

    // Create a map of user data for quick lookup
    const userMap = new Map();
    usersData?.forEach((u: any) => {
      userMap.set(u.id, {
        id: u.id,
        full_name: u.username || 'User',
        avatar_url: u.avatar_url
      });
    });

    // Merge with profile data (real_name takes priority)
    profilesData?.forEach((p: any) => {
      if (userMap.has(p.user_id) && p.real_name) {
        const userData = userMap.get(p.user_id);
        userData.full_name = p.real_name;
      }
    });

    // Build the response
    const matches = matchesData.map((match: any) => {
      const matchedUserId = match.user_1 === authUser.userId ? match.user_2 : match.user_1;
      const matchedUser = userMap.get(matchedUserId) || {
        id: matchedUserId,
        full_name: 'User',
        avatar_url: null
      };

      return {
        id: match.id,
        matched_user: matchedUser,
        compatibility_score: match.match_score || Math.floor(Math.random() * 30) + 70, // Fallback to random 70-100 if no score
        matched_at: match.matched_at
      };
    });

    return NextResponse.json({ 
      matches,
      region: isChinaDeployment() ? 'CN' : 'INTL'
    });
  } catch (error) {
    console.error('Matches API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
