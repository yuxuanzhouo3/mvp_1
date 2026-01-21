/**
 * Membership Tiers API - 会员等级列表
 * GET /api/memberships/tiers - 获取所有会员等级及权益
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';

export const dynamic = 'force-dynamic';

interface MembershipTier {
  id: string;
  name_en: string;
  name_zh: string;
  monthly_price_usd: number;
  monthly_price_cny: number;
  monthly_credits: number;
  features: string[];
  features_en?: string[];
  features_zh?: string[];
  unlimited_likes: boolean;
  can_see_who_likes_me: boolean;
  priority_matching: boolean;
  invisible_mode: boolean;
  change_location: boolean;
  no_ads: boolean;
  vip_support: boolean;
  sort_order: number;
}

const DEFAULT_TIERS: MembershipTier[] = [
  {
    id: 'free',
    name_en: 'Free',
    name_zh: '免费版',
    monthly_price_usd: 0,
    monthly_price_cny: 0,
    monthly_credits: 0,
    features: ['每日有限 Like', '基础匹配功能', '含广告'],
    features_en: ['Daily limited likes', 'Basic matching', 'Includes ads'],
    features_zh: ['每日有限 Like', '基础匹配功能', '含广告'],
    unlimited_likes: false,
    can_see_who_likes_me: false,
    priority_matching: false,
    invisible_mode: false,
    change_location: false,
    no_ads: false,
    vip_support: false,
    sort_order: 1,
  },
  {
    id: 'basic',
    name_en: 'Basic',
    name_zh: '基础版',
    monthly_price_usd: 3.99,
    monthly_price_cny: 25.99,
    monthly_credits: 100,
    features: ['无限 Like', '每月赠送 100 积分', '去广告'],
    features_en: ['Unlimited likes', '100 monthly credits', 'No ads'],
    features_zh: ['无限 Like', '每月赠送 100 积分', '去广告'],
    unlimited_likes: true,
    can_see_who_likes_me: false,
    priority_matching: false,
    invisible_mode: false,
    change_location: false,
    no_ads: true,
    vip_support: false,
    sort_order: 2,
  },
  {
    id: 'premium',
    name_en: 'Premium',
    name_zh: '高级版',
    monthly_price_usd: 6.99,
    monthly_price_cny: 45.99,
    monthly_credits: 200,
    features: ['包含基础版所有权益', '优先匹配', '查看谁喜欢我', '每月赠送 200 积分'],
    features_en: [
      'All Basic benefits',
      'Priority matching',
      'See who likes you',
      '200 monthly credits',
    ],
    features_zh: ['包含基础版所有权益', '优先匹配', '查看谁喜欢我', '每月赠送 200 积分'],
    unlimited_likes: true,
    can_see_who_likes_me: true,
    priority_matching: true,
    invisible_mode: false,
    change_location: false,
    no_ads: true,
    vip_support: false,
    sort_order: 3,
  },
  {
    id: 'vip',
    name_en: 'VIP',
    name_zh: 'VIP尊享版',
    monthly_price_usd: 9.99,
    monthly_price_cny: 69.99,
    monthly_credits: 300,
    features: ['包含高级版所有权益', '隐身模式', '修改定位', '24/7 专属客服', '每月赠送 300 积分'],
    features_en: [
      'All Premium benefits',
      'Invisible mode',
      'Change location',
      '24/7 VIP support',
      '300 monthly credits',
    ],
    features_zh: ['包含高级版所有权益', '隐身模式', '修改定位', '24/7 专属客服', '每月赠送 300 积分'],
    unlimited_likes: true,
    can_see_who_likes_me: true,
    priority_matching: true,
    invisible_mode: true,
    change_location: true,
    no_ads: true,
    vip_support: true,
    sort_order: 4,
  },
];

/**
 * GET /api/memberships/tiers
 * Returns all membership tiers with their benefits
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDbClient();
    const isCN = isChinaDeployment();

    // Get query params
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency') || (isCN ? 'CNY' : 'USD');
    const isChineseLocale = currency === 'CNY';

    // Try to get tiers from database
    const { data: tiers, error } = await db
      .from('membership_tiers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // Use fallback if database query fails or returns empty
    const useFallback = error || !tiers || tiers.length === 0;
    const fallbackTiers = useFallback ? DEFAULT_TIERS : null;

    // Format tiers based on currency preference
    const formattedTiers = useFallback
      ? (fallbackTiers || []).map((tier) => ({
          id: tier.id,
          name: isChineseLocale ? tier.name_zh : tier.name_en,
          nameEn: tier.name_en,
          nameZh: tier.name_zh,
          monthlyPrice: isChineseLocale ? tier.monthly_price_cny : tier.monthly_price_usd,
          monthlyPriceUsd: tier.monthly_price_usd,
          monthlyPriceCny: tier.monthly_price_cny,
          monthlyCredits: tier.monthly_credits,
          features: isChineseLocale
            ? (tier.features_zh && tier.features_zh.length > 0 ? tier.features_zh : tier.features)
            : (tier.features_en && tier.features_en.length > 0 ? tier.features_en : tier.features),
          benefits: {
            unlimitedLikes: tier.unlimited_likes,
            canSeeWhoLikesMe: tier.can_see_who_likes_me,
            priorityMatching: tier.priority_matching,
            invisibleMode: tier.invisible_mode,
            changeLocation: tier.change_location,
            noAds: tier.no_ads,
            vipSupport: tier.vip_support,
          },
          sortOrder: tier.sort_order,
          isPopular: tier.id === 'premium',
          isBestValue: tier.id === 'vip',
        }))
      : (tiers as MembershipTier[]).map((tier) => {
          // 根据语言选择正确的 features
          let features = tier.features;
          if (isChineseLocale && tier.features_zh && tier.features_zh.length > 0) {
            features = tier.features_zh;
          } else if (!isChineseLocale && tier.features_en && tier.features_en.length > 0) {
            features = tier.features_en;
          }

          return {
            id: tier.id,
            name: isChineseLocale ? tier.name_zh : tier.name_en,
            nameEn: tier.name_en,
            nameZh: tier.name_zh,
            monthlyPrice: isChineseLocale ? tier.monthly_price_cny : tier.monthly_price_usd,
            monthlyPriceUsd: tier.monthly_price_usd,
            monthlyPriceCny: tier.monthly_price_cny,
            monthlyCredits: tier.monthly_credits,
            features: features,
            benefits: {
              unlimitedLikes: tier.unlimited_likes,
              canSeeWhoLikesMe: tier.can_see_who_likes_me,
              priorityMatching: tier.priority_matching,
              invisibleMode: tier.invisible_mode,
              changeLocation: tier.change_location,
              noAds: tier.no_ads,
              vipSupport: tier.vip_support,
            },
            sortOrder: tier.sort_order,
            isPopular: tier.id === 'premium',
            isBestValue: tier.id === 'vip',
          };
        });

    return NextResponse.json({
      success: true,
      data: {
        tiers: formattedTiers,
        currency: currency,
        total: formattedTiers.length,
        region: isCN ? 'CN' : 'INTL',
      },
    });
  } catch (error) {
    console.error('Membership tiers API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
