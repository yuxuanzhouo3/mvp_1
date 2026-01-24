/**
 * Market Value API - 市场价值评分 API
 * GET /api/user/market-value - 获取用户市场价值评分
 * POST /api/user/market-value - 重新计算市场价值评分
 *
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';
import {
  calculateMarketValue,
  transformUserToScoringData,
  type MarketValueScore
} from '@/lib/scoring';
import type { GenderEnum } from '@/types/database';

// 从请求中验证用户身份
async function authenticateUser(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  try {
    const user = await requireUser(request);
    return { userId: user.userId, email: user.email };
  } catch {
    return null;
  }
}

// GET - 获取用户市场价值评分
export async function GET(request: NextRequest) {
  try {
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getServiceDbClient();

    // 获取用户资料中的市场价值评分
    const { data: profile, error } = await db
      .from('user_profiles')
      .select('market_value_score')
      .eq('user_id', authUser.userId)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch score' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        score: profile?.market_value_score || null
      }
    });
  } catch (error) {
    console.error('Market value GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - 重新计算市场价值评分
export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getServiceDbClient();

    // 获取用户基本信息
    const { data: userData, error: userError } = await db
      .from('users')
      .select('id, gender, birth_date')
      .eq('id', authUser.userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // 获取用户资料
    const { data: profileData, error: profileError } = await db
      .from('user_profiles')
      .select('*')
      .eq('user_id', authUser.userId)
      .single();

    if (profileError || !profileData) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }

    // 获取用户照片
    const { data: photosData } = await db
      .from('user_photos')
      .select('*')
      .eq('user_id', authUser.userId)
      .eq('audit_status', 'approved')
      .order('sort_order', { ascending: true });

    // 处理位置数据
    let location: { latitude: number; longitude: number } | null = null;
    if (profileData.location) {
      const loc = profileData.location;
      if (typeof loc === 'object' && 'coordinates' in loc) {
        location = {
          longitude: loc.coordinates[0],
          latitude: loc.coordinates[1]
        };
      } else if (typeof loc === 'object' && 'latitude' in loc) {
        location = loc as { latitude: number; longitude: number };
      }
    }

    // 计算 BMI
    let bmi: number | null = null;
    if (profileData.height_cm && profileData.weight_kg) {
      const heightInMeters = profileData.height_cm / 100;
      bmi = profileData.weight_kg / (heightInMeters * heightInMeters);
    }

    // 转换用户数据为评分输入格式
    const scoringData = transformUserToScoringData(
      {
        gender: userData.gender as GenderEnum | null,
        birth_date: userData.birth_date
      },
      {
        bmi,
        education_level: profileData.education_level,
        company_type: profileData.company_type,
        annual_income_range: profileData.annual_income_range,
        marital_status: profileData.marital_status || 'single',
        relationship_history_count: profileData.relationship_history_count || 0,
        children_preference: profileData.children_preference,
        mbti: profileData.mbti,
        location
      },
      photosData || []
    );

    // 计算市场价值
    const evaluatorGender: GenderEnum = userData.gender === 'male' ? 'female' : 'male';
    const result = await calculateMarketValue(
      scoringData,
      evaluatorGender,
      'compatible_match',
      null
    );

    // 计算百分位
    const { data: sameGenderUsers } = await db
      .from('users')
      .select('id')
      .eq('gender', userData.gender);

    let percentile = 50;
    if (sameGenderUsers && sameGenderUsers.length > 0) {
      percentile = Math.min(95, Math.max(5, Math.round(50 + (result.totalScore - 60) * 2)));
    }

    const fullScore: MarketValueScore = {
      ...result,
      percentile
    };

    // 保存到数据库
    const { error: updateError } = await db
      .from('user_profiles')
      .update({ market_value_score: fullScore })
      .eq('user_id', authUser.userId);

    if (updateError) {
      console.error('Failed to save market value score:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to save score' }, { status: 500 });
    }

    try {
      await db.from('user_market_value_score_history').insert({
        user_id: authUser.userId,
        total_score: fullScore.totalScore,
        percentile: fullScore.percentile,
        score_breakdown: fullScore.scoreBreakdown,
        calculated_at: fullScore.calculatedAt || new Date().toISOString(),
        version: fullScore.version,
        algorithm: (fullScore as any).algorithmType || 'compatible_match',
      });
    } catch (historyError) {
      console.warn('Failed to record market value score history:', historyError);
    }

    return NextResponse.json({
      success: true,
      data: {
        score: fullScore
      }
    });
  } catch (error) {
    console.error('Market value POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
