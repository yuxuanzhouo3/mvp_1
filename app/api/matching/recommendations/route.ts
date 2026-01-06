/**
 * Recommendations API - 推荐列表接口
 * GET /api/matching/recommendations - 获取推荐列表
 * POST /api/matching/recommendations - 生成新推荐
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { 
  generateDailyRecommendations, 
  executeMatchingAlgorithm 
} from '@/lib/matching/algorithms';
import { 
  transformDbUserToMatchProfile 
} from '@/lib/matching/utils';
import { 
  AlgorithmType, 
  MATCHING_CONFIG,
  ALGORITHM_NAMES
} from '@/lib/matching/types';

/**
 * GET /api/matching/recommendations
 * 获取当前用户的推荐列表
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

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
        { success: false, error: '无效的算法类型' },
        { status: 400 }
      );
    }

    // 构建查询
    let query = supabase
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
      .eq('user_id', user.id)
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
        { success: false, error: '获取推荐列表失败' },
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
          message: '暂无推荐，请稍后再试或生成新推荐'
        }
      });
    }

    // 获取被推荐用户的详细信息
    const targetUserIds = recommendations.map(r => r.target_user_id);
    const { data: targetUsers, error: usersError } = await supabase
      .from('v_user_full_profile')
      .select('*')
      .in('id', targetUserIds);

    if (usersError) {
      console.error('Error fetching target users:', usersError);
    }

    // 创建用户信息映射
    const userMap = new Map(targetUsers?.map(u => [u.id, u]) || []);

    // 组装响应数据
    const enrichedRecommendations = recommendations.map(rec => ({
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
      { success: false, error: '服务器内部错误' },
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
    const supabase = createRouteHandlerClient();
    
    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

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
        { success: false, error: '无效的算法类型' },
        { status: 400 }
      );
    }

    // 获取当前用户完整资料
    const { data: currentUser, error: userError } = await supabase
      .from('v_user_full_profile')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { success: false, error: '获取用户资料失败，请完善个人资料' },
        { status: 400 }
      );
    }

    // 转换为匹配用的数据结构
    const userProfile = transformDbUserToMatchProfile(currentUser);
    if (!userProfile) {
      return NextResponse.json(
        { success: false, error: '请先完善个人资料和市场价值评分' },
        { status: 400 }
      );
    }

    // 获取已互动过的用户列表
    const { data: swipedUsers } = await supabase
      .from('swipes')
      .select('target_id')
      .eq('actor_id', user.id);

    const excludeUserIds = new Set([
      user.id,
      ...(swipedUsers?.map(s => s.target_id) || [])
    ]);

    // 获取"喜欢我但我还没互动过"的用户列表（优先展示）
    const { data: usersWhoLikedMe } = await supabase
      .from('swipes')
      .select('actor_id')
      .eq('target_id', user.id)
      .in('action', ['like', 'super_like']);

    const likedMeUserIds = new Set(
      (usersWhoLikedMe || [])
        .map(s => s.actor_id)
        .filter(id => !excludeUserIds.has(id)) // 排除已经互动过的
    );

    // 获取已匹配的用户列表
    const { data: matchedUsers } = await supabase
      .from('matches')
      .select('user_1, user_2')
      .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
      .is('unmatched_at', null);

    matchedUsers?.forEach(m => {
      excludeUserIds.add(m.user_1 === user.id ? m.user_2 : m.user_1);
    });

    // 确定目标性别
    const targetGender = userProfile.gender === 'male' ? 'female' : 
                        userProfile.gender === 'female' ? 'male' : null;

    // 获取候选人列表
    let candidatesQuery = supabase
      .from('v_active_users')
      .select('*')
      .neq('id', user.id);

    if (targetGender) {
      candidatesQuery = candidatesQuery.eq('gender', targetGender);
    }

    const { data: candidatesData, error: candidatesError } = await candidatesQuery.limit(500);

    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError);
      return NextResponse.json(
        { success: false, error: '获取候选人失败' },
        { status: 500 }
      );
    }

    // 过滤并转换候选人
    const candidates = (candidatesData || [])
      .filter(c => !excludeUserIds.has(c.id))
      .map(c => transformDbUserToMatchProfile(c))
      .filter((c): c is NonNullable<typeof c> => c !== null);

    if (candidates.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          recommendations: [],
          algorithm: algorithm,
          algorithmName: ALGORITHM_NAMES[algorithm],
          total: 0,
          message: '暂无符合条件的候选人'
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
      await supabase
        .from('recommendations')
        .delete()
        .eq('user_id', user.id)
        .eq('algorithm_type', algorithm)
        .eq('status', 'pending')
        .eq('is_viewed', false);
    }

    // 保存推荐结果到数据库
    const recommendationsToInsert = batchResult.matches.map(match => ({
      user_id: user.id,
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
      const { data: insertedData, error: insertError } = await supabase
        .from('recommendations')
        .upsert(recommendationsToInsert, {
          onConflict: 'user_id,target_user_id,algorithm_type',
          ignoreDuplicates: false
        })
        .select('id, target_user_id');

      if (insertError) {
        console.error('Error inserting recommendations:', insertError);
        // 不返回错误，继续返回计算结果
      } else {
        insertedRecommendations = insertedData || [];
      }
    }

    // 创建 target_user_id -> recommendation id 的映射
    const recIdMap = new Map(insertedRecommendations.map(r => [r.target_user_id, r.id]));

    // 获取被推荐用户的详细信息
    const targetUserIds = batchResult.matches.map(m => m.targetUserId);
    const { data: targetUsers } = await supabase
      .from('v_user_full_profile')
      .select('*')
      .in('id', targetUserIds);

    const userMap = new Map(targetUsers?.map(u => [u.id, u]) || []);

    // 组装响应数据（包含 recommendation id）
    let enrichedRecommendations = batchResult.matches.map(match => ({
      id: recIdMap.get(match.targetUserId) || null,
      targetUser: userMap.get(match.targetUserId) || null,
      matchScore: match.matchScore,
      algorithmType: match.algorithmType,
      scoreDetails: match.scoreDetails,
      likedMe: likedMeUserIds.has(match.targetUserId) // 标记是否喜欢过我
    }));

    // 把"喜欢我的人"排在最前面，同时保持各组内的分数排序
    enrichedRecommendations = [
      ...enrichedRecommendations.filter(r => r.likedMe),
      ...enrichedRecommendations.filter(r => !r.likedMe)
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
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

