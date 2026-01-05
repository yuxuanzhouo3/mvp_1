/**
 * Matching Algorithms - 四个匹配算法实现
 * 基于PRD v2.0
 */

import type { 
  UserMatchProfile, 
  MatchResult, 
  AlgorithmType,
  BatchMatchResult 
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
  limit: number = MATCHING_CONFIG.DEFAULT_RECOMMENDATION_COUNT
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
    const { overallSimilarity: factorSimilarity, factorComparison } = 
      calculateFactorSimilarity(user, candidate);
    
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
  limit: number = MATCHING_CONFIG.DEFAULT_RECOMMENDATION_COUNT
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
      // B不如A，打折：70 + (B/A) × 30
      interestAToB = 70 + (candidateScore / userScore) * 30;
    }
    
    // B接受A的可能性（双向评估）
    const acceptanceBToA = calculateAcceptance(user, candidate);
    
    // 最终匹配分 = 几何平均（避免单方面过高）
    const matchScore = clampScore(geometricMean(interestAToB, acceptanceBToA));
    
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
        mutualInterests: interestOverlap.mutualInterests,
        distance: distance ?? undefined,
        message: candidateScore > userScore 
          ? `TA比你优秀${Math.round(candidateScore - userScore)}分，勇敢追爱！`
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
  userB: UserMatchProfile
): number {
  // B的择偶标准（基于性别差异权重）
  const weights = getAlgorithmWeights('romantic', userB.gender, userA.gender);
  
  // A在B眼中的吸引力分数
  const attractiveness = calculateWeightedAttractiveness(userA, weights);
  
  // 计算接受度
  const bScore = userB.totalScore;
  
  // 如果A的综合吸引力 >= B的期望（80%），接受度高
  if (attractiveness >= bScore * 0.8) return 90;
  if (attractiveness >= bScore * 0.6) return 70;
  return 50;
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
  limit: number = MATCHING_CONFIG.DEFAULT_RECOMMENDATION_COUNT
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
    // 计算基础兼容度
    const baseCompatibility = 100 - Math.abs(userScore - candidate.totalScore);
    
    // 生成随机匹配分
    const randomFactor = generateRandomScore(0, 40) - 20; // -20 到 +20
    const matchScore = clampScore(baseCompatibility + randomFactor);
    
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
  limit: number = MATCHING_CONFIG.DEFAULT_RECOMMENDATION_COUNT
): MatchResult[] {
  const userScore = user.totalScore;
  const scoreRange = getCandidateScoreRange(userScore, 'pragmatic');
  
  const results: MatchResult[] = [];
  
  for (const candidate of candidates) {
    // 筛选分数范围内的候选人（比自己低10-20分）
    if (candidate.totalScore < scoreRange.min || candidate.totalScore > scoreRange.max) {
      continue;
    }
    
    const candidateScore = candidate.totalScore;
    const scoreDiff = userScore - candidateScore;
    
    // 成功率 = 分数差距越大，成功率越高
    // 70 + scoreDiff × 1.5，差10分=85%，差20分=100%
    const successRate = Math.min(100, 70 + scoreDiff * 1.5);
    
    // B对A的接受度（A比B优秀，B很可能接受）
    const acceptanceBToA = 95;
    
    // 匹配分 = (成功率 + 接受度) / 2
    const matchScore = clampScore((successRate + acceptanceBToA) / 2);
    
    // 计算兴趣重合度
    const interestOverlap = calculateInterestOverlap(user.interests, candidate.interests);
    
    // 计算距离
    const distance = calculateGeographicDistance(user.location, candidate.location);
    
    results.push({
      targetUserId: candidate.id,
      matchScore,
      algorithmType: 'pragmatic',
      scoreDetails: {
        userBaseScore: userScore,
        targetBaseScore: candidateScore,
        successRate: Math.round(successRate),
        acceptanceBToA,
        mutualInterests: interestOverlap.mutualInterests,
        distance: distance ?? undefined,
        message: `成功率：${Math.round(successRate)}%，稳稳的幸福`
      }
    });
  }
  
  // 按成功率排序
  return results
    .sort((a, b) => (b.scoreDetails.successRate || 0) - (a.scoreDetails.successRate || 0))
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
  limit: number = MATCHING_CONFIG.DEFAULT_RECOMMENDATION_COUNT
): MatchResult[] {
  switch (algorithm) {
    case 'compatible':
      return matchCompatible(user, candidates, limit);
    case 'romantic':
      return matchRomanticPursuit(user, candidates, limit);
    case 'serendipity':
      return matchSerendipity(user, candidates, limit);
    case 'pragmatic':
      return matchPragmatic(user, candidates, limit);
    default:
      // 默认使用门当户对算法
      return matchCompatible(user, candidates, limit);
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
  } = {}
): BatchMatchResult {
  const {
    limit = MATCHING_CONFIG.DEFAULT_RECOMMENDATION_COUNT,
    mixAlgorithms = false,
    mixRatio = { primary: 0.7, secondary: 0.3 }
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
      primaryCount
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
      secondaryCount
    );
    
    matches = [...primaryMatches, ...secondaryMatches];
  } else {
    // 单一算法模式
    matches = executeMatchingAlgorithm(preferredAlgorithm, user, candidates, limit);
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

