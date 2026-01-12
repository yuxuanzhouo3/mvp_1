/**
 * Matching System Utilities - 匹配系统工具函数
 */

import type { GenderEnum } from '@/types/database';
import type { 
  UserMatchProfile, 
  CandidateFilters, 
  FactorWeights,
  AlgorithmType
} from './types';
import { ALGORITHM_WEIGHTS, MATCHING_CONFIG } from './types';
import { calculateDistance } from '@/lib/scoring';

// ========================================
// Task 2.1: 数据查询函数
// ========================================

/**
 * 从数据库响应转换为 UserMatchProfile
 * @param dbUser - 数据库用户数据
 * @returns UserMatchProfile
 */
export function transformDbUserToMatchProfile(dbUser: {
  id: string;
  gender: string | null;
  birth_date: string | null;
  age?: number | null;
  total_score?: number | null;
  market_value_score?: {
    totalScore?: number;
    scoreBreakdown?: Record<string, number>;
  } | null;
  location?: unknown;
  city_name?: string | null;
  education_level?: string | null;
  annual_income_range?: string | null;
  mbti?: string | null;
  search_preferences?: {
    search_radius_km?: number;
    age_range_min?: number;
    age_range_max?: number;
    height_range_min?: number;
    height_range_max?: number;
    education_requirement?: string;
    income_requirement?: string;
  } | null;
  verification_level?: string | null;
  last_active_at?: string | null;
  interests?: number[];
}): UserMatchProfile | null {
  if (!dbUser.gender || !dbUser.market_value_score?.totalScore) {
    return null;
  }

  const scoreBreakdown = dbUser.market_value_score?.scoreBreakdown || {};
  
  // 解析位置数据
  let location: { latitude: number; longitude: number } | null = null;
  if (dbUser.location) {
    // PostGIS geography 类型的处理
    const loc = dbUser.location as { coordinates?: [number, number] } | null;
    if (loc?.coordinates && loc.coordinates.length === 2) {
      location = {
        longitude: loc.coordinates[0],
        latitude: loc.coordinates[1]
      };
    }
  }

  return {
    id: dbUser.id,
    gender: dbUser.gender as GenderEnum,
    birthDate: dbUser.birth_date,
    age: dbUser.age || null,
    totalScore: dbUser.market_value_score.totalScore,
    scoreBreakdown: {
      wealth: scoreBreakdown.wealth || 50,
      education: scoreBreakdown.education || 50,
      age: scoreBreakdown.age || 50,
      bmi: scoreBreakdown.bmi || 50,
      appearance: scoreBreakdown.appearance || 50,
      relationshipHistory: scoreBreakdown.relationshipHistory || 50,
      personality: scoreBreakdown.personality || 50,
      jobStability: scoreBreakdown.jobStability || 50,
      location: scoreBreakdown.location || 50,
      childrenPreference: scoreBreakdown.childrenPreference || 50
    },
    location,
    cityName: dbUser.city_name || null,
    educationLevel: dbUser.education_level as UserMatchProfile['educationLevel'],
    annualIncomeRange: dbUser.annual_income_range as UserMatchProfile['annualIncomeRange'],
    mbti: dbUser.mbti as UserMatchProfile['mbti'],
    interests: dbUser.interests || [],
    searchPreferences: dbUser.search_preferences ? {
      searchRadiusKm: dbUser.search_preferences.search_radius_km || 50,
      ageRangeMin: dbUser.search_preferences.age_range_min || 18,
      ageRangeMax: dbUser.search_preferences.age_range_max || 60,
      heightRangeMin: dbUser.search_preferences.height_range_min || 140,
      heightRangeMax: dbUser.search_preferences.height_range_max || 220,
      educationRequirement: dbUser.search_preferences.education_requirement || 'any',
      incomeRequirement: dbUser.search_preferences.income_requirement || 'any'
    } : null,
    verificationLevel: dbUser.verification_level || 'none',
    lastActiveAt: dbUser.last_active_at || null
  };
}

/**
 * 构建候选人筛选SQL条件
 * @param userId - 当前用户ID
 * @param filters - 筛选条件
 * @returns SQL WHERE 子句条件数组
 */
export function buildCandidateFilterConditions(
  userId: string,
  filters: CandidateFilters
): { conditions: string[]; params: Record<string, unknown> } {
  const conditions: string[] = [];
  const params: Record<string, unknown> = { userId };

  // 排除自己
  conditions.push('id != :userId');

  // 分数范围
  if (filters.minScore !== undefined) {
    conditions.push("(market_value_score->>'totalScore')::DECIMAL >= :minScore");
    params.minScore = filters.minScore;
  }
  if (filters.maxScore !== undefined) {
    conditions.push("(market_value_score->>'totalScore')::DECIMAL <= :maxScore");
    params.maxScore = filters.maxScore;
  }

  // 年龄范围
  if (filters.minAge !== undefined) {
    conditions.push("EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))::INTEGER >= :minAge");
    params.minAge = filters.minAge;
  }
  if (filters.maxAge !== undefined) {
    conditions.push("EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))::INTEGER <= :maxAge");
    params.maxAge = filters.maxAge;
  }

  return { conditions, params };
}

// ========================================
// Task 2.2: 评分计算函数
// ========================================

/**
 * 计算10项因子的相似度
 * @param userA - 用户A
 * @param userB - 用户B
 * @returns 因子相似度分数 (0-100)
 */
export function calculateFactorSimilarity(
  userA: UserMatchProfile,
  userB: UserMatchProfile
): { 
  overallSimilarity: number;
  factorComparison: Record<string, { user: number; target: number; matchDegree: number }>;
} {
  const factors = [
    'wealth', 'education', 'age', 'bmi', 'appearance',
    'relationshipHistory', 'personality', 'jobStability',
    'location', 'childrenPreference'
  ] as const;

  const factorComparison: Record<string, { user: number; target: number; matchDegree: number }> = {};
  let totalSimilarity = 0;

  for (const factor of factors) {
    const scoreA = userA.scoreBreakdown[factor];
    const scoreB = userB.scoreBreakdown[factor];
    
    // 相似度 = 100 - |分数差|，限制在 [0, 100]
    const matchDegree = Math.max(0, Math.min(100, 100 - Math.abs(scoreA - scoreB)));
    
    factorComparison[factor] = {
      user: scoreA,
      target: scoreB,
      matchDegree
    };
    
    totalSimilarity += matchDegree;
  }

  return {
    overallSimilarity: Math.round(totalSimilarity / factors.length * 10) / 10,
    factorComparison
  };
}

/**
 * 计算地理距离
 * @param locationA - 位置A
 * @param locationB - 位置B
 * @returns 距离（公里），如果无法计算返回 null
 */
export function calculateGeographicDistance(
  locationA: { latitude: number; longitude: number } | null,
  locationB: { latitude: number; longitude: number } | null
): number | null {
  if (!locationA || !locationB) {
    return null;
  }

  return calculateDistance(locationA, locationB);
}

/**
 * 计算兴趣重合度
 * @param interestsA - 用户A的兴趣ID列表
 * @param interestsB - 用户B的兴趣ID列表
 * @returns 兴趣重合信息
 */
export function calculateInterestOverlap(
  interestsA: number[],
  interestsB: number[]
): { 
  overlapCount: number; 
  overlapPercentage: number; 
  mutualInterests: number[];
} {
  if (interestsA.length === 0 || interestsB.length === 0) {
    return { overlapCount: 0, overlapPercentage: 0, mutualInterests: [] };
  }

  const setA = new Set(interestsA);
  const mutualInterests = interestsB.filter(id => setA.has(id));
  const overlapCount = mutualInterests.length;
  
  // 使用较小集合的大小作为分母
  const minSize = Math.min(interestsA.length, interestsB.length);
  const overlapPercentage = Math.round((overlapCount / minSize) * 100);

  return { overlapCount, overlapPercentage, mutualInterests };
}

// ========================================
// Task 2.3: 权重配置函数
// ========================================

/**
 * 获取不同算法的权重配置
 * @param algorithm - 算法类型
 * @param evaluatorGender - 评估者性别
 * @param targetGender - 被评估者性别
 * @returns 权重配置
 */
export function getAlgorithmWeights(
  algorithm: AlgorithmType,
  evaluatorGender: GenderEnum,
  targetGender: GenderEnum
): FactorWeights {
  const weights = ALGORITHM_WEIGHTS[algorithm];
  
  if (evaluatorGender === 'male' && targetGender === 'female') {
    return weights.maleEvaluatingFemale;
  }
  
  if (evaluatorGender === 'female' && targetGender === 'male') {
    return weights.femaleEvaluatingMale;
  }
  
  // 同性或其他情况，使用均衡权重
  return {
    wealth: 0.10,
    education: 0.10,
    age: 0.10,
    bmi: 0.10,
    appearance: 0.10,
    relationshipHistory: 0.10,
    personality: 0.10,
    jobStability: 0.10,
    location: 0.10,
    childrenPreference: 0.10
  };
}

/**
 * 计算加权吸引力分数
 * 根据权重计算一个用户对另一个用户的吸引力
 * @param target - 目标用户
 * @param weights - 权重配置
 * @returns 加权吸引力分数 (0-100)
 */
export function calculateWeightedAttractiveness(
  target: UserMatchProfile,
  weights: FactorWeights
): number {
  const breakdown = target.scoreBreakdown;
  
  const score = 
    breakdown.wealth * weights.wealth +
    breakdown.education * weights.education +
    breakdown.age * weights.age +
    breakdown.bmi * weights.bmi +
    breakdown.appearance * weights.appearance +
    breakdown.relationshipHistory * weights.relationshipHistory +
    breakdown.personality * weights.personality +
    breakdown.jobStability * weights.jobStability +
    breakdown.location * weights.location +
    breakdown.childrenPreference * weights.childrenPreference;

  return Math.round(score * 10) / 10;
}

// ========================================
// 辅助工具函数
// ========================================

/**
 * Fisher-Yates 洗牌算法
 * @param array - 要打乱的数组
 * @returns 打乱后的新数组
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 生成随机分数（正态分布近似）
 * @param base - 基础分数
 * @param variance - 方差范围
 * @returns 随机分数
 */
export function generateRandomScore(base: number, variance: number = 20): number {
  // Box-Muller 变换生成正态分布随机数
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  // 缩放到 [-variance, +variance] 范围
  const randomOffset = z * (variance / 2);
  
  // 计算最终分数并限制范围
  const score = base + randomOffset;
  return Math.max(
    MATCHING_CONFIG.MIN_MATCH_SCORE, 
    Math.min(MATCHING_CONFIG.MAX_MATCH_SCORE, score)
  );
}

/**
 * 计算几何平均值
 * @param values - 数值数组
 * @returns 几何平均值
 */
export function geometricMean(...values: number[]): number {
  if (values.length === 0) return 0;
  if (values.some(v => v <= 0)) {
    // 如果有非正数，返回算术平均
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  const product = values.reduce((a, b) => a * b, 1);
  return Math.pow(product, 1 / values.length);
}

/**
 * 限制分数在有效范围内
 * @param score - 原始分数
 * @returns 限制后的分数
 */
export function clampScore(score: number): number {
  return Math.max(
    MATCHING_CONFIG.MIN_MATCH_SCORE,
    Math.min(MATCHING_CONFIG.MAX_MATCH_SCORE, Math.round(score * 10) / 10)
  );
}

/**
 * 计算推荐过期时间
 * @returns 过期时间字符串
 */
export function calculateExpiresAt(): string {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + MATCHING_CONFIG.RECOMMENDATION_EXPIRY_DAYS);
  return expiresAt.toISOString();
}

/**
 * 判断用户是否活跃
 * @param lastActiveAt - 最后活跃时间
 * @returns 是否活跃
 */
export function isActiveUser(lastActiveAt: string | null): boolean {
  if (!lastActiveAt) return true; // 如果没有记录，默认活跃
  
  const lastActive = new Date(lastActiveAt);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MATCHING_CONFIG.ACTIVE_USER_DAYS);
  
  return lastActive >= cutoff;
}

/**
 * 根据算法类型获取候选人分数范围
 * @param userScore - 用户分数
 * @param algorithm - 算法类型
 * @returns 分数范围 { min, max }
 */
export function getCandidateScoreRange(
  userScore: number,
  algorithm: AlgorithmType
): { min: number; max: number } {
  const ranges = MATCHING_CONFIG.SCORE_RANGES;
  
  switch (algorithm) {
    case 'compatible':
      // 门当户对: ±10分
      return {
        min: Math.max(0, userScore + ranges.compatible.minDiff),
        max: Math.min(100, userScore + ranges.compatible.maxDiff)
      };
      
    case 'romantic':
      // 慕强择优: -30% ~ +30%
      return {
        min: Math.max(0, userScore * ranges.romantic.minRatio),
        max: Math.min(100, userScore * ranges.romantic.maxRatio)
      };
      
    case 'serendipity':
      // 随机盲盒: ±40分
      return {
        min: Math.max(0, userScore + ranges.serendipity.minDiff),
        max: Math.min(100, userScore + ranges.serendipity.maxDiff)
      };
      
    case 'pragmatic':
      // 务实捡漏: -20 ~ +5分
      return {
        min: Math.max(0, userScore + ranges.pragmatic.minDiff),
        max: Math.min(100, userScore + ranges.pragmatic.maxDiff)
      };
      
    default:
      return { min: 0, max: 100 };
  }
}

