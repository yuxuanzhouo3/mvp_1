/**
 * Recommendations API - 推荐列表接口
 * GET /api/matching/recommendations - 获取推荐列表
 * POST /api/matching/recommendations - 生成新推荐
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { 
  generateDailyRecommendations, 
} from '@/lib/matching/algorithms';
import { 
  transformDbUserToMatchProfile 
} from '@/lib/matching/utils';
import { 
  AlgorithmType, 
  MATCHING_CONFIG,
  ALGORITHM_NAMES
} from '@/lib/matching/types';

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

/**
 * GET /api/matching/recommendations
 * 获取当前用户的推荐列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'AUTH_REQUIRED', errorCode: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const db = await getDbClient();

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const algorithm = (searchParams.get('algorithm') || 'compatible') as AlgorithmType;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '20'),
      MATCHING_CONFIG.MAX_RECOMMENDATION_COUNT
    );
    const includeViewed = searchParams.get('include_viewed') === 'true';

    // 验证算法类型
    const validAlgorithms: AlgorithmType[] = ['compatible', 'romantic', 'pragmatic', 'serendipity'];
    if (!validAlgorithms.includes(algorithm)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ALGORITHM', errorCode: 'INVALID_ALGORITHM' },
        { status: 400 }
      );
    }

    // 构建查询
    let query = db
      .from('recommendations')
      .select(`
        id,
        target_user_id,
        algorithm_type,
        match_score,
        score_details,
        is_viewed,
        status,
        created_at,
        expires_at
      `)
      .eq('user_id', authUser.userId)
      .eq('algorithm_type', algorithm)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('match_score', { ascending: false })
      .limit(limit);

    if (!includeViewed) {
      query = query.eq('is_viewed', false);
    }

    const { data: recommendations, error: recError } = await query;

    if (recError) {
      console.error('Error fetching recommendations:', recError);
      return NextResponse.json(
        { success: false, error: 'FETCH_FAILED', errorCode: 'FETCH_FAILED' },
        { status: 500 }
      );
    }

    // 如果没有推荐，返回空列表
    if (!recommendations || recommendations.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          recommendations: [],
          algorithm: algorithm,
          algorithmName: ALGORITHM_NAMES[algorithm],
          total: 0,
          messageCode: 'NO_RECOMMENDATIONS'
        }
      });
    }

    // 获取被推荐用户的详细信息
    const targetUserIds = recommendations.map((r: any) => r.target_user_id);
    const { data: targetUsers, error: usersError } = await db
      .from('v_user_full_profile')
      .select('*')
      .in('id', targetUserIds);

    if (usersError) {
      console.error('Error fetching target users:', usersError);
    }

    // 创建用户信息映射
    const userMap = new Map(targetUsers?.map((u: any) => [u.id, u]) || []);

    // 组装响应数据
    const enrichedRecommendations = recommendations.map((rec: any) => ({
      id: rec.id,
      targetUser: userMap.get(rec.target_user_id) || null,
      matchScore: rec.match_score,
      algorithmType: rec.algorithm_type,
      scoreDetails: rec.score_details,
      isViewed: rec.is_viewed,
      createdAt: rec.created_at,
      expiresAt: rec.expires_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        recommendations: enrichedRecommendations,
        algorithm: algorithm,
        algorithmName: ALGORITHM_NAMES[algorithm],
        total: enrichedRecommendations.length
      }
    });

  } catch (error) {
    console.error('Recommendations API error:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/matching/recommendations
 * 生成新的推荐列表
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'AUTH_REQUIRED', errorCode: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const db = await getDbClient();

    // 解析请求体
    const body = await request.json().catch(() => ({}));
    const algorithm = (body.algorithm || 'compatible') as AlgorithmType;
    const limit = Math.min(
      body.limit || MATCHING_CONFIG.DEFAULT_RECOMMENDATION_COUNT,
      MATCHING_CONFIG.MAX_RECOMMENDATION_COUNT
    );
    const forceRefresh = body.forceRefresh === true;

    // 验证算法类型
    const validAlgorithms: AlgorithmType[] = ['compatible', 'romantic', 'pragmatic', 'serendipity'];
    if (!validAlgorithms.includes(algorithm)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ALGORITHM', errorCode: 'INVALID_ALGORITHM' },
        { status: 400 }
      );
    }

    // 获取当前用户完整资料
    const { data: currentUser, error: userError } = await db
      .from('v_user_full_profile')
      .select('*')
      .eq('id', authUser.userId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { success: false, error: 'PROFILE_NOT_FOUND', errorCode: 'PROFILE_NOT_FOUND' },
        { status: 400 }
      );
    }

    // 转换为匹配用的数据结构
    const userProfile = transformDbUserToMatchProfile(currentUser);
    if (!userProfile) {
      return NextResponse.json(
        { success: false, error: 'PROFILE_INCOMPLETE', errorCode: 'PROFILE_INCOMPLETE' },
        { status: 400 }
      );
    }

    // 获取已互动过的用户列表
    const { data: swipedUsers } = await db
      .from('swipes')
      .select('target_id')
      .eq('actor_id', authUser.userId);

    const excludeUserIds = new Set([
      authUser.userId,
      ...(swipedUsers?.map((s: any) => s.target_id) || [])
    ]);

    // 获取"喜欢我但我还没互动过"的用户列表（优先展示）
    const { data: usersWhoLikedMe } = await db
      .from('swipes')
      .select('actor_id')
      .eq('target_id', authUser.userId)
      .in('action', ['like', 'super_like']);

    const likedMeUserIds = new Set(
      (usersWhoLikedMe || [])
        .map((s: any) => s.actor_id)
        .filter((id: any) => !excludeUserIds.has(id))
    );

    // 获取已匹配的用户列表
    const { data: matchedUsers } = await db
      .from('matches')
      .select('user_1, user_2')
      .or(`user_1.eq.${authUser.userId},user_2.eq.${authUser.userId}`)
      .is('unmatched_at', null);

    matchedUsers?.forEach((m: any) => {
      excludeUserIds.add(m.user_1 === authUser.userId ? m.user_2 : m.user_1);
    });

    // 确定目标性别
    const targetGender = userProfile.gender === 'male' ? 'female' : 
                        userProfile.gender === 'female' ? 'male' : null;

    // 获取候选人列表
    let candidatesQuery = db
      .from('v_active_users')
      .select('*')
      .neq('id', authUser.userId);

    if (targetGender) {
      candidatesQuery = candidatesQuery.eq('gender', targetGender);
    }

    const { data: candidatesData, error: candidatesError } = await candidatesQuery.limit(500);

    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError);
      return NextResponse.json(
        { success: false, error: 'FETCH_CANDIDATES_FAILED', errorCode: 'FETCH_CANDIDATES_FAILED' },
        { status: 500 }
      );
    }

    // 过滤并转换候选人
    const candidates = (candidatesData || [])
      .filter((c: any) => !excludeUserIds.has(c.id))
      .map((c: any) => transformDbUserToMatchProfile(c))
      .filter((c: any): c is NonNullable<typeof c> => c !== null);

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          recommendations: [],
          algorithm: algorithm,
          algorithmName: ALGORITHM_NAMES[algorithm],
          total: 0,
          messageCode: 'NO_CANDIDATES'
        }
      });
    }

    // 执行匹配算法
    const batchResult = generateDailyRecommendations(
      userProfile,
      candidates,
      algorithm,
      { limit }
    );

    // 如果强制刷新，先清理旧的未查看推荐
    if (forceRefresh) {
      await db
        .from('recommendations')
        .delete()
        .eq('user_id', authUser.userId)
        .eq('algorithm_type', algorithm)
        .eq('status', 'pending')
        .eq('is_viewed', false);
    }

    // 保存推荐结果到数据库
    const recommendationsToInsert = batchResult.matches.map((match: any) => ({
      user_id: authUser.userId,
      target_user_id: match.targetUserId,
      algorithm_type: algorithm,
      match_score: match.matchScore,
      score_details: match.scoreDetails,
      status: 'pending',
      expires_at: batchResult.expiresAt
    }));

    // 插入推荐并获取返回的记录（包含id）
    let insertedRecommendations: Array<{ id: string; target_user_id: string }> = [];
    if (recommendationsToInsert.length > 0) {
      const { data: insertedData, error: insertError } = await db
        .from('recommendations')
        .upsert(recommendationsToInsert, {
          onConflict: 'user_id,target_user_id,algorithm_type',
          ignoreDuplicates: false
        })
        .select('id, target_user_id');

      if (insertError) {
        console.error('Error inserting recommendations:', insertError);
      } else {
        insertedRecommendations = insertedData || [];
      }
    }

    // 创建 target_user_id -> recommendation id 的映射
    const recIdMap = new Map(insertedRecommendations.map((r: any) => [r.target_user_id, r.id]));

    // 获取被推荐用户的详细信息
    const targetUserIds = batchResult.matches.map((m: any) => m.targetUserId);
    const { data: targetUsers } = await db
      .from('v_user_full_profile')
      .select('*')
      .in('id', targetUserIds);

    const userMap = new Map(targetUsers?.map((u: any) => [u.id, u]) || []);

    // 组装响应数据（包含 recommendation id）
    let enrichedRecommendations = batchResult.matches.map((match: any) => ({
      id: recIdMap.get(match.targetUserId) || null,
      targetUser: userMap.get(match.targetUserId) || null,
      matchScore: match.matchScore,
      algorithmType: match.algorithmType,
      scoreDetails: match.scoreDetails,
      likedMe: likedMeUserIds.has(match.targetUserId)
    }));

    // 把"喜欢我的人"排在最前面
    enrichedRecommendations = [
      ...enrichedRecommendations.filter((r: any) => r.likedMe),
      ...enrichedRecommendations.filter((r: any) => !r.likedMe)
    ];

    return NextResponse.json({
      success: true,
      data: {
        recommendations: enrichedRecommendations,
        algorithm: algorithm,
        algorithmName: ALGORITHM_NAMES[algorithm],
        total: enrichedRecommendations.length,
        generatedAt: batchResult.generatedAt,
        expiresAt: batchResult.expiresAt
      }
    });

  } catch (error) {
    console.error('Generate recommendations error:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
