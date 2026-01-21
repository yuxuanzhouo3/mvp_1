/**
 * 积分套餐 API
 * Credit Packages API
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';

export const dynamic = 'force-dynamic';

interface CreditPackage {
  id: string;
  name_en: string;
  name_zh: string;
  credits: number;
  price_usd: number;
  price_cny: number;
  original_price_usd: number | null;
  original_price_cny: number | null;
  discount_percent: number;
  bonus_boost: number;
  bonus_premium_days: number;
  bonus_vip_days: number;
  is_popular: boolean;
  is_best_value: boolean;
  sort_order: number;
}

// Fallback packages if database is not yet migrated
const FALLBACK_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name_en: 'Starter Pack',
    name_zh: '入门包',
    credits: 50,
    price_usd: 1.39,
    price_cny: 9.99,
    original_price_usd: null,
    original_price_cny: null,
    discount_percent: 0,
    bonus_boost: 0,
    bonus_premium_days: 0,
    bonus_vip_days: 0,
    is_popular: false,
    is_best_value: false,
    sort_order: 1,
  },
  {
    id: 'popular',
    name_en: 'Popular Pack',
    name_zh: '热门包',
    credits: 150,
    price_usd: 3.49,
    price_cny: 24.99,
    original_price_usd: 4.39,
    original_price_cny: 29.99,
    discount_percent: 20,
    bonus_boost: 1,
    bonus_premium_days: 0,
    bonus_vip_days: 0,
    is_popular: true,
    is_best_value: false,
    sort_order: 2,
  },
  {
    id: 'premium',
    name_en: 'Premium Pack',
    name_zh: '高级包',
    credits: 300,
    price_usd: 6.29,
    price_cny: 44.99,
    original_price_usd: 8.39,
    original_price_cny: 59.99,
    discount_percent: 25,
    bonus_boost: 0,
    bonus_premium_days: 3,
    bonus_vip_days: 0,
    is_popular: false,
    is_best_value: true,
    sort_order: 3,
  },
  {
    id: 'ultimate',
    name_en: 'Ultimate Pack',
    name_zh: '终极包',
    credits: 500,
    price_usd: 9.79,
    price_cny: 69.99,
    original_price_usd: 13.99,
    original_price_cny: 99.99,
    discount_percent: 30,
    bonus_boost: 0,
    bonus_premium_days: 0,
    bonus_vip_days: 7,
    is_popular: false,
    is_best_value: false,
    sort_order: 4,
  },
];

/**
 * GET /api/credits/packages
 * Returns all available credit packages
 */
export async function GET(request: NextRequest) {
  try {
    const db = await getDbClient();
    const isCN = isChinaDeployment();

    // Get query params
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency') || (isCN ? 'CNY' : 'USD');

    // Try to get packages from database
    const { data: packages, error } = await db
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // Use fallback if database query fails or returns empty
    const packagesData = (error || !packages || packages.length === 0)
      ? FALLBACK_PACKAGES
      : packages as CreditPackage[];

    // Format packages based on currency preference
    const formattedPackages = packagesData.map((pkg) => ({
      id: pkg.id,
      name: currency === 'CNY' ? pkg.name_zh : pkg.name_en,
      nameEn: pkg.name_en,
      nameZh: pkg.name_zh,
      credits: pkg.credits,
      price: currency === 'CNY' ? pkg.price_cny : pkg.price_usd,
      priceUsd: pkg.price_usd,
      priceCny: pkg.price_cny,
      originalPrice: currency === 'CNY' ? pkg.original_price_cny : pkg.original_price_usd,
      originalPriceUsd: pkg.original_price_usd,
      originalPriceCny: pkg.original_price_cny,
      discountPercent: pkg.discount_percent,
      bonuses: {
        boost: pkg.bonus_boost,
        premiumDays: pkg.bonus_premium_days,
        vipDays: pkg.bonus_vip_days,
      },
      isPopular: pkg.is_popular,
      isBestValue: pkg.is_best_value,
      sortOrder: pkg.sort_order,
    }));

    const rawTestMode = process.env.PAYMENT_TEST_MODE;
    const isTestModeEnabled =
      isCN &&
      currency === 'CNY' &&
      typeof rawTestMode === 'string' &&
      ['true', 'ture', '1', 'yes', 'on'].includes(rawTestMode.toLowerCase());

    if (isTestModeEnabled) {
      formattedPackages.push({
        id: 'test_0_01',
        name: '微信支付测试单',
        nameEn: 'WeChat Test Order',
        nameZh: '微信支付测试单',
        credits: 1,
        price: 0.01,
        priceUsd: 0.01,
        priceCny: 0.01,
        originalPrice: null,
        originalPriceUsd: null,
        originalPriceCny: null,
        discountPercent: 0,
        bonuses: { boost: 0, premiumDays: 0, vipDays: 0 },
        isPopular: false,
        isBestValue: false,
        sortOrder: 999,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        packages: formattedPackages,
        currency: currency,
        total: formattedPackages.length,
        region: isCN ? 'CN' : 'INTL',
      },
    });
  } catch (error) {
    console.error('Credit packages API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
