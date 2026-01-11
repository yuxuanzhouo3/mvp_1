/**
 * Swipes API - 用户互动记录接口
 * GET /api/matching/swipes - 获取互动历史
 * POST /api/matching/swipes - 记录互动（like/pass/super_like）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { notifyMatchSuccess, notifySomeoneLikedYou } from '@/lib/services/notifications';
import { checkAndConsumeCredits, CREDIT_COSTS } from '@/lib/credits/credits';
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
        { success: false, error: 'AUTH_REQUIRED', errorCode: 'AUTH_REQUIRED' },
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
        { success: false, error: 'FETCH_SWIPES_FAILED', errorCode: 'FETCH_SWIPES_FAILED' },
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
      { success: false, error: 'SERVER_ERROR', errorCode: 'SERVER_ERROR' },
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
        { success: false, error: 'AUTH_REQUIRED', errorCode: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { targetUserId, action, recommendationId } = body;

    // 验证参数
    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'TARGET_USER_REQUIRED', errorCode: 'TARGET_USER_REQUIRED' },
        { status: 400 }
      );
    }

    const validActions: SwipeActionEnum[] = ['pass', 'like', 'super_like'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ACTION', errorCode: 'INVALID_ACTION' },
        { status: 400 }
      );
    }

    // 不能对自己操作
    if (targetUserId === user.id) {
      return NextResponse.json(
        { success: false, error: 'CANNOT_SWIPE_SELF', errorCode: 'CANNOT_SWIPE_SELF' },
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
        { success: false, error: 'TARGET_USER_NOT_FOUND', errorCode: 'TARGET_USER_NOT_FOUND' },
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
        { success: false, error: 'ALREADY_INTERACTED', errorCode: 'ALREADY_INTERACTED' },
        { status: 409 }
      );
    }

    // Check and consume credits for like/super_like actions
    // like costs 5 credits, super_like costs 10 credits
    let creditsConsumed = 0;
    let newCreditBalance: number | undefined;

    if (action === 'like') {
      // Check user's membership for unlimited likes
      const { data: membership } = await supabase
        .from('user_memberships')
        .select('tier, expires_at')
        .eq('user_id', user.id)
        .single();

      const hasUnlimitedLikes = membership &&
        ['basic', 'premium', 'vip'].includes(membership.tier) &&
        (!membership.expires_at || new Date(membership.expires_at) > new Date());

      // If not a paying member, consume 5 credits for like
      if (!hasUnlimitedLikes) {
        const creditsResult = await checkAndConsumeCredits(user.id, 'like');

        if (!creditsResult.success) {
          return NextResponse.json(
            {
              success: false,
              error: creditsResult.error || 'INSUFFICIENT_CREDITS',
              errorCode: creditsResult.errorCode || 'INSUFFICIENT_CREDITS',
              requiredCredits: CREDIT_COSTS.LIKE,
            },
            { status: 402 } // Payment Required
          );
        }
        creditsConsumed = CREDIT_COSTS.LIKE;
        newCreditBalance = creditsResult.newBalance;
      }
    } else if (action === 'super_like') {
      // Super like always costs 10 credits
      const creditsResult = await checkAndConsumeCredits(user.id, 'super_like');

      if (!creditsResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: creditsResult.error || 'INSUFFICIENT_CREDITS',
            errorCode: creditsResult.errorCode || 'INSUFFICIENT_CREDITS',
            requiredCredits: CREDIT_COSTS.SUPER_LIKE,
          },
          { status: 402 } // Payment Required
        );
      }
      creditsConsumed = CREDIT_COSTS.SUPER_LIKE;
      newCreditBalance = creditsResult.newBalance;
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
        { success: false, error: 'CREATE_SWIPE_FAILED', errorCode: 'CREATE_SWIPE_FAILED' },
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

        console.log('[Swipes] Mutual like detected, checking match record:', { user1, user2 });

        // 尝试获取匹配记录，添加重试机制（触发器可能有延迟）
        let match = null;
        let matchError = null;

        for (let attempt = 0; attempt < 3; attempt++) {
          const { data, error } = await supabase
            .from('matches')
            .select('id, match_score, matched_at')
            .eq('user_1', user1)
            .eq('user_2', user2)
            .single();

          if (data) {
            match = data;
            break;
          }
          matchError = error;

          // 如果没找到，等待100ms后重试
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        // 如果触发器没有创建 match，手动创建
        if (!match) {
          console.log('[Swipes] Match not found after retries, creating manually...');
          const { data: newMatch, error: createError } = await supabase
            .from('matches')
            .insert({
              user_1: user1,
              user_2: user2,
              match_score: null,
              algorithm_type: null
            })
            .select('id, match_score, matched_at')
            .single();

          if (newMatch) {
            match = newMatch;
            console.log('[Swipes] Match created manually:', match);
          } else {
            console.error('[Swipes] Failed to create match manually:', createError);
          }
        }

        console.log('[Swipes] Match query result:', { match, matchError });

        if (match) {
          matchInfo = {
            matchId: match.id,
            matchScore: match.match_score,
            matchedAt: match.matched_at
          };

          // 自动创建聊天室
          console.log('[Swipes] Auto-creating chat room for match:', match.id);
          const { data: existingRoom } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('match_id', match.id)
            .single();

          if (!existingRoom) {
            const { data: newRoom, error: roomError } = await supabase
              .from('chat_rooms')
              .insert({
                match_id: match.id,
                is_active: true
              })
              .select('id')
              .single();

            if (roomError) {
              console.error('[Swipes] Failed to create chat room:', roomError);
            } else {
              console.log('[Swipes] Chat room created:', newRoom.id);
            }
          } else {
            console.log('[Swipes] Chat room already exists:', existingRoom.id);
          }

          // 获取双方用户信息用于通知
          const { data: currentUserInfo } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', user.id)
            .single();

          const { data: targetUserInfo } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', targetUserId)
            .single();

          const currentUserName = currentUserInfo?.full_name || (process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN' ? '有人' : 'Someone');
          const targetUserName = targetUserInfo?.full_name || (process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN' ? '有人' : 'Someone');

          // 给对方发送匹配成功通知（当前用户会通过前端 toast 看到）
          // 使用多语言通知函数，根据 INTL/CN 环境自动选择语言
          const notifyTargetResult = await notifyMatchSuccess(
            targetUserId,
            currentUserName,
            match.id,
            user.id,
            match.match_score
          );

          console.log('[Swipes] Target user notification result:', notifyTargetResult);

          // 给当前用户也发送通知（作为记录，同时支持通知页面查看）
          const notifyCurrentResult = await notifyMatchSuccess(
            user.id,
            targetUserName,
            match.id,
            targetUserId,
            match.match_score
          );

          console.log('[Swipes] Current user notification result:', notifyCurrentResult);
        } else {
          console.error('[Swipes] Match record not found! Trigger may have failed.', { user1, user2, matchError });
        }
      } else {
        // 单方面 like，给对方发送"有人喜欢你"的通知
        // 使用多语言通知函数，根据 INTL/CN 环境自动选择语言
        const notifyResult = await notifySomeoneLikedYou(
          targetUserId,
          user.id,
          action === 'super_like'
        );

        if (!notifyResult.success) {
          console.error('Failed to create like notification:', notifyResult.error);
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
        creditsConsumed,
        newCreditBalance,
        messageCode: isMatched
          ? 'MATCH_SUCCESS'
          : action === 'like'
            ? 'LIKE_SUCCESS'
            : action === 'super_like'
              ? 'SUPER_LIKE_SUCCESS'
              : 'PASS_SUCCESS'
      }
    });

  } catch (error) {
    console.error('Swipes POST API error:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

