/**
 * Swipes API - 用户互动记录接口
 * GET /api/matching/swipes - 获取互动历史
 * POST /api/matching/swipes - 记录互动（like/pass/super_like）
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { notifyMatchSuccess, notifySomeoneLikedYou } from '@/lib/services/notifications';
import { checkAndConsumeCredits, CREDIT_COSTS } from '@/lib/credits/credits';
import { sendSystemMessage } from '@/lib/chat/easemob-utils';
import type { SwipeActionEnum } from '@/types/database';

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
 * GET /api/matching/swipes
 * 获取用户的互动历史
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
    const action = searchParams.get('action') as SwipeActionEnum | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询
    let query = db
      .from('swipes')
      .select(`
        id,
        target_id,
        action,
        created_at,
        recommendation_id
      `)
      .eq('actor_id', authUser.userId)
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
      const { data: users } = await db
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
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'AUTH_REQUIRED', errorCode: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const db = await getDbClient();
    const isCN = isChinaDeployment();

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
    if (targetUserId === authUser.userId) {
      return NextResponse.json(
        { success: false, error: 'CANNOT_SWIPE_SELF', errorCode: 'CANNOT_SWIPE_SELF' },
        { status: 400 }
      );
    }

    // 检查目标用户是否存在
    const { data: targetUser, error: targetError } = await db
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
    const { data: existingSwipe } = await db
      .from('swipes')
      .select('id, action')
      .eq('actor_id', authUser.userId)
      .eq('target_id', targetUserId)
      .single();

    if (existingSwipe) {
      return NextResponse.json(
        { success: false, error: 'ALREADY_INTERACTED', errorCode: 'ALREADY_INTERACTED' },
        { status: 409 }
      );
    }

    // Check and consume credits for like/super_like actions
    let creditsConsumed = 0;
    let newCreditBalance: number | undefined;

    if (action === 'like') {
      // Check user's membership for unlimited likes
      const { data: membership } = await db
        .from('user_memberships')
        .select('tier, expires_at')
        .eq('user_id', authUser.userId)
        .single();

      const hasUnlimitedLikes = membership &&
        ['basic', 'premium', 'vip'].includes(membership.tier) &&
        (!membership.expires_at || new Date(membership.expires_at) > new Date());

      // If not a paying member, consume credits for like
      if (!hasUnlimitedLikes) {
        const creditsResult = await checkAndConsumeCredits(authUser.userId, 'like');

        if (!creditsResult.success) {
          return NextResponse.json(
            {
              success: false,
              error: creditsResult.error || 'INSUFFICIENT_CREDITS',
              errorCode: creditsResult.errorCode || 'INSUFFICIENT_CREDITS',
              requiredCredits: CREDIT_COSTS.LIKE,
            },
            { status: 402 }
          );
        }
        creditsConsumed = CREDIT_COSTS.LIKE;
        newCreditBalance = creditsResult.newBalance;
      }
    } else if (action === 'super_like') {
      // Super like always costs credits
      const creditsResult = await checkAndConsumeCredits(authUser.userId, 'super_like');

      if (!creditsResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: creditsResult.error || 'INSUFFICIENT_CREDITS',
            errorCode: creditsResult.errorCode || 'INSUFFICIENT_CREDITS',
            requiredCredits: CREDIT_COSTS.SUPER_LIKE,
          },
          { status: 402 }
        );
      }
      creditsConsumed = CREDIT_COSTS.SUPER_LIKE;
      newCreditBalance = creditsResult.newBalance;
    }

    // 创建互动记录
    const { data: swipe, error: insertError } = await db
      .from('swipes')
      .insert({
        actor_id: authUser.userId,
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
      await db
        .from('recommendations')
        .update({ 
          is_viewed: true,
          status: newStatus
        })
        .eq('id', recommendationId);
    }

    // 检查是否形成匹配
    let isMatched = false;
    let matchInfo = null;

    if (action === 'like' || action === 'super_like') {
      // 检查对方是否也喜欢了我
      const { data: mutualSwipe } = await db
        .from('swipes')
        .select('id')
        .eq('actor_id', targetUserId)
        .eq('target_id', authUser.userId)
        .in('action', ['like', 'super_like'])
        .single();

      if (mutualSwipe) {
        isMatched = true;

        // 获取匹配记录
        const user1 = authUser.userId < targetUserId ? authUser.userId : targetUserId;
        const user2 = authUser.userId < targetUserId ? targetUserId : authUser.userId;

        console.log('[Swipes] Mutual like detected, checking match record:', { user1, user2 });

        // 尝试获取匹配记录
        let match = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data } = await db
            .from('matches')
            .select('id, match_score, matched_at')
            .eq('user_1', user1)
            .eq('user_2', user2)
            .single();

          if (data) {
            match = data;
            break;
          }
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        // 如果触发器没有创建 match，手动创建
        if (!match) {
          console.log('[Swipes] Match not found after retries, creating manually...');
          const { data: newMatch } = await db
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
          }
        }

        if (match) {
          matchInfo = {
            matchId: match.id,
            matchScore: match.match_score,
            matchedAt: match.matched_at
          };

          // 自动创建聊天室
          const serviceDb = await getServiceDbClient();
          const { data: existingRoom } = await serviceDb
            .from('chat_rooms')
            .select('id')
            .eq('match_id', match.id)
            .single();

          if (!existingRoom) {
            await serviceDb
              .from('chat_rooms')
              .insert({
                match_id: match.id,
                is_active: true
              });
          }

          // CN 环境：发送初始消息到 Easemob 创建会话
          if (isCN) {
            const matchMessage = '你们匹配成功了！快来打个招呼吧 👋';
            // 单向发送消息，环信会自动为双方创建会话
            await sendSystemMessage(authUser.userId, targetUserId, matchMessage);
          }

          // 发送匹配成功通知
          const { data: currentUserInfo } = await db
            .from('users')
            .select('full_name')
            .eq('id', authUser.userId)
            .single();

          const { data: targetUserInfo } = await db
            .from('users')
            .select('full_name')
            .eq('id', targetUserId)
            .single();

          const currentUserName = currentUserInfo?.full_name || (isCN ? '有人' : 'Someone');
          const targetUserName = targetUserInfo?.full_name || (isCN ? '有人' : 'Someone');

          await notifyMatchSuccess(targetUserId, currentUserName, match.id, authUser.userId, match.match_score);
          await notifyMatchSuccess(authUser.userId, targetUserName, match.id, targetUserId, match.match_score);
        }
      } else {
        // 单方面 like，发送通知
        await notifySomeoneLikedYou(targetUserId, authUser.userId, action === 'super_like');
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
