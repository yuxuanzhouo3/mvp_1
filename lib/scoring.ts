/**
 * Market Value Scoring System - 市场价值评分系统
 * 基于PRD v1.0的因子评分算法实现
 */

import type { 
  GenderEnum, 
  EducationLevelEnum, 
  CompanyTypeEnum, 
  AnnualIncomeRangeEnum,
  MaritalStatusEnum,
  ChildrenPreferenceEnum,
  MBTIType,
  UserPhoto
} from '@/types/database';

// ========================================
// 枚举类型定义
// ========================================

/**
 * 评分因子枚举
 */
export enum ScoringFactor {
  WEALTH = 'wealth',
  EDUCATION = 'education',
  AGE = 'age',
  BMI = 'bmi',
  APPEARANCE = 'appearance',
  RELATIONSHIP_HISTORY = 'relationshipHistory',
  PERSONALITY = 'personality',
  JOB_STABILITY = 'jobStability',
  LOCATION = 'location',
  CHILDREN_PREFERENCE = 'childrenPreference'
}

/**
 * 算法类型
 */
export type AlgorithmType = 'compatible_match' | 'romantic_match' | 'pragmatic_match' | 'serendipity';

// ========================================
// 接口定义
// ========================================

/**
 * 权重配置接口
 */
export interface WeightConfig {
  [ScoringFactor.WEALTH]: number;
  [ScoringFactor.EDUCATION]: number;
  [ScoringFactor.AGE]: number;
  [ScoringFactor.BMI]: number;
  [ScoringFactor.APPEARANCE]: number;
  [ScoringFactor.RELATIONSHIP_HISTORY]: number;
  [ScoringFactor.PERSONALITY]: number;
  [ScoringFactor.JOB_STABILITY]: number;
  [ScoringFactor.LOCATION]: number;
  [ScoringFactor.CHILDREN_PREFERENCE]: number;
}

/**
 * 分数细分接口
 */
export interface ScoreBreakdown {
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

/**
 * 市场价值评分结果接口
 */
export interface MarketValueScore {
  totalScore: number;
  scoreBreakdown: ScoreBreakdown;
  percentile: number;
  calculatedAt: string;
  version: string;
}

/**
 * 恋爱历史接口
 */
export interface RelationshipHistory {
  count: number;
  longestDurationMonths?: number;
  maritalStatus: MaritalStatusEnum;
}

/**
 * 性格信息接口
 */
export interface Personality {
  mbti: MBTIType | null;
  testCompleted: boolean;
}

/**
 * 位置信息接口
 */
export interface Location {
  latitude: number;
  longitude: number;
}

/**
 * 用户评分输入数据接口
 */
export interface UserScoringData {
  // 基础信息
  gender: GenderEnum;
  birthDate: string | null;
  
  // 经济信息
  annualIncomeRange: AnnualIncomeRangeEnum | null;
  companyType: CompanyTypeEnum | null;
  
  // 教育信息
  educationLevel: EducationLevelEnum | null;
  
  // 身体信息
  bmi: number | null;
  
  // 照片
  photos: UserPhoto[];
  
  // 恋爱历史
  relationshipHistory: RelationshipHistory;
  
  // 性格
  personality: Personality;
  
  // 位置
  location: Location | null;
  
  // 生育意愿
  childrenPreference: ChildrenPreferenceEnum | null;
}

// ========================================
// 评分常量
// ========================================

/** 当前评分系统版本 */
export const SCORING_VERSION = 'v1.0.0';

/** 默认分数常量 */
export const DEFAULT_SCORES = {
  WEALTH: 50,
  EDUCATION: 60,
  AGE: 50,
  BMI: 60,
  APPEARANCE: 60,
  RELATIONSHIP_HISTORY: 70,
  PERSONALITY: 70,
  JOB_STABILITY: 70,
  LOCATION: 65,
  CHILDREN_PREFERENCE: 75
} as const;

// ========================================
// 收入评分映射
// ========================================

const INCOME_SCORE_MAP: Record<AnnualIncomeRangeEnum, number> = {
  'below_50k': 30,
  '50k_100k': 50,
  '100k_200k': 65,
  '200k_500k': 80,
  '500k_1m': 90,
  'above_1m': 100
};

// ========================================
// 学历评分映射
// ========================================

const EDUCATION_SCORE_MAP: Record<EducationLevelEnum, number> = {
  'high_school': 50,
  'associate': 65,
  'bachelor': 80,
  'master': 90,
  'doctorate': 95
};

// ========================================
// 公司类型评分映射
// ========================================

const COMPANY_TYPE_SCORE_MAP: Record<CompanyTypeEnum, number> = {
  'government': 100,      // 公务员
  'state_owned': 90,      // 国企
  'large_corp': 85,       // 大厂
  'sme': 70,              // 中小企业
  'startup': 60,          // 创业公司
  'freelance': 55         // 自由职业
};

// ========================================
// 生育意愿评分映射
// ========================================

const CHILDREN_PREFERENCE_SCORE_MAP: Record<ChildrenPreferenceEnum, number> = {
  'two': 100,      // want_2 -> 符合主流期待
  'one': 85,       // want_1
  'flexible': 75,  // flexible
  'none': 60       // no_want
};

// ========================================
// 评分函数实现
// ========================================

/**
 * 财富评分函数
 * @param incomeRange - 年收入区间
 * @returns 评分 (0-100)
 */
export function scoreWealth(incomeRange: AnnualIncomeRangeEnum | string | null): number {
  if (!incomeRange) {
    return DEFAULT_SCORES.WEALTH;
  }
  
  const score = INCOME_SCORE_MAP[incomeRange as AnnualIncomeRangeEnum];
  return score ?? DEFAULT_SCORES.WEALTH;
}

/**
 * 学历评分函数
 * @param level - 学历等级
 * @returns 评分 (0-100)
 */
export function scoreEducation(level: EducationLevelEnum | string | null): number {
  if (!level) {
    return DEFAULT_SCORES.EDUCATION;
  }
  
  const score = EDUCATION_SCORE_MAP[level as EducationLevelEnum];
  return score ?? DEFAULT_SCORES.EDUCATION;
}

/**
 * 计算年龄辅助函数
 * @param birthDate - 出生日期 (YYYY-MM-DD)
 * @returns 年龄
 */
export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  
  if (isNaN(birth.getTime())) {
    return -1; // 无效日期
  }
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * 年龄评分函数
 * @param birthDate - 出生日期 (YYYY-MM-DD)
 * @param gender - 性别
 * @returns 评分 (0-100)
 */
export function scoreAge(birthDate: string | null, gender: GenderEnum | string | null): number {
  if (!birthDate || !gender) {
    return DEFAULT_SCORES.AGE;
  }
  
  const age = calculateAge(birthDate);
  
  if (age < 0) {
    return DEFAULT_SCORES.AGE;
  }
  
  // 女性黄金年龄区间评分
  if (gender === 'female') {
    if (age >= 23 && age <= 30) return 100;     // 黄金区间
    if (age >= 20 && age <= 35) return 85;      // 次优区间
    if (age >= 18 && age <= 40) return 70;      // 可接受区间
    return 50;                                   // 其他
  }
  
  // 男性黄金年龄区间评分
  if (gender === 'male') {
    if (age >= 28 && age <= 38) return 100;     // 黄金区间
    if (age >= 25 && age <= 45) return 85;      // 次优区间
    if (age >= 22 && age <= 50) return 70;      // 可接受区间
    return 50;                                   // 其他
  }
  
  // 其他性别使用通用评分
  if (age >= 25 && age <= 35) return 100;
  if (age >= 22 && age <= 40) return 85;
  if (age >= 18 && age <= 45) return 70;
  return 50;
}

/**
 * BMI评分函数
 * @param bmi - BMI值
 * @returns 评分 (0-100)
 */
export function scoreBMI(bmi: number | null): number {
  if (bmi === null || bmi === undefined || bmi <= 0) {
    return DEFAULT_SCORES.BMI;
  }
  
  // 健康BMI范围 (18.5-24)
  if (bmi >= 18.5 && bmi <= 24) return 100;
  // 轻微偏离 (17-26)
  if (bmi >= 17 && bmi <= 26) return 80;
  // 中度偏离 (15-28)
  if (bmi >= 15 && bmi <= 28) return 60;
  // 严重偏离
  return 40;
}

/**
 * 外貌评分函数
 * 优先级: 管理员评分 > AI评分 > 默认值
 * @param photos - 用户照片数组
 * @returns 评分 (0-100)
 */
export function scoreAppearance(photos: UserPhoto[]): number {
  if (!photos || photos.length === 0) {
    return DEFAULT_SCORES.APPEARANCE;
  }

  // 查找主照片
  const primaryPhoto = photos.find(p => p.is_primary);

  if (!primaryPhoto) {
    return DEFAULT_SCORES.APPEARANCE;
  }

  // 优先使用管理员评分 (INTL环境)
  if (primaryPhoto.admin_rating) {
    return Math.min(100, Math.max(0, primaryPhoto.admin_rating));
  }

  // 其次使用AI评分
  if (primaryPhoto.ai_scores?.beauty) {
    return Math.min(100, Math.max(0, primaryPhoto.ai_scores.beauty));
  }

  // 无评分时返回默认值
  return DEFAULT_SCORES.APPEARANCE;
}

/**
 * 恋爱史评分函数
 * @param history - 恋爱历史信息
 * @returns 评分 (0-100)
 */
export function scoreRelationshipHistory(history: RelationshipHistory | null): number {
  if (!history) {
    return DEFAULT_SCORES.RELATIONSHIP_HISTORY;
  }
  
  const { count, longestDurationMonths, maritalStatus } = history;
  
  // 基础分数基于恋爱次数
  let baseScore: number;
  if (count >= 0 && count <= 2) {
    baseScore = 90;
  } else if (count >= 3 && count <= 5) {
    baseScore = 75;
  } else {
    baseScore = 60;
  }
  
  // 最长恋爱24个月以上 +10分
  if (longestDurationMonths && longestDurationMonths >= 24) {
    baseScore += 10;
  }
  
  // 婚姻状态调整
  if (maritalStatus === 'divorced') {
    baseScore -= 5;
  } else if (maritalStatus === 'widowed') {
    baseScore -= 3;
  }
  
  return Math.min(100, Math.max(0, baseScore));
}

/**
 * 性格评分函数（占位）
 * TODO: 未来根据MBTI兼容性评分
 * @param personality - 性格信息
 * @returns 评分 (0-100)
 */
export function scorePersonality(personality: Personality | null): number {
  if (!personality) {
    return DEFAULT_SCORES.PERSONALITY;
  }
  
  // 检查MBTI是否完成测试
  if (!personality.testCompleted || !personality.mbti) {
    return DEFAULT_SCORES.PERSONALITY;
  }
  
  // TODO: 预留性格匹配算法接口
  // 当前返回固定分数
  return 70;
}

/**
 * 职业稳定性评分函数
 * @param companyType - 公司类型
 * @returns 评分 (0-100)
 */
export function scoreJobStability(companyType: CompanyTypeEnum | string | null): number {
  if (!companyType) {
    return DEFAULT_SCORES.JOB_STABILITY;
  }
  
  const score = COMPANY_TYPE_SCORE_MAP[companyType as CompanyTypeEnum];
  return score ?? DEFAULT_SCORES.JOB_STABILITY;
}

/**
 * 使用Haversine公式计算两点间距离
 * @param loc1 - 位置1
 * @param loc2 - 位置2
 * @returns 距离（公里）
 */
export function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371; // 地球半径（公里）
  
  const dLat = toRadians(loc2.latitude - loc1.latitude);
  const dLon = toRadians(loc2.longitude - loc1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(loc1.latitude)) * Math.cos(toRadians(loc2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * 角度转弧度
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 地理位置评分函数
 * @param userLocation - 被评估用户位置
 * @param evaluatorLocation - 评估者位置
 * @returns 评分 (0-100)
 */
export function scoreLocation(
  userLocation: Location | null,
  evaluatorLocation: Location | null
): number {
  if (!userLocation || !evaluatorLocation) {
    return DEFAULT_SCORES.LOCATION;
  }
  
  const distance = calculateDistance(userLocation, evaluatorLocation);
  
  // 距离分段评分
  if (distance <= 10) return 100;        // 0-10km
  if (distance <= 50) return 85;         // 10-50km
  if (distance <= 200) return 70;        // 50-200km
  if (distance <= 500) return 50;        // 200-500km
  return 30;                              // 500km+
}

/**
 * 生育意愿评分函数
 * @param preference - 生育意愿
 * @returns 评分 (0-100)
 */
export function scoreChildrenPreference(preference: ChildrenPreferenceEnum | string | null): number {
  if (!preference) {
    return DEFAULT_SCORES.CHILDREN_PREFERENCE;
  }
  
  const score = CHILDREN_PREFERENCE_SCORE_MAP[preference as ChildrenPreferenceEnum];
  return score ?? DEFAULT_SCORES.CHILDREN_PREFERENCE;
}

// ========================================
// 权重配置
// ========================================

/**
 * 获取权重配置
 * @param algorithm - 算法类型
 * @param evaluatorGender - 评估者性别
 * @param targetGender - 被评估者性别
 * @returns 权重配置对象
 */
export function getWeights(
  algorithm: AlgorithmType,
  evaluatorGender: GenderEnum | string,
  targetGender: GenderEnum | string
): WeightConfig {
  // 女性评估男性的权重 (女看男)
  const femaleEvaluatingMale: WeightConfig = {
    [ScoringFactor.WEALTH]: 0.30,
    [ScoringFactor.EDUCATION]: 0.10,
    [ScoringFactor.AGE]: 0.15,
    [ScoringFactor.BMI]: 0.05,
    [ScoringFactor.APPEARANCE]: 0.15,
    [ScoringFactor.RELATIONSHIP_HISTORY]: 0.05,
    [ScoringFactor.PERSONALITY]: 0.05,
    [ScoringFactor.JOB_STABILITY]: 0.05,
    [ScoringFactor.LOCATION]: 0.05,
    [ScoringFactor.CHILDREN_PREFERENCE]: 0.05
  };
  
  // 男性评估女性的权重 (男看女)
  const maleEvaluatingFemale: WeightConfig = {
    [ScoringFactor.WEALTH]: 0.10,
    [ScoringFactor.EDUCATION]: 0.10,
    [ScoringFactor.AGE]: 0.20,
    [ScoringFactor.BMI]: 0.05,
    [ScoringFactor.APPEARANCE]: 0.25,
    [ScoringFactor.RELATIONSHIP_HISTORY]: 0.10,
    [ScoringFactor.PERSONALITY]: 0.05,
    [ScoringFactor.JOB_STABILITY]: 0.05,
    [ScoringFactor.LOCATION]: 0.05,
    [ScoringFactor.CHILDREN_PREFERENCE]: 0.05
  };
  
  // 根据不同算法调整权重（当前使用compatible_match作为基础）
  // TODO: 为其他算法定义不同的权重配置
  switch (algorithm) {
    case 'romantic_match':
      // 浪漫匹配：增加外貌和性格权重
      if (evaluatorGender === 'female' && targetGender === 'male') {
        return {
          ...femaleEvaluatingMale,
          [ScoringFactor.APPEARANCE]: 0.20,
          [ScoringFactor.PERSONALITY]: 0.10,
          [ScoringFactor.WEALTH]: 0.25
        };
      }
      if (evaluatorGender === 'male' && targetGender === 'female') {
        return {
          ...maleEvaluatingFemale,
          [ScoringFactor.APPEARANCE]: 0.30,
          [ScoringFactor.PERSONALITY]: 0.10,
          [ScoringFactor.AGE]: 0.15
        };
      }
      break;
      
    case 'pragmatic_match':
      // 务实匹配：增加财富和职业稳定性权重
      if (evaluatorGender === 'female' && targetGender === 'male') {
        return {
          ...femaleEvaluatingMale,
          [ScoringFactor.WEALTH]: 0.35,
          [ScoringFactor.JOB_STABILITY]: 0.10,
          [ScoringFactor.APPEARANCE]: 0.10
        };
      }
      if (evaluatorGender === 'male' && targetGender === 'female') {
        return {
          ...maleEvaluatingFemale,
          [ScoringFactor.EDUCATION]: 0.15,
          [ScoringFactor.JOB_STABILITY]: 0.10,
          [ScoringFactor.APPEARANCE]: 0.20
        };
      }
      break;
      
    case 'serendipity':
      // 随缘匹配：均衡权重
      return {
        [ScoringFactor.WEALTH]: 0.10,
        [ScoringFactor.EDUCATION]: 0.10,
        [ScoringFactor.AGE]: 0.10,
        [ScoringFactor.BMI]: 0.10,
        [ScoringFactor.APPEARANCE]: 0.10,
        [ScoringFactor.RELATIONSHIP_HISTORY]: 0.10,
        [ScoringFactor.PERSONALITY]: 0.10,
        [ScoringFactor.JOB_STABILITY]: 0.10,
        [ScoringFactor.LOCATION]: 0.10,
        [ScoringFactor.CHILDREN_PREFERENCE]: 0.10
      };
      
    case 'compatible_match':
    default:
      // 默认兼容匹配
      break;
  }
  
  // 默认返回基于性别的权重
  if (evaluatorGender === 'female' && targetGender === 'male') {
    return femaleEvaluatingMale;
  }
  if (evaluatorGender === 'male' && targetGender === 'female') {
    return maleEvaluatingFemale;
  }
  
  // 同性或其他情况，使用平均权重
  return {
    [ScoringFactor.WEALTH]: 0.15,
    [ScoringFactor.EDUCATION]: 0.10,
    [ScoringFactor.AGE]: 0.15,
    [ScoringFactor.BMI]: 0.05,
    [ScoringFactor.APPEARANCE]: 0.20,
    [ScoringFactor.RELATIONSHIP_HISTORY]: 0.10,
    [ScoringFactor.PERSONALITY]: 0.05,
    [ScoringFactor.JOB_STABILITY]: 0.05,
    [ScoringFactor.LOCATION]: 0.10,
    [ScoringFactor.CHILDREN_PREFERENCE]: 0.05
  };
}

// ========================================
// 综合评分计算
// ========================================

/**
 * 计算市场价值综合评分
 * @param userData - 用户评分数据
 * @param evaluatorGender - 评估者性别
 * @param algorithm - 算法类型
 * @param evaluatorLocation - 评估者位置（可选，用于距离计算）
 * @returns 市场价值评分结果
 */
export function calculateMarketValue(
  userData: UserScoringData,
  evaluatorGender: GenderEnum | string,
  algorithm: AlgorithmType = 'compatible_match',
  evaluatorLocation?: Location | null
): Omit<MarketValueScore, 'percentile'> {
  // 获取权重配置
  const weights = getWeights(algorithm, evaluatorGender, userData.gender);
  
  // 计算各因子分数
  const scoreBreakdown: ScoreBreakdown = {
    wealth: scoreWealth(userData.annualIncomeRange),
    education: scoreEducation(userData.educationLevel),
    age: scoreAge(userData.birthDate, userData.gender),
    bmi: scoreBMI(userData.bmi),
    appearance: scoreAppearance(userData.photos),
    relationshipHistory: scoreRelationshipHistory(userData.relationshipHistory),
    personality: scorePersonality(userData.personality),
    jobStability: scoreJobStability(userData.companyType),
    location: scoreLocation(userData.location, evaluatorLocation || null),
    childrenPreference: scoreChildrenPreference(userData.childrenPreference)
  };
  
  // 计算加权总分
  const totalScore = 
    scoreBreakdown.wealth * weights[ScoringFactor.WEALTH] +
    scoreBreakdown.education * weights[ScoringFactor.EDUCATION] +
    scoreBreakdown.age * weights[ScoringFactor.AGE] +
    scoreBreakdown.bmi * weights[ScoringFactor.BMI] +
    scoreBreakdown.appearance * weights[ScoringFactor.APPEARANCE] +
    scoreBreakdown.relationshipHistory * weights[ScoringFactor.RELATIONSHIP_HISTORY] +
    scoreBreakdown.personality * weights[ScoringFactor.PERSONALITY] +
    scoreBreakdown.jobStability * weights[ScoringFactor.JOB_STABILITY] +
    scoreBreakdown.location * weights[ScoringFactor.LOCATION] +
    scoreBreakdown.childrenPreference * weights[ScoringFactor.CHILDREN_PREFERENCE];
  
  return {
    totalScore: Math.round(totalScore * 10) / 10, // 保留一位小数
    scoreBreakdown,
    calculatedAt: new Date().toISOString(),
    version: SCORING_VERSION
  };
}

/**
 * 从数据库用户数据转换为评分输入数据
 * @param user - 用户基本信息
 * @param profile - 用户资料
 * @param photos - 用户照片
 * @returns 评分输入数据
 */
export function transformUserToScoringData(
  user: {
    gender: GenderEnum | null;
    birth_date: string | null;
  },
  profile: {
    bmi: number | null;
    education_level: EducationLevelEnum | null;
    company_type: CompanyTypeEnum | null;
    annual_income_range: AnnualIncomeRangeEnum | null;
    marital_status: MaritalStatusEnum;
    relationship_history_count: number;
    children_preference: ChildrenPreferenceEnum | null;
    mbti: MBTIType | null;
    location: { latitude: number; longitude: number } | null;
  },
  photos: UserPhoto[]
): UserScoringData {
  return {
    gender: user.gender || 'other',
    birthDate: user.birth_date,
    annualIncomeRange: profile.annual_income_range,
    companyType: profile.company_type,
    educationLevel: profile.education_level,
    bmi: profile.bmi,
    photos,
    relationshipHistory: {
      count: profile.relationship_history_count || 0,
      maritalStatus: profile.marital_status || 'single'
    },
    personality: {
      mbti: profile.mbti,
      testCompleted: !!profile.mbti
    },
    location: profile.location,
    childrenPreference: profile.children_preference
  };
}

