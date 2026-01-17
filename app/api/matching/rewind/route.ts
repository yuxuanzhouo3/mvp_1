/**
 * Rewind API - 撤销上一次 Pass 操作
 * POST /api/matching/rewind - 撤销操作 (2积分)
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import { checkAndConsumeCredits, CREDIT_COSTS } from '@/lib/credits/credits';

// Rewind time limit: 5 minutes
const REWIND_TIME_LIMIT_MS = 5 * 60 * 1000;

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
 * POST /api/matching/rewind
 * Rewind the last pass action
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

    // Parse request body (optional swipeId to specify which swipe to rewind)
    let swipeId: string | undefined;
    try {
      const body = await request.json();
      swipeId = body.swipeId;
    } catch {
      // Body is optional
    }

    // Find the most recent pass action
    let query = db
      .from('swipes')
      .select('*')
      .eq('actor_id', authUser.userId)
      .eq('action', 'pass')
      .order('created_at', { ascending: false })
      .limit(1);

    if (swipeId) {
      query = db
        .from('swipes')
        .select('*')
        .eq('id', swipeId)
        .eq('actor_id', authUser.userId)
        .eq('action', 'pass')
        .limit(1);
    }

    const { data: swipeToRewind, error: swipeError } = await query.single();

    if (swipeError || !swipeToRewind) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_REWINDABLE_SWIPE',
          errorCode: 'NO_REWINDABLE_SWIPE',
          message: isChinaDeployment() ? '没有可撤销的操作' : 'No pass action found to rewind',
        },
        { status: 404 }
      );
    }

    // Check if the swipe is within the rewind time limit
    const swipeTime = new Date(swipeToRewind.created_at).getTime();
    const currentTime = Date.now();

    if (currentTime - swipeTime > REWIND_TIME_LIMIT_MS) {
      return NextResponse.json(
        {
          success: false,
          error: 'REWIND_TIME_EXPIRED',
          errorCode: 'REWIND_TIME_EXPIRED',
          message: isChinaDeployment() ? '撤销时间已过期（5分钟内有效）' : 'Rewind time limit (5 minutes) has expired',
        },
        { status: 400 }
      );
    }

    // Check and consume credits (2 credits for rewind)
    const creditsResult = await checkAndConsumeCredits(authUser.userId, 'rewind', swipeToRewind.id);

    if (!creditsResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: creditsResult.error || 'INSUFFICIENT_CREDITS',
          errorCode: creditsResult.errorCode || 'INSUFFICIENT_CREDITS',
          requiredCredits: CREDIT_COSTS.REWIND,
        },
        { status: 402 } // Payment Required
      );
    }

    // Delete the swipe record
    const { error: deleteError } = await db
      .from('swipes')
      .delete()
      .eq('id', swipeToRewind.id);

    if (deleteError) {
      console.error('Error deleting swipe:', deleteError);
      return NextResponse.json(
        {
          success: false,
          error: 'REWIND_FAILED',
          errorCode: 'REWIND_FAILED',
          message: isChinaDeployment() ? '撤销失败' : 'Failed to rewind the action',
        },
        { status: 500 }
      );
    }

    // If there was a recommendation associated, update its status back to pending
    if (swipeToRewind.recommendation_id) {
      await db
        .from('recommendations')
        .update({
          is_viewed: false,
          status: 'pending',
        })
        .eq('id', swipeToRewind.recommendation_id);
    }

    // Get target user info for response
    const { data: targetUser } = await db
      .from('v_user_full_profile')
      .select('id, username, avatar_url, gender, age, city_name')
      .eq('id', swipeToRewind.target_id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        rewindedSwipe: {
          id: swipeToRewind.id,
          targetUserId: swipeToRewind.target_id,
          action: swipeToRewind.action,
          rewindedAt: new Date().toISOString(),
        },
        targetUser: targetUser || { id: swipeToRewind.target_id },
        creditsConsumed: CREDIT_COSTS.REWIND,
        newBalance: creditsResult.newBalance,
      },
      messageCode: 'REWIND_SUCCESS',
    });
  } catch (error) {
    console.error('Rewind API error:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
