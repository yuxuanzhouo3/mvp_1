/**
 * Percentile Calculation Module - 百分位数计算模块
 * 支持CN环境（Cloudbase）和INTL环境（Supabase）
 */

import { getDbClient, isChinaDeployment } from './db-client';

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

/**
 * 分数分布缓存接口
 */
interface ScoreDistributionCache {
  scores: number[];
  totalUsers: number;
  timestamp: number;
}

// ========================================
// 缓存配置
// ========================================

/** 缓存TTL（毫秒）- 5分钟 */
const CACHE_TTL = 5 * 60 * 1000;

/** 分数分布缓存 */
let scoreDistributionCache: ScoreDistributionCache | null = null;

// ========================================
// 核心函数
// ========================================

/**
 * 获取所有用户的市场价值分数（内部函数）
 * @returns 分数数组（已排序）
 */
async function fetchAllScores(): Promise<number[]> {
  // 检查缓存
  if (scoreDistributionCache && Date.now() - scoreDistributionCache.timestamp < CACHE_TTL) {
    return scoreDistributionCache.scores;
  }

  const db = await getDbClient();
  const isCN = isChinaDeployment();

  try {
    if (isCN) {
      // CN环境：Cloudbase查询
      const { data, error } = await db
        .from('user_profiles')
        .select('market_value_score');

      if (error) {
        console.error('[Percentile CN] Failed to fetch scores:', error);
        return [];
      }

      // 提取分数并过滤null值
      const scores = (data || [])
        .map((profile: any) => profile.market_value_score)
        .filter((score: any) => score !== null && score !== undefined)
        .sort((a: number, b: number) => a - b);

      // 更新缓存
      scoreDistributionCache = {
        scores,
        totalUsers: scores.length,
        timestamp: Date.now(),
      };

      return scores;
    } else {
      // INTL环境：Supabase查询
      const { data, error } = await db
        .from('user_profiles')
        .select('market_value_score')
        .not('market_value_score', 'is', null);

      if (error) {
        console.error('[Percentile INTL] Failed to fetch scores:', error);
        return [];
      }

      // 提取分数并排序
      const scores = (data || [])
        .map((profile: any) => profile.market_value_score)
        .sort((a: number, b: number) => a - b);

      // 更新缓存
      scoreDistributionCache = {
        scores,
        totalUsers: scores.length,
        timestamp: Date.now(),
      };

      return scores;
    }
  } catch (error) {
    console.error('[Percentile] Error fetching score distribution:', error);
    return [];
  }
}

/**
 * 计算百分位数
 * @param totalScore - 用户的市场价值分数
 * @returns 百分位数 (0-100)
 */
export async function calculatePercentile(totalScore: number): Promise<number> {
  // 获取分数分布
  const scores = await fetchAllScores();

  // 如果没有数据，返回50（中位数）
  if (scores.length === 0) {
    return 50;
  }

  // 计算有多少用户的分数低于当前用户
  let countBelow = 0;
  for (const score of scores) {
    if (score < totalScore) {
      countBelow++;
    } else {
      break; // 因为scores已排序，可以提前退出
    }
  }

  // 计算百分位数
  const percentile = (countBelow / scores.length) * 100;

  // 返回保留一位小数的百分位数
  return Math.round(percentile * 10) / 10;
}

/**
 * 批量计算百分位数（用于批量处理场景）
 * @param userScores - 用户分数数组
 * @returns 百分位数数组
 */
export async function calculatePercentilesInBatch(
  userScores: number[]
): Promise<number[]> {
  // 获取分数分布（只查询一次）
  const scores = await fetchAllScores();

  if (scores.length === 0) {
    return userScores.map(() => 50);
  }

  // 为每个用户分数计算百分位数
  return userScores.map((userScore) => {
    let countBelow = 0;
    for (const score of scores) {
      if (score < userScore) {
        countBelow++;
      } else {
        break;
      }
    }
    const percentile = (countBelow / scores.length) * 100;
    return Math.round(percentile * 10) / 10;
  });
}

/**
 * 清除缓存（用于测试或强制刷新）
 */
export function clearPercentileCache(): void {
  scoreDistributionCache = null;
}

/**
 * 获取缓存统计信息
 * @returns 缓存统计
 */
export function getPercentileCacheStats(): {
  isCached: boolean;
  totalUsers: number;
  cacheAge: number;
} {
  if (!scoreDistributionCache) {
    return {
      isCached: false,
      totalUsers: 0,
      cacheAge: 0,
    };
  }

  return {
    isCached: true,
    totalUsers: scoreDistributionCache.totalUsers,
    cacheAge: Date.now() - scoreDistributionCache.timestamp,
  };
}

/**
 * 获取用户在特定分数区间的排名描述
 * @param percentile - 百分位数
 * @returns 排名描述
 */
export function getScoreRanking(percentile: number): string {
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

export async function getScoreStatistics(): Promise<ScoreStatistics | null> {
  const scores = await fetchAllScores();

  if (scores.length === 0) {
    return null;
  }

  const totalUsers = scores.length;
  const minScore = scores[0];
  const maxScore = scores[scores.length - 1];

  const sum = scores.reduce((acc, s) => acc + s, 0);
  const avgScore = Math.round((sum / totalUsers) * 10) / 10;

  const mid = Math.floor(totalUsers / 2);
  const medianScore =
    totalUsers % 2 === 0
      ? Math.round(((scores[mid - 1] + scores[mid]) / 2) * 10) / 10
      : scores[mid];

  return {
    avgScore,
    medianScore,
    minScore,
    maxScore,
    totalUsers,
  };
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
      return 'text-amber-500';
    case 'A':
      return 'text-purple-500';
    case 'B':
      return 'text-blue-500';
    case 'C':
      return 'text-green-500';
    case 'D':
      return 'text-gray-500';
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
