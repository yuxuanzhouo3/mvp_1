/**
 * 积分余额 API
 * Credits Balance API
 *
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { getCreditsBalance, checkAndConsumeCredits, CREDIT_COSTS, CreditConsumeType } from '@/lib/credits/credits';
import { AuthError, jsonAuthError, requireUser } from '@/lib/auth/requireUser';

/**
 * GET /api/credits
 * Get user's current credits balance
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireUser(request);

    // Get credits balance
    const balance = await getCreditsBalance(authUser.userId);

    return NextResponse.json({
      success: true,
      data: {
        balance,
        costs: {
          match: CREDIT_COSTS.MATCH,
          message: CREDIT_COSTS.MESSAGE,
        },
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonAuthError(error);
    }
    console.error('Credits API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credits
 * Consume credits for an action
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireUser(request);
    const userId = authUser.userId;

    const body = await request.json().catch(() => null);
    const action = body?.action;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // 扣减积分
    const result = await checkAndConsumeCredits(userId, action as CreditConsumeType);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'INSUFFICIENT_CREDITS',
          errorCode: result.errorCode || 'INSUFFICIENT_CREDITS',
        },
        { status: 402 }
      );
    }

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonAuthError(error);
    }
    console.error('Credits consume API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
