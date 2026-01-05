/**
 * Swipes API - 用户互动记录接口
 * GET /api/matching/swipes - 获取互动历史
 * POST /api/matching/swipes - 记录互动（like/pass/super_like）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import type { SwipeActionEnum } from '@/types/database';

/**
 * GET /api/matching/swipes
 * 获取用户的互动历史
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
    const action = searchParams.get('action') as SwipeActionEnum | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询
    let query = supabase
      .from('swipes')
      .select(`
        id,
        target_id,
        action,
        created_at,
        recommendation_id
      `)
      .eq('actor_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq('action', action);
    }

    const { data: swipes, error: swipesError } = await query;

    if (swipesError) {
      console.error('Error fetching swipes:', swipesError);
      return NextResponse.json(
        { success: false, error: '获取互动记录失败' },
        { status: 500 }
      );
    }

    // 获取目标用户的基本信息
    const targetIds = swipes?.map(s => s.target_id) || [];
    let targetUsers: Record<string, unknown>[] = [];
    
    if (targetIds.length > 0) {
      const { data: users } = await supabase
        .from('v_user_full_profile')
        .select('id, username, avatar_url, gender, age, city_name, total_score')
        .in('id', targetIds);
      
      targetUsers = users || [];
    }

    const userMap = new Map(targetUsers.map(u => [u.id, u]));

    // 组装响应数据
    const enrichedSwipes = (swipes || []).map(swipe => ({
      id: swipe.id,
      targetUser: userMap.get(swipe.target_id) || { id: swipe.target_id },
      action: swipe.action,
      createdAt: swipe.created_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        swipes: enrichedSwipes,
        total: enrichedSwipes.length,
        offset,
        limit
      }
    });

  } catch (error) {
    console.error('Swipes GET API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/matching/swipes
 * 记录用户互动
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
    const body = await request.json();
    const { targetUserId, action, recommendationId } = body;

    // 验证参数
    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: '缺少目标用户ID' },
        { status: 400 }
      );
    }

    const validActions: SwipeActionEnum[] = ['pass', 'like', 'super_like'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: '无效的操作类型，有效值: pass, like, super_like' },
        { status: 400 }
      );
    }

    // 不能对自己操作
    if (targetUserId === user.id) {
      return NextResponse.json(
        { success: false, error: '不能对自己进行操作' },
        { status: 400 }
      );
    }

    // 检查目标用户是否存在
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json(
        { success: false, error: '目标用户不存在' },
        { status: 404 }
      );
    }

    // 检查是否已经互动过
    const { data: existingSwipe } = await supabase
      .from('swipes')
      .select('id, action')
      .eq('actor_id', user.id)
      .eq('target_id', targetUserId)
      .single();

    if (existingSwipe) {
      return NextResponse.json(
        { success: false, error: '已经对该用户进行过操作' },
        { status: 409 }
      );
    }

    // 创建互动记录
    const { data: swipe, error: insertError } = await supabase
      .from('swipes')
      .insert({
        actor_id: user.id,
        target_id: targetUserId,
        action: action,
        recommendation_id: recommendationId || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating swipe:', insertError);
      return NextResponse.json(
        { success: false, error: '记录互动失败' },
        { status: 500 }
      );
    }

    // 更新推荐状态
    if (recommendationId) {
      const newStatus = action === 'pass' ? 'rejected' : 'pending';
      await supabase
        .from('recommendations')
        .update({ 
          is_viewed: true,
          status: newStatus
        })
        .eq('id', recommendationId);
    }

    // 检查是否形成匹配（通过触发器自动处理）
    // 触发器会在双向喜欢时自动创建 matches 记录
    
    // 检查是否已形成匹配
    let isMatched = false;
    let matchInfo = null;

    if (action === 'like' || action === 'super_like') {
      // 检查对方是否也喜欢了我
      const { data: mutualSwipe } = await supabase
        .from('swipes')
        .select('id')
        .eq('actor_id', targetUserId)
        .eq('target_id', user.id)
        .in('action', ['like', 'super_like'])
        .single();

      if (mutualSwipe) {
        isMatched = true;
        
        // 获取匹配记录
        const user1 = user.id < targetUserId ? user.id : targetUserId;
        const user2 = user.id < targetUserId ? targetUserId : user.id;
        
        const { data: match } = await supabase
          .from('matches')
          .select('id, match_score, matched_at')
          .eq('user_1', user1)
          .eq('user_2', user2)
          .single();

        if (match) {
          matchInfo = {
            matchId: match.id,
            matchScore: match.match_score,
            matchedAt: match.matched_at
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        swipe: {
          id: swipe.id,
          targetUserId: swipe.target_id,
          action: swipe.action,
          createdAt: swipe.created_at
        },
        isMatched,
        matchInfo,
        message: isMatched 
          ? '恭喜！你们互相喜欢，匹配成功！🎉' 
          : action === 'like' 
            ? '已喜欢，等待对方回应' 
            : action === 'super_like'
              ? '已超级喜欢！对方会优先看到你'
              : '已跳过'
      }
    });

  } catch (error) {
    console.error('Swipes POST API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

