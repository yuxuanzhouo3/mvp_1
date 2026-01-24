/**
 * Boost API - 曝光加速
 * GET /api/profile/boost - 获取当前 Boost 状态
 * POST /api/profile/boost - 开启曝光加速 (2积分/30分钟)
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';
import { checkAndConsumeCredits, CREDIT_COSTS } from '@/lib/credits/credits';

// Boost duration: 30 minutes
const BOOST_DURATION_MINUTES = 30;

// 统一认证函数
async function authenticateUser(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  try {
    const user = await requireUser(request);
    return { userId: user.userId, email: user.email };
  } catch {
    return null;
  }
}

/**
 * GET /api/profile/boost
 * Get current boost status
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

    // Check for active boost
    const { data: activeBoost, error: boostError } = await db
      .from('user_boosts')
      .select('*')
      .eq('user_id', authUser.userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    if (boostError && boostError.code !== 'PGRST116') {
      console.error('Error checking boost status:', boostError);
    }

    const hasActiveBoost = !!activeBoost;
    const remainingTime = hasActiveBoost
      ? Math.max(0, new Date(activeBoost.expires_at).getTime() - Date.now())
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        hasActiveBoost,
        boost: activeBoost ? {
          id: activeBoost.id,
          startedAt: activeBoost.started_at,
          expiresAt: activeBoost.expires_at,
          remainingMinutes: Math.ceil(remainingTime / 60000),
          remainingSeconds: Math.ceil(remainingTime / 1000),
        } : null,
        cost: CREDIT_COSTS.BOOST,
        durationMinutes: BOOST_DURATION_MINUTES,
      },
      region: isChinaDeployment() ? 'CN' : 'INTL',
    });
  } catch (error) {
    console.error('Boost GET API error:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile/boost
 * Start a new boost (30 minutes)
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

    // Check for existing active boost
    const { data: existingBoost } = await db
      .from('user_boosts')
      .select('id, expires_at')
      .eq('user_id', authUser.userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .single();

    if (existingBoost) {
      const remainingTime = Math.max(0, new Date(existingBoost.expires_at).getTime() - Date.now());
      return NextResponse.json(
        {
          success: false,
          error: 'BOOST_ALREADY_ACTIVE',
          errorCode: 'BOOST_ALREADY_ACTIVE',
          message: isChinaDeployment() ? '您已有一个活跃的曝光加速' : 'You already have an active boost',
          remainingMinutes: Math.ceil(remainingTime / 60000),
        },
        { status: 400 }
      );
    }

    // Check and consume credits (2 credits for boost)
    const creditsResult = await checkAndConsumeCredits(authUser.userId, 'boost');

    if (!creditsResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: creditsResult.error || 'INSUFFICIENT_CREDITS',
          errorCode: creditsResult.errorCode || 'INSUFFICIENT_CREDITS',
          requiredCredits: CREDIT_COSTS.BOOST,
        },
        { status: 402 } // Payment Required
      );
    }

    // Create new boost record
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + BOOST_DURATION_MINUTES * 60 * 1000);

    const { data: newBoost, error: insertError } = await db
      .from('user_boosts')
      .insert({
        user_id: authUser.userId,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        credits_consumed: CREDIT_COSTS.BOOST,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating boost:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'BOOST_CREATION_FAILED',
          errorCode: 'BOOST_CREATION_FAILED',
          message: isChinaDeployment() ? '创建曝光加速失败' : 'Failed to create boost',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        boost: {
          id: newBoost.id,
          startedAt: newBoost.started_at,
          expiresAt: newBoost.expires_at,
          durationMinutes: BOOST_DURATION_MINUTES,
        },
        creditsConsumed: CREDIT_COSTS.BOOST,
        newBalance: creditsResult.newBalance,
      },
      messageCode: 'BOOST_ACTIVATED',
      region: isChinaDeployment() ? 'CN' : 'INTL',
    });
  } catch (error) {
    console.error('Boost POST API error:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
