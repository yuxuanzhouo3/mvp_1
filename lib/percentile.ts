/**
 * Percentile Calculation Module - 百分位计算模块
 * 提供用户评分百分位排名相关功能
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import type { GenderEnum } from '@/types/database';

// ========================================
// 类型定义
// ========================================

export interface ScoreStatistics {
  avgScore: number;
  medianScore: number;
  minScore: number;
  maxScore: number;
  totalUsers: number;
}

export interface ScoreDistribution {
  scoreRange: string;
  userCount: number;
  percentage: number;
}

// ========================================
// 百分位计算函数
// ========================================

/**
 * 计算用户在同性别中的百分位排名
 * @param userId - 用户ID
 * @param totalScore - 用户总分
 * @returns 百分位 (0-100)
 */
export async function calculatePercentile(
  userId: string,
  totalScore: number
): Promise<number> {
  try {
    const supabase = getSupabaseClient();
    
    // 调用数据库函数计算百分位
    const { data, error } = await supabase
      .rpc('calculate_score_percentile', {
        p_user_id: userId,
        p_total_score: totalScore
      });
    
    if (error) {
      console.error('Failed to calculate percentile via RPC:', error);
      // 降级到客户端计算
      return calculatePercentileClient(userId, totalScore);
    }
    
    return data ?? 50;
  } catch (error) {
    console.error('Percentile calculation error:', error);
    return 50;
  }
}

/**
 * 客户端计算百分位（降级方案）
 * @param userId - 用户ID
 * @param totalScore - 用户总分
 * @returns 百分位 (0-100)
 */
async function calculatePercentileClient(
  userId: string,
  totalScore: number
): Promise<number> {
  try {
    const supabase = getSupabaseClient();
    
    // 获取用户性别
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('gender')
      .eq('id', userId)
      .single();
    
    if (userError || !userData?.gender) {
      return 50;
    }
    
    // 查询同性别用户的分数
    const { data: profiles, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        user_profiles!inner(market_value_score)
      `)
      .eq('gender', userData.gender)
      .neq('id', userId);
    
    if (profileError || !profiles) {
      return 50;
    }
    
    // 统计
    let lowerCount = 0;
    let totalCount = 0;
    
    for (const user of profiles) {
      const profile = user.user_profiles as unknown as { market_value_score: { totalScore?: number } | null };
      if (profile?.market_value_score?.totalScore !== undefined) {
        totalCount++;
        if (profile.market_value_score.totalScore < totalScore) {
          lowerCount++;
        }
      }
    }
    
    if (totalCount === 0) {
      return 50;
    }
    
    return Math.round((lowerCount / totalCount) * 100);
  } catch (error) {
    console.error('Client percentile calculation error:', error);
    return 50;
  }
}

/**
 * 获取分数统计信息
 * @param gender - 可选，按性别筛选
 * @returns 统计信息
 */
export async function getScoreStatistics(
  gender?: GenderEnum | null
): Promise<ScoreStatistics | null> {
  try {
    const searchParams = new URLSearchParams();
    if (gender) {
      searchParams.set('gender', gender);
    }
    const url = `/api/score/statistics${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const stats = (await response.json()) as ScoreStatistics | null;
    return stats;
  } catch (error) {
    console.error('Score statistics error:', error);
    return null;
  }
}

/**
 * 获取分数分布
 * @param gender - 可选，按性别筛选
 * @param bucketSize - 分组大小，默认10分一组
 * @returns 分布数据
 */
export async function getScoreDistribution(
  gender?: GenderEnum | null,
  bucketSize: number = 10
): Promise<ScoreDistribution[]> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .rpc('get_score_distribution', {
        p_gender: gender || null,
        p_bucket_size: bucketSize
      });
    
    if (error) {
      console.error('Failed to get score distribution:', error);
      return [];
    }
    
    return (data || []).map((item: { score_range: string; user_count: number; percentage: number }) => ({
      scoreRange: item.score_range,
      userCount: item.user_count,
      percentage: item.percentage
    }));
  } catch (error) {
    console.error('Score distribution error:', error);
    return [];
  }
}

/**
 * 获取用户在特定分数区间的排名
 * @param totalScore - 用户总分
 * @param gender - 性别
 * @returns 排名描述
 */
export function getScoreRanking(totalScore: number, percentile: number): string {
  if (percentile >= 95) {
    return 'Top 5%';
  } else if (percentile >= 90) {
    return 'Top 10%';
  } else if (percentile >= 80) {
    return 'Top 20%';
  } else if (percentile >= 70) {
    return 'Top 30%';
  } else if (percentile >= 50) {
    return 'Above Average';
  } else if (percentile >= 30) {
    return 'Below Average';
  } else {
    return 'Bottom 30%';
  }
}

/**
 * 获取分数等级
 * @param totalScore - 总分
 * @returns 等级 (S/A/B/C/D)
 */
export function getScoreGrade(totalScore: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (totalScore >= 90) return 'S';
  if (totalScore >= 80) return 'A';
  if (totalScore >= 70) return 'B';
  if (totalScore >= 60) return 'C';
  return 'D';
}

/**
 * 获取等级颜色
 * @param grade - 等级
 * @returns Tailwind颜色类名
 */
export function getGradeColor(grade: 'S' | 'A' | 'B' | 'C' | 'D'): string {
  switch (grade) {
    case 'S':
      return 'text-amber-500'; // 金色
    case 'A':
      return 'text-purple-500'; // 紫色
    case 'B':
      return 'text-blue-500'; // 蓝色
    case 'C':
      return 'text-green-500'; // 绿色
    case 'D':
      return 'text-gray-500'; // 灰色
  }
}

/**
 * 获取等级背景色
 * @param grade - 等级
 * @returns Tailwind背景颜色类名
 */
export function getGradeBgColor(grade: 'S' | 'A' | 'B' | 'C' | 'D'): string {
  switch (grade) {
    case 'S':
      return 'bg-amber-500/10 border-amber-500/20';
    case 'A':
      return 'bg-purple-500/10 border-purple-500/20';
    case 'B':
      return 'bg-blue-500/10 border-blue-500/20';
    case 'C':
      return 'bg-green-500/10 border-green-500/20';
    case 'D':
      return 'bg-gray-500/10 border-gray-500/20';
  }
}

