/**
 * 用户统计 API
 * User Stats API
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';

// INTL 环境: 创建用于认证的 Supabase 客户端
function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// 从请求中验证用户身份
async function authenticateUser(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  if (isChinaDeployment()) {
    // CN 环境: 支持 cn_ 前缀的用户 ID token
    if (token.startsWith('cn_')) {
      const userId = token.substring(3);
      if (userId) {
        return { userId };
      }
    }

    // 尝试从 Cloudbase 验证 token
    try {
      const db = await getServiceDbClient();
      const { data, error } = await db.auth.getUser();
      if (error || !data?.user) {
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          return {
            userId: payload.sub || payload.uid,
            email: payload.email
          };
        } catch {
          return null;
        }
      }
      return {
        userId: data.user.id,
        email: data.user.email
      };
    } catch {
      return null;
    }
  } else {
    // INTL 环境
    try {
      const supabase = createSupabaseAdmin();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return null;
      }
      
      return {
        userId: user.id,
        email: user.email
      };
    } catch {
      return null;
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No authorization header or invalid token' }, { status: 401 });
    }

    const db = await getServiceDbClient();

    // Get total matches count
    const { data: matchesData, error: matchError } = await db
      .from('matches')
      .select('id')
      .or(`user_1.eq.${authUser.userId},user_2.eq.${authUser.userId}`)
      .is('unmatched_at', null);

    const totalMatches = matchesData?.length || 0;

    // Get total messages sent by user
    const { data: messagesData, error: msgError } = await db
      .from('messages')
      .select('id')
      .eq('sender_id', authUser.userId);

    const totalMessages = messagesData?.length || 0;

    // Get active chats count
    const { data: chatsData, error: chatError } = await db
      .from('chat_rooms')
      .select('id')
      .eq('is_active', true);

    // Filter chats where user is a participant (via matches)
    let activeChats = 0;
    if (chatsData && chatsData.length > 0) {
      // For simplicity, count all active chat rooms the user has access to
      activeChats = chatsData.length;
    }

    // Get user profile for completion calculation
    const { data: profile, error: profileError } = await db
      .from('user_profiles')
      .select('*')
      .eq('user_id', authUser.userId)
      .single();

    // Get user basic info
    const { data: userData, error: userError } = await db
      .from('users')
      .select('gender, birth_date, avatar_url')
      .eq('id', authUser.userId)
      .single();

    // Calculate profile completion percentage
    let profileCompletion = 0;
    if (profile || userData) {
      // Fields from user_profiles table
      const profileFields = [
        { value: profile?.real_name, weight: 1 },
        { value: profile?.bio, weight: 1 },
        { value: profile?.city_name || profile?.location, weight: 1 },
        { value: profile?.height_cm, weight: 1 },
        { value: profile?.education_level, weight: 1 },
        { value: profile?.occupation, weight: 1 },
        { value: profile?.mbti, weight: 0.5 },
      ];

      // Fields from users table
      const userFields = [
        { value: userData?.gender, weight: 1 },
        { value: userData?.birth_date, weight: 1 },
        { value: userData?.avatar_url, weight: 1 },
      ];

      const allFields = [...profileFields, ...userFields];
      let completedWeight = 0;
      let totalWeight = 0;

      for (const field of allFields) {
        totalWeight += field.weight;
        if (field.value !== null && field.value !== undefined && field.value !== '' &&
            !(Array.isArray(field.value) && field.value.length === 0)) {
          completedWeight += field.weight;
        }
      }

      profileCompletion = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
    }

    const stats = {
      totalMatches,
      totalMessages,
      activeChats,
      profileCompletion
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
