/**
 * Membership Status API - 获取用户会员状态
 * GET /api/memberships/status - 获取当前用户的会员状态
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';

export const dynamic = 'force-dynamic';

/**
 * GET /api/memberships/status
 * Get current user's membership status
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireUser(request);
    
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'AUTH_REQUIRED', errorCode: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const db = await getDbClient();
    const isCN = isChinaDeployment();

    // Get user's membership
    const { data: membership, error: membershipError } = await db
      .from('user_memberships')
      .select(`
        id,
        tier,
        started_at,
        expires_at,
        auto_renew,
        stripe_subscription_id,
        paypal_subscription_id,
        wechat_subscription_id,
        last_credits_grant_at,
        created_at
      `)
      .eq('user_id', authUser.userId)
      .single();

    // Get tier details
    const tierId = membership?.tier || 'free';
    const { data: tierDetails } = await db
      .from('membership_tiers')
      .select('*')
      .eq('id', tierId)
      .single();

    // Determine if membership is active
    const isActive = !membership?.expires_at || new Date(membership.expires_at) > new Date();
    const daysRemaining = membership?.expires_at
      ? Math.max(0, Math.ceil((new Date(membership.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return NextResponse.json({
      success: true,
      data: {
        membership: membership ? {
          id: membership.id,
          tier: membership.tier,
          startedAt: membership.started_at,
          expiresAt: membership.expires_at,
          autoRenew: membership.auto_renew,
          hasStripeSubscription: !!membership.stripe_subscription_id,
          hasPayPalSubscription: !!membership.paypal_subscription_id,
          hasWeChatSubscription: !!membership.wechat_subscription_id,
          lastCreditsGrantAt: membership.last_credits_grant_at,
          isActive,
          daysRemaining,
        } : {
          tier: 'free',
          isActive: true,
          daysRemaining: null,
        },
        tierDetails: tierDetails ? {
          id: tierDetails.id,
          nameEn: tierDetails.name_en,
          nameZh: tierDetails.name_zh,
          monthlyCredits: tierDetails.monthly_credits,
          benefits: {
            unlimitedLikes: tierDetails.unlimited_likes,
            canSeeWhoLikesMe: tierDetails.can_see_who_likes_me,
            priorityMatching: tierDetails.priority_matching,
            invisibleMode: tierDetails.invisible_mode,
            changeLocation: tierDetails.change_location,
            noAds: tierDetails.no_ads,
            vipSupport: tierDetails.vip_support,
          },
        } : {
          id: 'free',
          nameEn: 'Free',
          nameZh: '免费版',
          monthlyCredits: 0,
          benefits: {
            unlimitedLikes: false,
            canSeeWhoLikesMe: false,
            priorityMatching: false,
            invisibleMode: false,
            changeLocation: false,
            noAds: false,
            vipSupport: false,
          },
        },
        region: isCN ? 'CN' : 'INTL',
      },
    });
  } catch (error) {
    console.error('Membership status API error:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
