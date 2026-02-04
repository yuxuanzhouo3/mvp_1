/**
 * Matching Algorithms - 四个匹配算法实现
 * 基于PRD v2.0
 */

import type { 
  UserMatchProfile, 
  MatchResult, 
  AlgorithmType,
  BatchMatchResult,
  AlgorithmWeightsMap
} from './types';
import { MATCHING_CONFIG } from './types';
import {
  calculateFactorSimilarity,
  calculateGeographicDistance,
  calculateInterestOverlap,
  getAlgorithmWeights,
  calculateWeightedAttractiveness,
  shuffleArray,
  generateRandomScore,
  geometricMean,
  clampScore,
  calculateExpiresAt,
  getCandidateScoreRange
} from './utils';
import { DEFAULT_RANGE_EXPANSION_STEP_TICKS, expandRange } from './score-range';
import { calculateMBTICompatibility } from '@/lib/mbti-compatibility';

// ========================================
// 算法1: 金玉良缘（门当户对）
// 核心思想：寻找条件相近的人，减少阶级差异带来的矛盾
// ========================================

/**
 * 算法1: 金玉良缘（门当户对）匹配
 * @param user - 当前用户
 * @param candidates - 候选人列表
 * @param limit - 返回数量限制
 * @returns 匹配结果列表
 */
export function matchCompatible(
  user: UserMatchProfile,
  candidates: UserMatchProfile[],
  limit: number = MATCHING_CONFIG.DEFAULT_RECOMMENDATION_COUNT,
  weightsMap?: AlgorithmWeightsMap
): MatchResult[] {
  const userScore = user.totalScore;
  const scoreRange = getCandidateScoreRange(userScore, 'compatible');
  
  const results: MatchResult[] = [];
  
  for (const candidate of candidates) {
    // 筛选分数范围内的候选人
    if (candidate.totalScore < scoreRange.min || candidate.totalScore > scoreRange.max) {
      continue;
    }
    
    // 计算总分相似度
    const scoreDiff = Math.abs(userScore - candidate.totalScore);
    const totalScoreSimilarity = Math.max(0, 100 - scoreDiff);
    
    // 计算因子相似度
    const weights = getAlgorithmWeights('compatible', user.gender, candidate.gender, weightsMap);
    const { overallSimilarity: factorSimilarity, factorComparison } = 
      calculateFactorSimilarity(user, candidate, weights);
    
    // 计算兴趣重合度
    const interestOverlap = calculateInterestOverlap(user.interests, candidate.interests);
    
    // 计算距离
    const distance = calculateGeographicDistance(user.location, candidate.location);
    
    // 最终分数 = 总分相似度 × 0.4 + 因子相似度 × 0.6
    const matchScore = clampScore(
      totalScoreSimilarity * 0.4 + factorSimilarity * 0.6
    );
    
    results.push({
      targetUserId: candidate.id,
      matchScore,
      algorithmType: 'compatible',
      scoreDetails: {
        userBaseScore: userScore,
        targetBaseScore: candidate.totalScore,
        similarityScore: totalScoreSimilarity,
        factorComparison,
        mutualInterests: interestOverlap.mutualInterests,
        distance: distance ?? undefined,
        message: `你们的条件相近，匹配度${matchScore}%`
      }
    });
  }
  
  // 按匹配分排序，返回Top N
  return results
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

// ========================================
// 算法2: 勇敢追爱（慕强择优）
// 核心思想：在自己分数±30%范围内，优先推荐更优秀的对象
// ========================================

/**
 * 算法2: 勇敢追爱（慕强择优）匹配
 * @param user - 当前用户
 * @param candidates - 候选人列表
 * @param limit - 返回数量限制
 * @returns 匹配结果列表
 */
export function matchRomanticPursuit(
  user: UserMatchProfile,
  candidates: UserMatchProfile[],
  limit: number = MATCHING_CONFIG.DEFAULT_RECOMMENDATION_COUNT,
  weightsMap?: AlgorithmWeightsMap
): MatchResult[] {
  const userScore = user.totalScore;
  const scoreRange = getCandidateScoreRange(userScore, 'romantic');
  
  const results: MatchResult[] = [];
  
  for (const candidate of candidates) {
    // 筛选分数范围内的候选人
    if (candidate.totalScore < scoreRange.min || candidate.totalScore > scoreRange.max) {
      continue;
    }
    
    const candidateScore = candidate.totalScore;
    
    // A对B的兴趣度（B越优秀，兴趣越高）
    let interestAToB: number;
    if (candidateScore >= userScore) {
      // B比A优秀，满分
      interestAToB = 100;
    } else {
      // B不如A，根据差距降低兴趣度
      // 差距越大兴趣越低: 50 + (B/A) × 50
      // 如果B是A的70%，则兴趣度 = 50 + 0.7 × 50 = 85%
      // 如果B是A的50%，则兴趣度 = 50 + 0.5 × 50 = 75%
      interestAToB = 50 + (candidateScore / userScore) * 50;
    }
    
    // B接受A的可能性（双向评估）
    const acceptanceBToA = calculateAcceptance(user, candidate, weightsMap);
    
    const personalityCompatibility = calculateMBTICompatibility(user.mbti, candidate.mbti);
    const matchScore = clampScore(
      geometricMean(interestAToB, acceptanceBToA) * 0.9 + personalityCompatibility * 0.1
    );
    
    // 计算向上追求分
    const aspirationScore = candidateScore > userScore ? 100 : 80;
    
    // 计算兴趣重合度
    const interestOverlap = calculateInterestOverlap(user.interests, candidate.interests);
    
    // 计算距离
    const distance = calculateGeographicDistance(user.location, candidate.location);
    
    results.push({
      targetUserId: candidate.id,
      matchScore,
      algorithmType: 'romantic',
      scoreDetails: {
        userBaseScore: userScore,
        targetBaseScore: candidateScore,
        interestAToB,
        acceptanceBToA,
        aspirationScore,
        personalityCompatibility,
        mutualInterests: interestOverlap.mutualInterests,
        distance: distance ?? undefined,
        message: candidateScore > userScore 
          ? `TA比你优秀${Math.round(candidateScore - userScore)}分，冲！`
          : `你们条件相当，成功率${Math.round(acceptanceBToA)}%`
      }
    });
  }
  
  // 按匹配分排序，优先推荐分数高且接受度高的
  return results
    .sort((a, b) => {
      // 首先按匹配分排序
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      // 同分时，优先推荐更优秀的
      return (b.scoreDetails.targetBaseScore || 0) - (a.scoreDetails.targetBaseScore || 0);
    })
    .slice(0, limit);
}

/**
 * 计算B接受A的可能性
 * @param userA - 用户A
 * @param userB - 用户B
 * @returns 接受度 (0-100)
 */
function calculateAcceptance(
  userA: UserMatchProfile,
  userB: UserMatchProfile,
  weightsMap?: AlgorithmWeightsMap
): number {
  // B的择偶标准（基于性别差异权重）
  const weights = getAlgorithmWeights('romantic', userB.gender, userA.gender, weightsMap);

  // A在B眼中的吸引力分数
  const attractiveness = calculateWeightedAttractiveness(userA, weights);

  // B的期望值（自身分数）
  const bScore = userB.totalScore;

  // 计算接受度（连续渐进公式）
  // 比率 = A的吸引力 / B的期望
  // 比率 >= 1.0 时接受度 95%
  // 比率 = 0.8 时接受度 80%
  // 比率 = 0.6 时接受度 60%
  // 比率 <= 0.4 时接受度 40%
  const ratio = attractiveness / (bScore || 1);

  if (ratio >= 1.0) {
    return 95;
  }

  // 线性插值: acceptance = 40 + ratio * 55 (ratio在0.4-1.0之间时从40到95)
  // 简化为: acceptance = 40 + min(ratio, 1) * 55
  const acceptance = 40 + Math.min(ratio, 1) * 55;
  return Math.round(Math.max(40, Math.min(95, acceptance)));
}

// ========================================
// 算法3: 心动盲盒（有限随机）
// 核心思想：在合理范围内随机推荐，模拟"一见钟情"的不确定性
// ========================================

/**
 * 算法3: 心动盲盒（有限随机）匹配
 * @param user - 当前用户
 * @param candidates - 候选人列表
 * @param limit - 返回数量限制
 * @returns 匹配结果列表
 */
export function matchSerendipity(
  user: UserMatchProfile,
  candidates: UserMatchProfile[],
  limit: number = MATCHING_CONFIG.DEFAULT_RECOMMENDATION_COUNT,
  weightsMap?: AlgorithmWeightsMap
): MatchResult[] {
  const userScore = user.totalScore;
  const scoreRange = getCandidateScoreRange(userScore, 'serendipity');
  
  // 筛选候选人池
  const eligibleCandidates = candidates.filter(
    c => c.totalScore >= scoreRange.min && c.totalScore <= scoreRange.max
  );
  
  // 使用 Fisher-Yates 算法随机打乱候选人顺序
  const shuffledCandidates = shuffleArray(eligibleCandidates);
  
  const results: MatchResult[] = [];
  
  for (const candidate of shuffledCandidates) {
    const weights = getAlgorithmWeights('serendipity', user.gender, candidate.gender, weightsMap);
    const { overallSimilarity: factorSimilarity } = calculateFactorSimilarity(user, candidate, weights);

    // 计算基础兼容度
    const scoreSimilarity = 100 - Math.abs(userScore - candidate.totalScore);
    const baseCompatibility = scoreSimilarity * 0.6 + factorSimilarity * 0.4;
    const personalityCompatibility = calculateMBTICompatibility(user.mbti, candidate.mbti);
    
    // 生成随机匹配分
    const randomFactor = generateRandomScore(0, 40) - 20; // -20 到 +20
    const matchScore = clampScore(baseCompatibility * 0.85 + personalityCompatibility * 0.15 + randomFactor);
    
    // 计算兴趣重合度
    const interestOverlap = calculateInterestOverlap(user.interests, candidate.interests);
    
    // 计算距离
    const distance = calculateGeographicDistance(user.location, candidate.location);
    
    results.push({
      targetUserId: candidate.id,
      matchScore,
      algorithmType: 'serendipity',
      scoreDetails: {
        userBaseScore: userScore,
        targetBaseScore: candidate.totalScore,
        randomFactor: Math.round(randomFactor * 10) / 10,
        personalityCompatibility,
        mutualInterests: interestOverlap.mutualInterests,
        distance: distance ?? undefined,
        message: '缘分就是这么奇妙 ✨'
      }
    });
    
    if (results.length >= limit) {
      break;
    }
  }
  
  return results;
}

// ========================================
// 算法4: 稳稳幸福（务实捡漏）
// 核心思想：优先推荐比自己低10-20分的对象，成功率更高
// 但也包含相近的对象，扩大可选范围
// ========================================

/**
 * 算法4: 稳稳幸福（务实捡漏）匹配
 * @param user - 当前用户
 * @param candidates - 候选人列表
 * @param limit - 返回数量限制
 * @returns 匹配结果列表
 */
export function matchPragmatic(
  user: UserMatchProfile,
  candidates: UserMatchProfile[],
  limit: number = MATCHING_CONFIG.DEFAULT_RECOMMENDATION_COUNT,
  weightsMap?: AlgorithmWeightsMap
): MatchResult[] {
  const userScore = user.totalScore;
  const baseRange = getCandidateScoreRange(userScore, 'pragmatic');

  let currentRange = { ...baseRange };
  let eligibleCandidates = candidates.filter(
    c => c.totalScore >= currentRange.min && c.totalScore <= currentRange.max
  );

  while (eligibleCandidates.length < limit && currentRange.min > 0) {
    currentRange = expandRange(
      currentRange,
      DEFAULT_RANGE_EXPANSION_STEP_TICKS,
      'down'
    );
    eligibleCandidates = candidates.filter(
      c => c.totalScore >= currentRange.min && c.totalScore <= currentRange.max
    );
  }

  const results: MatchResult[] = [];

  for (const candidate of eligibleCandidates) {
    const candidateScore = candidate.totalScore;
    const scoreDiff = userScore - candidateScore; // ?????????????
    const weights = getAlgorithmWeights('pragmatic', user.gender, candidate.gender, weightsMap);
    const { overallSimilarity: factorSimilarity } = calculateFactorSimilarity(user, candidate, weights);

    // ???????????
    let successRate: number;
    if (scoreDiff >= 0) {
      successRate = Math.min(100, 70 + scoreDiff * 1.5);
    } else {
      successRate = Math.max(50, 70 + scoreDiff * 1.5);
    }

    // B?A?????????????
    let acceptanceBToA: number;
    if (scoreDiff >= 10) {
      acceptanceBToA = 95;
    } else if (scoreDiff >= 0) {
      acceptanceBToA = 85 + scoreDiff;
    } else {
      acceptanceBToA = Math.max(50, 80 + scoreDiff * 2);
    }

    const personalityCompatibility = calculateMBTICompatibility(user.mbti, candidate.mbti);
    const matchScore = clampScore((successRate + acceptanceBToA) / 2 * 0.75 + factorSimilarity * 0.15 + personalityCompatibility * 0.1);

    // ???????
    const interestOverlap = calculateInterestOverlap(user.interests, candidate.interests);

    // ????
    const distance = calculateGeographicDistance(user.location, candidate.location);

    results.push({
      targetUserId: candidate.id,
      matchScore,
      algorithmType: 'pragmatic',
      scoreDetails: {
        userBaseScore: userScore,
        targetBaseScore: candidateScore,
        successRate: Math.round(successRate),
        acceptanceBToA: Math.round(acceptanceBToA),
        personalityCompatibility,
        mutualInterests: interestOverlap.mutualInterests,
        distance: distance ?? undefined,
        message: scoreDiff >= 10
          ? `????${Math.round(successRate)}%??????`
          : scoreDiff >= 0
          ? `????${Math.round(successRate)}%?????`
          : `TA????????${Math.round(successRate)}%`
      }
    });
  }

  // ????????? <= ?????????
  return results
    .sort((a, b) => {
      const aScore = a.scoreDetails.targetBaseScore || 0;
      const bScore = b.scoreDetails.targetBaseScore || 0;
      const aAbove = aScore > userScore ? 1 : 0;
      const bAbove = bScore > userScore ? 1 : 0;
      if (aAbove !== bAbove) return aAbove - bAbove;

      const diffA = Math.abs(userScore - aScore);
      const diffB = Math.abs(userScore - bScore);
      if (diffA !== diffB) return diffA - diffB;

      const aSuccess = a.scoreDetails.successRate || 0;
      const bSuccess = b.scoreDetails.successRate || 0;
      if (bSuccess !== aSuccess) return bSuccess - aSuccess;

      return b.matchScore - a.matchScore;
    })
    .slice(0, limit);
}

// ========================================
// 统一算法调度器
// ========================================

/**
 * 根据算法类型执行匹配
 * @param algorithm - 算法类型
 * @param user - 当前用户
 * @param candidates - 候选人列表
 * @param limit - 返回数量限制
 * @returns 匹配结果列表
 */
export function executeMatchingAlgorithm(
  algorithm: AlgorithmType,
  user: UserMatchProfile,
  candidates: UserMatchProfile[],
  limit: number = MATCHING_CONFIG.DEFAULT_RECOMMENDATION_COUNT,
  weightsMap?: AlgorithmWeightsMap
): MatchResult[] {
  switch (algorithm) {
    case 'compatible':
      return matchCompatible(user, candidates, limit, weightsMap);
    case 'romantic':
      return matchRomanticPursuit(user, candidates, limit, weightsMap);
    case 'serendipity':
      return matchSerendipity(user, candidates, limit, weightsMap);
    case 'pragmatic':
      return matchPragmatic(user, candidates, limit, weightsMap);
    default:
      // 默认使用门当户对算法
      return matchCompatible(user, candidates, limit, weightsMap);
  }
}

/**
 * 生成每日推荐
 * Task 7: 统一调度接口
 * @param user - 当前用户
 * @param candidates - 候选人列表（已筛选未互动过的）
 * @param preferredAlgorithm - 用户偏好的算法
 * @param options - 可选配置
 * @returns 批量匹配结果
 */
export function generateDailyRecommendations(
  user: UserMatchProfile,
  candidates: UserMatchProfile[],
  preferredAlgorithm: AlgorithmType = 'compatible',
  options: {
    limit?: number;
    mixAlgorithms?: boolean;
    mixRatio?: { primary: number; secondary: number };
    weightsMap?: AlgorithmWeightsMap;
  } = {}
): BatchMatchResult {
  const {
    limit = MATCHING_CONFIG.DEFAULT_RECOMMENDATION_COUNT,
    mixAlgorithms = false,
    mixRatio = { primary: 0.7, secondary: 0.3 },
    weightsMap
  } = options;
  
  let matches: MatchResult[];
  
  if (mixAlgorithms) {
    // 混合推荐模式
    const primaryCount = Math.ceil(limit * mixRatio.primary);
    const secondaryCount = limit - primaryCount;
    
    // 主算法结果
    const primaryMatches = executeMatchingAlgorithm(
      preferredAlgorithm, 
      user, 
      candidates, 
      primaryCount,
      weightsMap
    );
    
    // 副算法（使用随机盲盒增加惊喜）
    const secondaryAlgorithm: AlgorithmType = 'serendipity';
    
    // 排除已在主结果中的用户
    const primaryUserIds = new Set(primaryMatches.map(m => m.targetUserId));
    const remainingCandidates = candidates.filter(c => !primaryUserIds.has(c.id));
    
    const secondaryMatches = executeMatchingAlgorithm(
      secondaryAlgorithm,
      user,
      remainingCandidates,
      secondaryCount,
      weightsMap
    );
    
    matches = [...primaryMatches, ...secondaryMatches];
  } else {
    // 单一算法模式
    matches = executeMatchingAlgorithm(preferredAlgorithm, user, candidates, limit, weightsMap);
  }
  
  // 去重处理
  const uniqueMatches = removeDuplicateMatches(matches);
  
  return {
    userId: user.id,
    algorithmType: preferredAlgorithm,
    matches: uniqueMatches,
    generatedAt: new Date().toISOString(),
    expiresAt: calculateExpiresAt()
  };
}

/**
 * 去除重复的匹配结果
 * @param matches - 匹配结果列表
 * @returns 去重后的列表
 */
function removeDuplicateMatches(matches: MatchResult[]): MatchResult[] {
  const seen = new Set<string>();
  return matches.filter(match => {
    if (seen.has(match.targetUserId)) {
      return false;
    }
    seen.add(match.targetUserId);
    return true;
  });
}

