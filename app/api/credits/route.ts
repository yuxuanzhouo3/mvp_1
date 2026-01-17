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

// CN 环境认证
function authenticateCnUser(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  if (token.startsWith('cn_')) {
    return token.substring(3);
  }
  return null;
}

/**
 * GET /api/credits
 * Get user's current credits balance
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDbClient();

    // Get current user
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get credits balance
    const balance = await getCreditsBalance(user.id);

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
    let userId: string | null = null;

    // CN 环境认证
    if (isChinaDeployment()) {
      userId = authenticateCnUser(request);
    } else {
      // INTL 环境
      const db = await getDbClient();
      const { data: { user }, error: authError } = await db.auth.getUser();
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await request.json();

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
    console.error('Credits consume API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
