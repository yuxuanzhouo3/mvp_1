/**
 * 评分系统配置文件
 * Scoring System Configuration
 * 
 * 集中管理评分系统的所有配置常量，便于未来扩展
 */

// ========================================
// 评分精度配置
// ========================================

/**
 * 当前最大分数
 * 当前使用100分制，未来可扩展到1000分制
 */
export const MAX_SCORE = 100;

/**
 * 评分精度
 * 精确到小数点后1位
 */
export const SCORE_PRECISION = 0.1;

/**
 * 精度小数位数
 */
export const PRECISION_DECIMALS = 1;

// ========================================
// 用户规模阈值配置
// ========================================

/**
 * 用户规模阈值
 * 用于动态匹配策略切换
 */
export const USER_SCALE_THRESHOLDS = {
  /** 小规模用户数阈值 */
  SMALL: 1_000,
  /** 中等规模用户数阈值 */
  MEDIUM: 10_000,
  /** 大规模用户数阈值 (1万) */
  LARGE: 10_000,
  /** 超大规模用户数阈值 (100万) */
  MASSIVE: 1_000_000,
} as const;

// ========================================
// 匹配浮动配置
// ========================================

/**
 * 匹配分数浮动配置
 * 根据用户规模动态调整
 */
export const MATCHING_FLOAT_CONFIG = {
  /** 小规模时的浮动范围 (30%) */
  SMALL_SCALE_FLOAT_PERCENT: 0.30,
  /** 大规模时的上浮范围 (0.1-1分) */
  LARGE_SCALE_FLOAT_MIN: 0.1,
  LARGE_SCALE_FLOAT_MAX: 1.0,
} as const;

// ========================================
// 评分等级配置
// ========================================

/**
 * 评分等级边界
 * S >= 90, A >= 80, B >= 70, C >= 60, D < 60
 */
export const GRADE_BOUNDARIES = {
  S: 90,
  A: 80,
  B: 70,
  C: 60,
  D: 0,
} as const;

export type ScoreGrade = keyof typeof GRADE_BOUNDARIES;

// ========================================
// 未来扩展预留
// ========================================

/**
 * 未来扩展配置
 * 当用户规模达到100万+时启用
 */
export const FUTURE_EXPANSION = {
  /** 未来最大分数 (1000分制) */
  MAX_SCORE_EXPANDED: 1000,
  /** 扩展系数 */
  EXPANSION_FACTOR: 10,
  /** 是否启用扩展分数制 */
  ENABLE_EXPANDED_SCORING: false,
} as const;

// ========================================
// 工具函数
// ========================================

/**
 * 格式化分数到指定精度
 * @param score 原始分数
 * @returns 格式化后的分数
 */
export function formatScore(score: number): number {
  return Math.round(score * (1 / SCORE_PRECISION)) * SCORE_PRECISION;
}

/**
 * 将分数格式化为显示字符串
 * @param score 分数
 * @returns 显示字符串
 */
export function formatScoreDisplay(score: number): string {
  return score.toFixed(PRECISION_DECIMALS);
}

/**
 * 根据分数获取等级
 * @param score 分数
 * @returns 等级
 */
export function getGradeFromScore(score: number): ScoreGrade {
  if (score >= GRADE_BOUNDARIES.S) return 'S';
  if (score >= GRADE_BOUNDARIES.A) return 'A';
  if (score >= GRADE_BOUNDARIES.B) return 'B';
  if (score >= GRADE_BOUNDARIES.C) return 'C';
  return 'D';
}

/**
 * 获取当前匹配策略
 * @param userCount 用户数量
 * @returns 匹配策略类型
 */
export function getMatchingStrategy(userCount: number): 'small' | 'medium' | 'large' {
  if (userCount < USER_SCALE_THRESHOLDS.MEDIUM) {
    return 'small';
  }
  if (userCount < USER_SCALE_THRESHOLDS.MASSIVE) {
    return 'medium';
  }
  return 'large';
}

/**
 * 计算匹配分数浮动范围
 * @param baseScore 基础分数
 * @param userCount 用户数量
 * @returns [最小分数, 最大分数]
 */
export function calculateMatchingRange(
  baseScore: number,
  userCount: number
): [number, number] {
  const strategy = getMatchingStrategy(userCount);
  
  switch (strategy) {
    case 'small':
      // 小规模：30%上下浮动
      const floatAmount = baseScore * MATCHING_FLOAT_CONFIG.SMALL_SCALE_FLOAT_PERCENT;
      return [
        Math.max(0, baseScore - floatAmount),
        Math.min(MAX_SCORE, baseScore + floatAmount)
      ];
    
    case 'medium':
      // 中等规模：精确匹配
      return [baseScore, baseScore];
    
    case 'large':
      // 大规模：上浮0.1-1分
      return [
        baseScore + MATCHING_FLOAT_CONFIG.LARGE_SCALE_FLOAT_MIN,
        baseScore + MATCHING_FLOAT_CONFIG.LARGE_SCALE_FLOAT_MAX
      ];
    
    default:
      return [baseScore, baseScore];
  }
}

// ========================================
// 导出默认配置对象
// ========================================

export const ScoringConfig = {
  maxScore: MAX_SCORE,
  precision: SCORE_PRECISION,
  precisionDecimals: PRECISION_DECIMALS,
  userScaleThresholds: USER_SCALE_THRESHOLDS,
  matchingFloatConfig: MATCHING_FLOAT_CONFIG,
  gradeBoundaries: GRADE_BOUNDARIES,
  futureExpansion: FUTURE_EXPANSION,
} as const;

export default ScoringConfig;

