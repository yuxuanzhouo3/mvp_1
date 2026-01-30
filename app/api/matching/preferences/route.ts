/**
 * Matching Preferences API - 匹配算法偏好设置接口
 * GET /api/matching/preferences - 获取用户匹配偏好
 * PUT /api/matching/preferences - 更新用户匹配偏好
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';
import type { AlgorithmType } from '@/lib/matching/types';
import { getAlgorithmDisplayNamesForRequest } from '@/lib/matching/algorithm-display-name';

export const dynamic = 'force-dynamic';

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
 * GET /api/matching/preferences
 * 获取用户的匹配算法偏好设置
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: isChinaDeployment() ? '请先登录' : 'Please login first' },
        { status: 401 }
      );
    }

    const db = await getDbClient();
    const isCN = isChinaDeployment();

    // 获取用户的搜索偏好设置
    const { data: profile, error: profileError } = await db
      .from('user_profiles')
      .select('search_preferences')
      .eq('user_id', authUser.userId)
      .single();

    if (profileError) {
      console.error('Error fetching preferences:', profileError);
      return NextResponse.json(
        { success: false, error: isCN ? '获取偏好设置失败' : 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    const searchPrefs = profile?.search_preferences || {};
    const { names } = await getAlgorithmDisplayNamesForRequest(request);
    const preferredAlgorithm = (searchPrefs.preferred_algorithm || 'compatible') as AlgorithmType;

    return NextResponse.json({
      success: true,
      data: {
        // 匹配算法偏好
        preferredAlgorithm,
        preferredAlgorithmName: names[preferredAlgorithm],
        
        // 搜索范围设置
        searchRadiusKm: searchPrefs.search_radius_km || 50,
        ageRangeMin: searchPrefs.age_range_min || 18,
        ageRangeMax: searchPrefs.age_range_max || 60,
        heightRangeMin: searchPrefs.height_range_min || 140,
        heightRangeMax: searchPrefs.height_range_max || 220,
        
        // 筛选条件
        educationRequirement: searchPrefs.education_requirement || 'any',
        incomeRequirement: searchPrefs.income_requirement || 'any',
        
        // 可用算法列表
        availableAlgorithms: (['compatible', 'romantic', 'pragmatic', 'serendipity'] as AlgorithmType[]).map(
          (key) => ({
            id: key,
            name: names[key],
            description: getAlgorithmDescription(key, isCN),
          })
        ),
      }
    });

  } catch (error) {
    console.error('Preferences GET API error:', error);
    return NextResponse.json(
      { success: false, error: isChinaDeployment() ? '服务器内部错误' : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/matching/preferences
 * 更新用户的匹配算法偏好设置
 */
export async function PUT(request: NextRequest) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: isChinaDeployment() ? '请先登录' : 'Please login first' },
        { status: 401 }
      );
    }

    const db = await getDbClient();
    const isCN = isChinaDeployment();

    // 解析请求体
    const body = await request.json();
    const {
      preferredAlgorithm,
      searchRadiusKm,
      ageRangeMin,
      ageRangeMax,
      heightRangeMin,
      heightRangeMax,
      educationRequirement,
      incomeRequirement
    } = body;

    // 验证算法类型
    const validAlgorithms: AlgorithmType[] = ['compatible', 'romantic', 'pragmatic', 'serendipity'];
    if (preferredAlgorithm && !validAlgorithms.includes(preferredAlgorithm)) {
      return NextResponse.json(
        { success: false, error: isCN ? '无效的算法类型' : 'Invalid algorithm type' },
        { status: 400 }
      );
    }

    // 验证数值范围
    if (searchRadiusKm !== undefined && (searchRadiusKm < 5 || searchRadiusKm > 200)) {
      return NextResponse.json(
        { success: false, error: isCN ? '搜索半径必须在5-200公里之间' : 'Search radius must be between 5-200km' },
        { status: 400 }
      );
    }

    if (ageRangeMin !== undefined && ageRangeMax !== undefined) {
      if (ageRangeMin < 18 || ageRangeMax > 100 || ageRangeMin > ageRangeMax) {
        return NextResponse.json(
          { success: false, error: isCN ? '年龄范围无效' : 'Invalid age range' },
          { status: 400 }
        );
      }
    }

    if (heightRangeMin !== undefined && heightRangeMax !== undefined) {
      if (heightRangeMin < 100 || heightRangeMax > 250 || heightRangeMin > heightRangeMax) {
        return NextResponse.json(
          { success: false, error: isCN ? '身高范围无效' : 'Invalid height range' },
          { status: 400 }
        );
      }
    }

    // 获取现有设置
    const { data: existingProfile } = await db
      .from('user_profiles')
      .select('search_preferences')
      .eq('user_id', authUser.userId)
      .single();

    const existingPrefs = existingProfile?.search_preferences || {};

    // 合并更新
    const updatedPrefs = {
      ...existingPrefs,
      ...(preferredAlgorithm !== undefined && { preferred_algorithm: preferredAlgorithm }),
      ...(searchRadiusKm !== undefined && { search_radius_km: searchRadiusKm }),
      ...(ageRangeMin !== undefined && { age_range_min: ageRangeMin }),
      ...(ageRangeMax !== undefined && { age_range_max: ageRangeMax }),
      ...(heightRangeMin !== undefined && { height_range_min: heightRangeMin }),
      ...(heightRangeMax !== undefined && { height_range_max: heightRangeMax }),
      ...(educationRequirement !== undefined && { education_requirement: educationRequirement }),
      ...(incomeRequirement !== undefined && { income_requirement: incomeRequirement })
    };

    // 更新数据库
    const { error: updateError } = await db
      .from('user_profiles')
      .update({ search_preferences: updatedPrefs })
      .eq('user_id', authUser.userId);

    if (updateError) {
      console.error('Error updating preferences:', updateError);
      return NextResponse.json(
        { success: false, error: isCN ? '更新偏好设置失败' : 'Failed to update preferences' },
        { status: 500 }
      );
    }

    const { names } = await getAlgorithmDisplayNamesForRequest(request);
    const preferredAlgorithmEffective = (updatedPrefs.preferred_algorithm || 'compatible') as AlgorithmType;

    return NextResponse.json({
      success: true,
      data: {
        preferredAlgorithm: preferredAlgorithmEffective,
        preferredAlgorithmName: names[preferredAlgorithmEffective],
        searchRadiusKm: updatedPrefs.search_radius_km || 50,
        ageRangeMin: updatedPrefs.age_range_min || 18,
        ageRangeMax: updatedPrefs.age_range_max || 60,
        heightRangeMin: updatedPrefs.height_range_min || 140,
        heightRangeMax: updatedPrefs.height_range_max || 220,
        educationRequirement: updatedPrefs.education_requirement || 'any',
        incomeRequirement: updatedPrefs.income_requirement || 'any',
        message: isCN ? '偏好设置已更新' : 'Preferences updated'
      }
    });

  } catch (error) {
    console.error('Preferences PUT API error:', error);
    return NextResponse.json(
      { success: false, error: isChinaDeployment() ? '服务器内部错误' : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 获取算法描述
 */
function getAlgorithmDescription(algorithm: AlgorithmType, isCN: boolean): string {
  const descriptions: Record<AlgorithmType, { cn: string; en: string }> = {
    compatible: {
      cn: '寻找条件相近的人，门当户对，关系更稳定',
      en: 'Find similar people for stable relationships'
    },
    romantic: {
      cn: '优先推荐更优秀的对象，勇敢追求心仪的人',
      en: 'Prioritize excellent matches, pursue your dreams'
    },
    pragmatic: {
      cn: '推荐条件稍低但成功率更高的对象，稳稳的幸福',
      en: 'Higher success rate with practical matches'
    },
    serendipity: {
      cn: '随机推荐，相信缘分的奇妙安排',
      en: 'Random matches, believe in serendipity'
    }
  };
  return isCN ? descriptions[algorithm].cn : descriptions[algorithm].en;
}
