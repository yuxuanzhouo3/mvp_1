/**
 * Matching Preferences API - 匹配算法偏好设置接口
 * GET /api/matching/preferences - 获取用户匹配偏好
 * PUT /api/matching/preferences - 更新用户匹配偏好
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import type { AlgorithmType } from '@/lib/matching/types';
import { ALGORITHM_NAMES } from '@/lib/matching/types';

/**
 * GET /api/matching/preferences
 * 获取用户的匹配算法偏好设置
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    // 获取用户的搜索偏好设置
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('search_preferences')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching preferences:', profileError);
      return NextResponse.json(
        { success: false, error: '获取偏好设置失败' },
        { status: 500 }
      );
    }

    const searchPrefs = profile?.search_preferences || {};

    return NextResponse.json({
      success: true,
      data: {
        // 匹配算法偏好
        preferredAlgorithm: searchPrefs.preferred_algorithm || 'compatible',
        preferredAlgorithmName: ALGORITHM_NAMES[searchPrefs.preferred_algorithm as AlgorithmType || 'compatible'],
        
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
        availableAlgorithms: Object.entries(ALGORITHM_NAMES).map(([key, name]) => ({
          id: key,
          name,
          description: getAlgorithmDescription(key as AlgorithmType)
        }))
      }
    });

  } catch (error) {
    console.error('Preferences GET API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
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
    const supabase = createRouteHandlerClient();
    
    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

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
        { success: false, error: '无效的算法类型' },
        { status: 400 }
      );
    }

    // 验证数值范围
    if (searchRadiusKm !== undefined && (searchRadiusKm < 5 || searchRadiusKm > 200)) {
      return NextResponse.json(
        { success: false, error: '搜索半径必须在5-200公里之间' },
        { status: 400 }
      );
    }

    if (ageRangeMin !== undefined && ageRangeMax !== undefined) {
      if (ageRangeMin < 18 || ageRangeMax > 100 || ageRangeMin > ageRangeMax) {
        return NextResponse.json(
          { success: false, error: '年龄范围无效' },
          { status: 400 }
        );
      }
    }

    if (heightRangeMin !== undefined && heightRangeMax !== undefined) {
      if (heightRangeMin < 100 || heightRangeMax > 250 || heightRangeMin > heightRangeMax) {
        return NextResponse.json(
          { success: false, error: '身高范围无效' },
          { status: 400 }
        );
      }
    }

    // 获取现有设置
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('search_preferences')
      .eq('user_id', user.id)
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
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ search_preferences: updatedPrefs })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating preferences:', updateError);
      return NextResponse.json(
        { success: false, error: '更新偏好设置失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        preferredAlgorithm: updatedPrefs.preferred_algorithm || 'compatible',
        preferredAlgorithmName: ALGORITHM_NAMES[updatedPrefs.preferred_algorithm as AlgorithmType || 'compatible'],
        searchRadiusKm: updatedPrefs.search_radius_km || 50,
        ageRangeMin: updatedPrefs.age_range_min || 18,
        ageRangeMax: updatedPrefs.age_range_max || 60,
        heightRangeMin: updatedPrefs.height_range_min || 140,
        heightRangeMax: updatedPrefs.height_range_max || 220,
        educationRequirement: updatedPrefs.education_requirement || 'any',
        incomeRequirement: updatedPrefs.income_requirement || 'any',
        message: '偏好设置已更新'
      }
    });

  } catch (error) {
    console.error('Preferences PUT API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取算法描述
 */
function getAlgorithmDescription(algorithm: AlgorithmType): string {
  const descriptions: Record<AlgorithmType, string> = {
    compatible: '寻找条件相近的人，门当户对，关系更稳定',
    romantic: '优先推荐更优秀的对象，勇敢追求心仪的人',
    pragmatic: '推荐条件稍低但成功率更高的对象，稳稳的幸福',
    serendipity: '随机推荐，相信缘分的奇妙安排'
  };
  return descriptions[algorithm];
}

