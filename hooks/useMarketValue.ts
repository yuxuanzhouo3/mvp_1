/**
 * Market Value Hook - 市场价值评分Hook
 * 使用React Query管理评分数据的获取和更新
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  calculateMarketValue,
  transformUserToScoringData,
  type MarketValueScore,
  type AlgorithmType,
  type Location
} from '@/lib/scoring';
import type { GenderEnum } from '@/types/database';

// ========================================
// 类型定义
// ========================================

interface UseMarketValueOptions {
  /** 用户ID */
  userId: string;
  /** 评估者性别（用于计算权重） */
  evaluatorGender?: GenderEnum;
  /** 算法类型 */
  algorithm?: AlgorithmType;
  /** 评估者位置（用于距离计算） */
  evaluatorLocation?: Location | null;
  /** 是否自动获取 */
  enabled?: boolean;
}

interface UseMarketValueReturn {
  /** 评分数据 */
  score: MarketValueScore | null;
  /** 是否加载中 */
  isLoading: boolean;
  /** 是否正在重新计算 */
  isRecalculating: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 重新计算评分 */
  recalculateScore: () => Promise<MarketValueScore | null>;
  /** 刷新数据 */
  refetch: () => void;
}

interface UserDataForScoring {
  user: {
    id: string;
    gender: GenderEnum | null;
    birth_date: string | null;
  };
  profile: {
    bmi: number | null;
    education_level: string | null;
    company_type: string | null;
    annual_income_range: string | null;
    marital_status: string;
    relationship_history_count: number;
    children_preference: string | null;
    mbti: string | null;
    location: { latitude: number; longitude: number } | null;
    market_value_score: MarketValueScore | null;
  };
  photos: Array<{
    id: string;
    user_id: string;
    url: string;
    thumbnail_url: string | null;
    is_primary: boolean;
    sort_order: number;
    ai_scores: { beauty?: number; authenticity?: number };
    audit_status: 'pending' | 'approved' | 'rejected';
    created_at: string;
  }>;
}

// ========================================
// 数据获取函数
// ========================================

/**
 * 从Supabase获取用户评分相关数据
 */
async function fetchUserDataForScoring(userId: string): Promise<UserDataForScoring | null> {
  const supabase = getSupabaseClient();
  
  // 并行获取用户基本信息、资料和照片
  const [userResult, profileResult, photosResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, gender, birth_date')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('user_photos')
      .select('*')
      .eq('user_id', userId)
      .eq('audit_status', 'approved')
      .order('sort_order', { ascending: true })
  ]);
  
  if (userResult.error || !userResult.data) {
    console.error('Failed to fetch user data:', userResult.error);
    return null;
  }
  
  // 处理位置数据（PostGIS格式转换）
  let location: { latitude: number; longitude: number } | null = null;
  if (profileResult.data?.location) {
    // PostGIS GEOGRAPHY类型可能返回不同格式
    const loc = profileResult.data.location;
    if (typeof loc === 'object' && 'coordinates' in loc) {
      // GeoJSON格式: { type: "Point", coordinates: [lng, lat] }
      location = {
        longitude: loc.coordinates[0],
        latitude: loc.coordinates[1]
      };
    } else if (typeof loc === 'object' && 'latitude' in loc) {
      location = loc as { latitude: number; longitude: number };
    }
  }
  
  return {
    user: userResult.data,
    profile: {
      ...profileResult.data,
      location,
      market_value_score: profileResult.data?.market_value_score || null
    },
    photos: photosResult.data || []
  };
}

/**
 * 获取同性别用户分数分布，计算百分位
 */
async function calculatePercentile(
  userId: string,
  gender: GenderEnum,
  totalScore: number
): Promise<number> {
  const supabase = getSupabaseClient();
  
  // 查询同性别用户的分数，计算有多少人分数低于当前用户
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      user_profiles!inner(market_value_score)
    `)
    .eq('gender', gender)
    .not('user_profiles.market_value_score', 'is', null);
  
  if (error || !data) {
    console.error('Failed to calculate percentile:', error);
    return 50; // 默认返回50百分位
  }
  
  // 统计分数低于当前用户的数量
  let lowerCount = 0;
  let totalCount = 0;
  
  for (const user of data) {
    if (user.id === userId) continue;
    
    const profile = user.user_profiles as unknown as { market_value_score: MarketValueScore | null };
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
}

/**
 * 保存评分到数据库
 */
async function saveMarketValueScore(
  userId: string,
  score: MarketValueScore
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from('user_profiles')
    .update({
      market_value_score: score
    })
    .eq('user_id', userId);
  
  if (error) {
    console.error('Failed to save market value score:', error);
    throw new Error('Failed to save score');
  }
}

// ========================================
// Hook实现
// ========================================

/**
 * 市场价值评分Hook
 */
export function useMarketValue({
  userId,
  evaluatorGender = 'male',
  algorithm = 'compatible_match',
  evaluatorLocation = null,
  enabled = true
}: UseMarketValueOptions): UseMarketValueReturn {
  const queryClient = useQueryClient();
  const queryKey = ['marketValue', userId, algorithm];
  
  // 获取用户数据和现有评分
  const {
    data: userData,
    isLoading,
    error: fetchError,
    refetch
  } = useQuery({
    queryKey: ['userData', userId],
    queryFn: () => fetchUserDataForScoring(userId),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5分钟内不重新获取
    gcTime: 30 * 60 * 1000 // 缓存30分钟
  });
  
  // 重新计算评分的mutation
  const recalculateMutation = useMutation({
    mutationFn: async (): Promise<MarketValueScore | null> => {
      if (!userData) {
        throw new Error('User data not available');
      }
      
      // 转换用户数据为评分输入格式
      const scoringData = transformUserToScoringData(
        userData.user as { gender: GenderEnum | null; birth_date: string | null },
        userData.profile as Parameters<typeof transformUserToScoringData>[1],
        userData.photos
      );
      
      // 计算市场价值
      const result = calculateMarketValue(
        scoringData,
        evaluatorGender,
        algorithm,
        evaluatorLocation
      );
      
      // 计算百分位
      const percentile = await calculatePercentile(
        userId,
        userData.user.gender || 'other',
        result.totalScore
      );
      
      const fullScore: MarketValueScore = {
        ...result,
        percentile
      };
      
      // 保存到数据库
      await saveMarketValueScore(userId, fullScore);
      
      return fullScore;
    },
    onSuccess: (data) => {
      if (data) {
        // 更新缓存
        queryClient.setQueryData(['userData', userId], (old: UserDataForScoring | null | undefined) => {
          if (!old) return old;
          return {
            ...old,
            profile: {
              ...old.profile,
              market_value_score: data
            }
          };
        });
      }
    }
  });
  
  // 重新计算评分函数
  const recalculateScore = useCallback(async (): Promise<MarketValueScore | null> => {
    return recalculateMutation.mutateAsync();
  }, [recalculateMutation]);
  
  // 当前评分（从缓存或数据库）
  const score = useMemo((): MarketValueScore | null => {
    if (!userData?.profile?.market_value_score) {
      return null;
    }
    return userData.profile.market_value_score;
  }, [userData]);
  
  return {
    score,
    isLoading,
    isRecalculating: recalculateMutation.isPending,
    error: fetchError || recalculateMutation.error || null,
    recalculateScore,
    refetch
  };
}

/**
 * 获取用户评分详情的简化Hook
 */
export function useUserScore(userId: string) {
  return useQuery({
    queryKey: ['userScore', userId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('market_value_score')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Failed to fetch user score:', error);
        return null;
      }
      
      return data?.market_value_score as MarketValueScore | null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000
  });
}

export default useMarketValue;

