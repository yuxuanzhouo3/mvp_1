/**
 * View Likers API - 查看谁喜欢我
 * GET /api/profile/view-likers - 获取喜欢我的用户数量（预览）
 * POST /api/profile/view-likers - 解锁查看谁喜欢我 (5积分，Premium+ 会员免费)
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';
import { checkAndConsumeCredits, CREDIT_COSTS } from '@/lib/credits/credits';

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
 * GET /api/profile/view-likers
 * Get preview of who liked me (count only, blurred info)
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

    // Get count of users who liked me
    const { count: likerCount, error: countError } = await db
      .from('swipes')
      .select('*', { count: 'exact', head: true })
      .eq('target_id', authUser.userId)
      .in('action', ['like', 'super_like']);

    if (countError) {
      console.error('Error counting likers:', countError);
    }

    // Check if user has Premium+ membership (can view for free)
    const { data: membership } = await db
      .from('user_memberships')
      .select('tier, expires_at')
      .eq('user_id', authUser.userId)
      .single();

    const isPremiumOrHigher = membership &&
      ['premium', 'vip'].includes(membership.tier) &&
      (!membership.expires_at || new Date(membership.expires_at) > new Date());

    return NextResponse.json({
      success: true,
      data: {
        count: likerCount || 0,
        isPremiumOrHigher,
        canViewForFree: isPremiumOrHigher,
        cost: isPremiumOrHigher ? 0 : CREDIT_COSTS.VIEW_LIKER,
      },
      region: isChinaDeployment() ? 'CN' : 'INTL',
    });
  } catch (error) {
    console.error('View Likers GET API error:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile/view-likers
 * Unlock and view who liked me (costs 5 credits, free for Premium+)
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check if user has Premium+ membership (can view for free)
    const { data: membership } = await db
      .from('user_memberships')
      .select('tier, expires_at')
      .eq('user_id', authUser.userId)
      .single();

    const isPremiumOrHigher = membership &&
      ['premium', 'vip'].includes(membership.tier) &&
      (!membership.expires_at || new Date(membership.expires_at) > new Date());

    let creditsConsumed = 0;
    let newBalance: number | undefined;

    // If not Premium+, need to pay credits
    if (!isPremiumOrHigher) {
      const creditsResult = await checkAndConsumeCredits(authUser.userId, 'view_liker');

      if (!creditsResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: creditsResult.error || 'INSUFFICIENT_CREDITS',
            errorCode: creditsResult.errorCode || 'INSUFFICIENT_CREDITS',
            requiredCredits: CREDIT_COSTS.VIEW_LIKER,
            upgradeTip: isCN 
              ? '升级到高级版即可免费查看谁喜欢你！' 
              : 'Upgrade to Premium to view who liked you for free!',
          },
          { status: 402 } // Payment Required
        );
      }

      creditsConsumed = CREDIT_COSTS.VIEW_LIKER;
      newBalance = creditsResult.newBalance;
    }

    // Get users who liked me
    const { data: swipes, error: swipesError } = await db
      .from('swipes')
      .select(`
        id,
        actor_id,
        action,
        created_at
      `)
      .eq('target_id', authUser.userId)
      .in('action', ['like', 'super_like'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (swipesError) {
      console.error('Error fetching likers:', swipesError);
      return NextResponse.json(
        {
          success: false,
          error: 'FETCH_LIKERS_FAILED',
          errorCode: 'FETCH_LIKERS_FAILED',
        },
        { status: 500 }
      );
    }

    // Get user profiles for the likers
    const likerIds = swipes?.map((s: any) => s.actor_id) || [];
    let likerProfiles: Record<string, unknown>[] = [];

    if (likerIds.length > 0) {
      const { data: profiles } = await db
        .from('v_user_full_profile')
        .select('id, username, avatar_url, gender, age, city_name, total_score')
        .in('id', likerIds);

      likerProfiles = profiles || [];
    }

    const profileMap = new Map(likerProfiles.map((p: any) => [p.id, p]));

    // Combine swipe data with user profiles
    const likers = (swipes || []).map((swipe: any) => ({
      swipeId: swipe.id,
      action: swipe.action,
      likedAt: swipe.created_at,
      isSuperLike: swipe.action === 'super_like',
      user: profileMap.get(swipe.actor_id) || {
        id: swipe.actor_id,
        username: isCN ? '未知用户' : 'Unknown',
      },
    }));

    // Get total count
    const { count: totalCount } = await db
      .from('swipes')
      .select('*', { count: 'exact', head: true })
      .eq('target_id', authUser.userId)
      .in('action', ['like', 'super_like']);

    return NextResponse.json({
      success: true,
      data: {
        likers,
        total: totalCount || 0,
        limit,
        offset,
        creditsConsumed,
        newBalance,
        isPremiumBenefit: isPremiumOrHigher,
      },
      messageCode: 'VIEW_LIKERS_SUCCESS',
      region: isCN ? 'CN' : 'INTL',
    });
  } catch (error) {
    console.error('View Likers POST API error:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
