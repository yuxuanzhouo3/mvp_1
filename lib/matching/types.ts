/**
 * Matching System Types - 匹配系统类型定义
 */

import type { 
  GenderEnum, 
  AlgoTypeEnum,
  EducationLevelEnum,
  AnnualIncomeRangeEnum,
  MBTIType
} from '@/types/database';

// ========================================
// 算法类型
// ========================================

export type AlgorithmType = AlgoTypeEnum;

// 算法名称映射
export const ALGORITHM_NAMES: Record<AlgorithmType, string> = {
  compatible: '金玉良缘',      // 门当户对
  romantic: '勇敢追爱',        // 慕强择优
  pragmatic: '稳稳幸福',       // 务实捡漏
  serendipity: '心动盲盒'      // 有限随机
};

// ========================================
// 用户数据接口
// ========================================

/**
 * 用户完整资料（用于匹配）
 */
export interface UserMatchProfile {
  id: string;
  gender: GenderEnum;
  birthDate: string | null;
  age: number | null;
  
  // 市场价值评分
  totalScore: number;
  scoreBreakdown: {
    wealth: number;
    education: number;
    age: number;
    bmi: number;
    appearance: number;
    relationshipHistory: number;
    personality: number;
    jobStability: number;
    location: number;
    childrenPreference: number;
  };
  
  // 位置信息
  location: {
    latitude: number;
    longitude: number;
  } | null;
  cityName: string | null;
  
  // 基本资料
  educationLevel: EducationLevelEnum | null;
  annualIncomeRange: AnnualIncomeRangeEnum | null;
  mbti: MBTIType | null;
  
  // 兴趣爱好
  interests: number[];
  
  // 搜索偏好
  searchPreferences: {
    searchRadiusKm: number;
    ageRangeMin: number;
    ageRangeMax: number;
    heightRangeMin: number;
    heightRangeMax: number;
    educationRequirement: string;
    incomeRequirement: string;
  } | null;
  
  // 认证状态
  verificationLevel: string;
  
  // 最后活跃时间
  lastActiveAt: string | null;
}

/**
 * 候选人筛选条件
 */
export interface CandidateFilters {
  // 分数范围
  minScore?: number;
  maxScore?: number;
  
  // 性别
  targetGender?: GenderEnum;
  
  // 年龄范围
  minAge?: number;
  maxAge?: number;
  
  // 距离（公里）
  maxDistance?: number;
  
  // 认证等级
  minVerificationLevel?: string;
  
  // 排除已互动的用户
  excludeInteracted?: boolean;
  
  // 排除已匹配的用户
  excludeMatched?: boolean;
  
  // 最大返回数量
  limit?: number;
}

// ========================================
// 匹配结果接口
// ========================================

/**
 * 单个匹配结果
 */
export interface MatchResult {
  targetUserId: string;
  matchScore: number;
  algorithmType: AlgorithmType;
  
  // 详细分数
  scoreDetails: {
    userBaseScore: number;
    targetBaseScore: number;
    
    // 算法特定分数
    similarityScore?: number;      // 算法1: 相似度
    interestAToB?: number;         // A对B的兴趣度
    acceptanceBToA?: number;       // B接受A的可能性
    aspirationScore?: number;      // 算法2: 向上追求分
    successRate?: number;          // 算法4: 成功率
    randomFactor?: number;         // 算法3: 随机因子
    personalityCompatibility?: number;
    
    // 因子对比
    factorComparison?: {
      [key: string]: {
        user: number;
        target: number;
        matchDegree: number;
      };
    };
    
    // 共同兴趣
    mutualInterests?: number[];
    
    // 距离
    distance?: number;
    
    // 消息
    message?: string;
  };
}

/**
 * 批量匹配结果
 */
export interface BatchMatchResult {
  userId: string;
  algorithmType: AlgorithmType;
  matches: MatchResult[];
  generatedAt: string;
  expiresAt: string;
}

// ========================================
// 权重配置
// ========================================

/**
 * 因子权重配置
 */
export interface FactorWeights {
  wealth: number;
  education: number;
  age: number;
  bmi: number;
  appearance: number;
  relationshipHistory: number;
  personality: number;
  jobStability: number;
  location: number;
  childrenPreference: number;
}

export type AlgorithmWeightsMap = Record<AlgorithmType, {
  maleEvaluatingFemale: FactorWeights;
  femaleEvaluatingMale: FactorWeights;
}>;

/**
 * 算法权重配置表
 * 根据PRD中的权重表配置
 */
export const ALGORITHM_WEIGHTS: AlgorithmWeightsMap = {
  // 算法1: 金玉良缘（门当户对）- 注重相似性
  compatible: {
    maleEvaluatingFemale: {
      wealth: 0.10,
      education: 0.10,
      age: 0.20,
      bmi: 0.05,
      appearance: 0.25,
      relationshipHistory: 0.10,
      personality: 0.05,
      jobStability: 0.05,
      location: 0.05,
      childrenPreference: 0.05
    },
    femaleEvaluatingMale: {
      wealth: 0.30,
      education: 0.10,
      age: 0.15,
      bmi: 0.05,
      appearance: 0.15,
      relationshipHistory: 0.05,
      personality: 0.05,
      jobStability: 0.05,
      location: 0.05,
      childrenPreference: 0.05
    }
  },
  
  // 算法2: 勇敢追爱（慕强择优）- 注重对方优势
  romantic: {
    maleEvaluatingFemale: {
      wealth: 0.10,
      education: 0.10,
      age: 0.15,
      bmi: 0.05,
      appearance: 0.30,
      relationshipHistory: 0.10,
      personality: 0.10,
      jobStability: 0.05,
      location: 0.03,
      childrenPreference: 0.02
    },
    femaleEvaluatingMale: {
      wealth: 0.35,
      education: 0.10,
      age: 0.10,
      bmi: 0.03,
      appearance: 0.20,
      relationshipHistory: 0.05,
      personality: 0.10,
      jobStability: 0.05,
      location: 0.02,
      childrenPreference: 0.00
    }
  },
  
  // 算法3: 心动盲盒（有限随机）- 均衡权重
  serendipity: {
    maleEvaluatingFemale: {
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
    },
    femaleEvaluatingMale: {
      wealth: 0.15,
      education: 0.10,
      age: 0.10,
      bmi: 0.10,
      appearance: 0.15,
      relationshipHistory: 0.10,
      personality: 0.10,
      jobStability: 0.10,
      location: 0.05,
      childrenPreference: 0.05
    }
  },
  
  // 算法4: 稳稳幸福（务实捡漏）- 注重成功率
  pragmatic: {
    maleEvaluatingFemale: {
      wealth: 0.15,
      education: 0.15,
      age: 0.15,
      bmi: 0.05,
      appearance: 0.20,
      relationshipHistory: 0.10,
      personality: 0.05,
      jobStability: 0.10,
      location: 0.03,
      childrenPreference: 0.02
    },
    femaleEvaluatingMale: {
      wealth: 0.25,
      education: 0.15,
      age: 0.10,
      bmi: 0.05,
      appearance: 0.15,
      relationshipHistory: 0.10,
      personality: 0.05,
      jobStability: 0.10,
      location: 0.03,
      childrenPreference: 0.02
    }
  }
};

// ========================================
// 常量配置
// ========================================

/**
 * 匹配系统配置
 */
export const MATCHING_CONFIG = {
  // 推荐有效期（天）
  RECOMMENDATION_EXPIRY_DAYS: 3,
  
  // 默认返回推荐数量
  DEFAULT_RECOMMENDATION_COUNT: 20,
  
  // 最大返回推荐数量
  MAX_RECOMMENDATION_COUNT: 50,
  
  // 各算法的分数范围配置
  SCORE_RANGES: {
    // 算法1: 门当户对 - ±10分
    compatible: { minDiff: -10, maxDiff: 10 },
    
    // 算法2: 慕强择优 - -30% ~ +30%
    romantic: { minRatio: 0.7, maxRatio: 1.3 },
    
    // 算法3: 随机盲盒 - ±40分
    serendipity: { minDiff: -40, maxDiff: 40 },
    
    // 算法4: 务实捡漏 - -20 ~ +5分（优先低分，但包含相近的）
    pragmatic: { minDiff: -20, maxDiff: 5 }
  },
  
  // 活跃用户定义（天）
  ACTIVE_USER_DAYS: 30,
  
  // 最小匹配分数
  MIN_MATCH_SCORE: 50,
  
  // 最大匹配分数
  MAX_MATCH_SCORE: 100
} as const;

