/**
 * Dynamic Matching Service - 动态匹配服务
 * 基于用户规模感知的智能匹配策略
 */

import type { UserMatchProfile, MatchResult, AlgorithmType } from './types';
import { MATCHING_CONFIG } from './types';
import { 
  MatchingStrategy,
  DYNAMIC_MATCHING_CONFIG,
  getRecommendedStrategy,
  getScoreRangeByStrategy,
  getUserScaleDescription,
  isStrategyApplicable,
} from '@/lib/config/matching-config';
import { 
  executeMatchingAlgorithm,
  matchCompatible,
  matchRomanticPursuit,
  matchSerendipity,
  matchPragmatic,
} from './algorithms';

// ========================================
// 类型定义
// ========================================

/**
 * 动态匹配配置
 */
export interface DynamicMatchingOptions {
  /** 用户算法偏好 */
  preferredAlgorithm?: AlgorithmType;
  /** 强制使用特定策略（覆盖动态选择） */
  forceStrategy?: MatchingStrategy;
  /** 最小结果数量 */
  minResults?: number;
  /** 最大结果数量 */
  maxResults?: number;
  /** 是否允许自动扩大范围 */
  allowAutoExpansion?: boolean;
}

/**
 * 动态匹配结果
 */
export interface DynamicMatchResult {
  matches: MatchResult[];
  strategyUsed: MatchingStrategy;
  userScale: string;
  scoreRange: { min: number; max: number };
  expansionLevel: number;
  metadata: {
    totalCandidates: number;
    filteredCandidates: number;
    processingTimeMs: number;
    algorithmType: AlgorithmType;
  };
}

/**
 * 用户规模统计
 */
export interface UserScaleStats {
  totalUsers: number;
  activeUsers: number;
  lastUpdated: string;
}

// ========================================
// 用户规模缓存
// ========================================

let userScaleCache: UserScaleStats | null = null;
let lastCacheUpdate: number = 0;

/**
 * 设置用户规模统计（用于外部更新）
 * @param stats - 用户规模统计
 */
export function setUserScaleStats(stats: UserScaleStats): void {
  userScaleCache = stats;
  lastCacheUpdate = Date.now();
}

/**
 * 获取用户规模统计
 * @returns 用户规模统计（可能为null）
 */
export function getUserScaleStats(): UserScaleStats | null {
  // 检查缓存是否过期
  if (userScaleCache && Date.now() - lastCacheUpdate < DYNAMIC_MATCHING_CONFIG.USER_COUNT_CACHE_TTL) {
    return userScaleCache;
  }
  return null;
}

/**
 * 获取当前用户数量（用于策略选择）
 * @param fallback - 当缓存不可用时的默认值
 * @returns 用户数量
 */
export function getCurrentUserCount(fallback: number = 5000): number {
  const stats = getUserScaleStats();
  return stats?.activeUsers ?? stats?.totalUsers ?? fallback;
}

// ========================================
// 核心函数
// ========================================

/**
 * 动态筛选候选人
 * 根据用户规模和策略动态调整筛选范围
 * @param user - 当前用户
 * @param candidates - 候选人列表
 * @param strategy - 匹配策略
 * @returns 筛选后的候选人
 */
export function filterCandidatesByStrategy(
  user: UserMatchProfile,
  candidates: UserMatchProfile[],
  strategy: MatchingStrategy
): { filtered: UserMatchProfile[]; scoreRange: { min: number; max: number } } {
  const scoreRange = getScoreRangeByStrategy(user.totalScore, strategy);
  
  const filtered = candidates.filter(candidate => 
    candidate.totalScore >= scoreRange.min &&
    candidate.totalScore <= scoreRange.max
  );

  return { filtered, scoreRange };
}

/**
 * 自动扩大匹配范围
 * 当结果数量不足时逐步扩大范围
 * @param user - 当前用户
 * @param candidates - 候选人列表
 * @param currentRange - 当前分数范围
 * @param minResults - 最小结果数量
 * @returns 扩大后的结果
 */
export function expandMatchingRange(
  user: UserMatchProfile,
  candidates: UserMatchProfile[],
  currentRange: { min: number; max: number },
  minResults: number
): { filtered: UserMatchProfile[]; scoreRange: { min: number; max: number }; expansionLevel: number } {
  let { min, max } = currentRange;
  let filtered = candidates.filter(c => c.totalScore >= min && c.totalScore <= max);
  let expansionLevel = 0;

  while (
    filtered.length < minResults &&
    expansionLevel < DYNAMIC_MATCHING_CONFIG.MAX_EXPANSION_ITERATIONS
  ) {
    // 扩大范围
    const expansion = user.totalScore * DYNAMIC_MATCHING_CONFIG.RANGE_EXPANSION_STEP;
    min = Math.max(0, min - expansion);
    max = Math.min(100, max + expansion);
    
    filtered = candidates.filter(c => c.totalScore >= min && c.totalScore <= max);
    expansionLevel++;
  }

  return {
    filtered,
    scoreRange: { min, max },
    expansionLevel,
  };
}

/**
 * 执行动态匹配
 * 智能选择匹配策略并执行匹配算法
 * @param user - 当前用户
 * @param candidates - 候选人列表
 * @param options - 配置选项
 * @returns 动态匹配结果
 */
export function executeDynamicMatching(
  user: UserMatchProfile,
  candidates: UserMatchProfile[],
  options: DynamicMatchingOptions = {}
): DynamicMatchResult {
  const startTime = Date.now();
  
  const {
    preferredAlgorithm = 'compatible',
    forceStrategy,
    minResults = DYNAMIC_MATCHING_CONFIG.MIN_RESULTS_THRESHOLD,
    maxResults = MATCHING_CONFIG.DEFAULT_RECOMMENDATION_COUNT,
    allowAutoExpansion = true,
  } = options;

  // 获取当前用户规模
  const userCount = getCurrentUserCount();
  const userScale = getUserScaleDescription(userCount);

  // 确定使用的匹配策略
  let strategy: MatchingStrategy;
  if (forceStrategy && isStrategyApplicable(forceStrategy, userCount)) {
    strategy = forceStrategy;
  } else {
    strategy = getRecommendedStrategy(userCount);
  }

  // 根据策略筛选候选人
  let { filtered, scoreRange } = filterCandidatesByStrategy(user, candidates, strategy);
  let expansionLevel = 0;

  // 如果结果太少且允许扩大范围
  if (allowAutoExpansion && filtered.length < minResults) {
    const expanded = expandMatchingRange(user, candidates, scoreRange, minResults);
    filtered = expanded.filtered;
    scoreRange = expanded.scoreRange;
    expansionLevel = expanded.expansionLevel;
  }

  // 执行匹配算法
  const matches = executeMatchingAlgorithm(
    preferredAlgorithm,
    user,
    filtered,
    maxResults
  );

  const processingTimeMs = Date.now() - startTime;

  return {
    matches,
    strategyUsed: strategy,
    userScale,
    scoreRange,
    expansionLevel,
    metadata: {
      totalCandidates: candidates.length,
      filteredCandidates: filtered.length,
      processingTimeMs,
      algorithmType: preferredAlgorithm,
    },
  };
}

/**
 * 获取分数范围内的候选人（用于数据库查询）
 * 根据动态策略返回分数范围
 * @param userScore - 用户分数
 * @param userCount - 用户数量（可选）
 * @returns 分数范围
 */
export function getDynamicScoreRange(
  userScore: number,
  userCount?: number
): { min: number; max: number; strategy: MatchingStrategy } {
  const count = userCount ?? getCurrentUserCount();
  const strategy = getRecommendedStrategy(count);
  const scoreRange = getScoreRangeByStrategy(userScore, strategy);
  
  return {
    ...scoreRange,
    strategy,
  };
}

/**
 * 根据不同策略混合匹配结果
 * 适用于需要多样化推荐的场景
 * @param user - 当前用户
 * @param candidates - 候选人列表
 * @param options - 配置选项
 * @returns 混合匹配结果
 */
export function executeMixedStrategyMatching(
  user: UserMatchProfile,
  candidates: UserMatchProfile[],
  options: {
    strategies?: MatchingStrategy[];
    algorithmMix?: { algorithm: AlgorithmType; weight: number }[];
    totalResults?: number;
  } = {}
): DynamicMatchResult {
  const startTime = Date.now();
  
  const {
    strategies = [MatchingStrategy.FLEXIBLE_FLOAT, MatchingStrategy.UPWARD_FLOAT],
    algorithmMix = [
      { algorithm: 'compatible' as AlgorithmType, weight: 0.4 },
      { algorithm: 'romantic' as AlgorithmType, weight: 0.3 },
      { algorithm: 'serendipity' as AlgorithmType, weight: 0.2 },
      { algorithm: 'pragmatic' as AlgorithmType, weight: 0.1 },
    ],
    totalResults = MATCHING_CONFIG.DEFAULT_RECOMMENDATION_COUNT,
  } = options;

  const userCount = getCurrentUserCount();
  const userScale = getUserScaleDescription(userCount);
  const allMatches: MatchResult[] = [];
  const usedTargetIds = new Set<string>();

  // 合并所有策略的分数范围
  let minScore = 100;
  let maxScore = 0;
  
  for (const strategy of strategies) {
    const range = getScoreRangeByStrategy(user.totalScore, strategy);
    minScore = Math.min(minScore, range.min);
    maxScore = Math.max(maxScore, range.max);
  }

  const scoreRange = { min: minScore, max: maxScore };
  
  // 筛选候选人
  const filtered = candidates.filter(c => 
    c.totalScore >= scoreRange.min && 
    c.totalScore <= scoreRange.max
  );

  // 按算法权重分配结果数量
  for (const { algorithm, weight } of algorithmMix) {
    const count = Math.ceil(totalResults * weight);
    const remainingCandidates = filtered.filter(c => !usedTargetIds.has(c.id));
    
    const matches = executeMatchingAlgorithm(
      algorithm,
      user,
      remainingCandidates,
      count
    );

    for (const match of matches) {
      if (!usedTargetIds.has(match.targetUserId)) {
        allMatches.push(match);
        usedTargetIds.add(match.targetUserId);
      }
    }

    if (allMatches.length >= totalResults) {
      break;
    }
  }

  // 按匹配分排序并取前N个
  const finalMatches = allMatches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, totalResults);

  const processingTimeMs = Date.now() - startTime;

  return {
    matches: finalMatches,
    strategyUsed: MatchingStrategy.SMART_MIX,
    userScale,
    scoreRange,
    expansionLevel: 0,
    metadata: {
      totalCandidates: candidates.length,
      filteredCandidates: filtered.length,
      processingTimeMs,
      algorithmType: 'compatible', // 主算法标记
    },
  };
}

// ========================================
// 数据库辅助函数
// ========================================

/**
 * 生成动态筛选SQL条件
 * 用于Supabase/Cloudbase查询
 * @param userScore - 用户分数
 * @param userCount - 用户数量
 * @returns SQL条件参数
 */
export function generateDynamicFilterParams(
  userScore: number,
  userCount?: number
): { minScore: number; maxScore: number; strategy: string } {
  const { min, max, strategy } = getDynamicScoreRange(userScore, userCount);
  
  return {
    minScore: Math.round(min * 10) / 10,
    maxScore: Math.round(max * 10) / 10,
    strategy,
  };
}

/**
 * 验证候选人是否在动态范围内
 * @param userScore - 用户分数
 * @param candidateScore - 候选人分数
 * @param userCount - 用户数量
 * @returns 是否在范围内
 */
export function isInDynamicRange(
  userScore: number,
  candidateScore: number,
  userCount?: number
): boolean {
  const { min, max } = getDynamicScoreRange(userScore, userCount);
  return candidateScore >= min && candidateScore <= max;
}

