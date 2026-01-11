/**
 * View Likers API - 查看谁喜欢我
 * GET /api/profile/view-likers - 获取喜欢我的用户数量（预览）
 * POST /api/profile/view-likers - 解锁查看谁喜欢我 (5积分，Premium+ 会员免费)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { checkAndConsumeCredits, CREDIT_COSTS } from '@/lib/credits/credits';

/**
 * GET /api/profile/view-likers
 * Get preview of who liked me (count only, blurred info)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'AUTH_REQUIRED', errorCode: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Get count of users who liked me (excluding those I've already interacted with)
    const { count: likerCount, error: countError } = await supabase
      .from('swipes')
      .select('*', { count: 'exact', head: true })
      .eq('target_id', user.id)
      .in('action', ['like', 'super_like']);

    if (countError) {
      console.error('Error counting likers:', countError);
    }

    // Check if user has Premium+ membership (can view for free)
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('tier, expires_at')
      .eq('user_id', user.id)
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
    const supabase = createRouteHandlerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'AUTH_REQUIRED', errorCode: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check if user has Premium+ membership (can view for free)
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('tier, expires_at')
      .eq('user_id', user.id)
      .single();

    const isPremiumOrHigher = membership &&
      ['premium', 'vip'].includes(membership.tier) &&
      (!membership.expires_at || new Date(membership.expires_at) > new Date());

    let creditsConsumed = 0;
    let newBalance: number | undefined;

    // If not Premium+, need to pay credits
    if (!isPremiumOrHigher) {
      const creditsResult = await checkAndConsumeCredits(user.id, 'view_liker');

      if (!creditsResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: creditsResult.error || 'INSUFFICIENT_CREDITS',
            errorCode: creditsResult.errorCode || 'INSUFFICIENT_CREDITS',
            requiredCredits: CREDIT_COSTS.VIEW_LIKER,
            upgradeTip: 'Upgrade to Premium to view who liked you for free!',
          },
          { status: 402 } // Payment Required
        );
      }

      creditsConsumed = CREDIT_COSTS.VIEW_LIKER;
      newBalance = creditsResult.newBalance;
    }

    // Get users who liked me
    const { data: swipes, error: swipesError } = await supabase
      .from('swipes')
      .select(`
        id,
        actor_id,
        action,
        created_at
      `)
      .eq('target_id', user.id)
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
    const likerIds = swipes?.map(s => s.actor_id) || [];
    let likerProfiles: Record<string, unknown>[] = [];

    if (likerIds.length > 0) {
      const { data: profiles } = await supabase
        .from('v_user_full_profile')
        .select('id, username, avatar_url, gender, age, city_name, total_score')
        .in('id', likerIds);

      likerProfiles = profiles || [];
    }

    const profileMap = new Map(likerProfiles.map(p => [p.id, p]));

    // Combine swipe data with user profiles
    const likers = (swipes || []).map(swipe => ({
      swipeId: swipe.id,
      action: swipe.action,
      likedAt: swipe.created_at,
      isSuperLike: swipe.action === 'super_like',
      user: profileMap.get(swipe.actor_id) || {
        id: swipe.actor_id,
        username: 'Unknown',
      },
    }));

    // Get total count
    const { count: totalCount } = await supabase
      .from('swipes')
      .select('*', { count: 'exact', head: true })
      .eq('target_id', user.id)
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
    });
  } catch (error) {
    console.error('View Likers POST API error:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
