/**
 * 匹配系统配置常量
 * Matching System Configuration Constants
 *
 * 包含动态匹配策略的阈值配置
 */

import {
  DEFAULT_RANGE_EXPANSION_STEP_TICKS,
  rangeFromDiffTicks,
  rangeFromRatio,
  toTicks,
} from "@/lib/matching/score-range";

// ========================================
// 用户规模阈值配置
// ========================================

/**
 * 用户规模阈值
 * 用于动态匹配策略切换
 */
export const USER_SCALE_THRESHOLDS = {
  /** 小规模阈值（1万用户以下） */
  SMALL: 10_000,
  /** 中规模阈值（1万-10万用户） */
  MEDIUM: 100_000,
  /** 大规模阈值（10万-100万用户） */
  LARGE: 1_000_000,
  /** 超大规模阈值（100万用户以上） */
  VERY_LARGE: 10_000_000,
} as const;

// ========================================
// 匹配策略类型
// ========================================

/**
 * 匹配策略枚举
 */
export enum MatchingStrategy {
  /** 策略A：30%上下浮动匹配（小规模） */
  FLEXIBLE_FLOAT = 'flexible_float',
  /** 策略B：精确分数匹配（小规模） */
  EXACT_MATCH = 'exact_match',
  /** 策略C：上浮0.1-1分匹配（大规模） */
  UPWARD_FLOAT = 'upward_float',
  /** 策略D：智能混合匹配（超大规模） */
  SMART_MIX = 'smart_mix',
}

// ========================================
// 匹配策略配置
// ========================================

/**
 * 匹配策略配置接口
 */
export interface MatchingStrategyConfig {
  /** 策略ID */
  strategy: MatchingStrategy;
  /** 策略名称 */
  name: string;
  /** 策略描述 */
  description: string;
  /** 适用用户规模范围 */
  userScaleRange: {
    min: number;
    max: number;
  };
  /** 分数范围计算参数 */
  scoreRangeParams: {
    type: 'ratio' | 'diff' | 'dynamic';
    minValue: number;
    maxValue: number;
    dynamicFactor?: number;
  };
  /** 优先级（数字越小优先级越高） */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 默认匹配策略配置表
 */
export const DEFAULT_STRATEGY_CONFIGS: MatchingStrategyConfig[] = [
  {
    strategy: MatchingStrategy.FLEXIBLE_FLOAT,
    name: '灵活浮动匹配',
    description: '用户量较少时，扩大匹配范围，增加匹配机会',
    userScaleRange: {
      min: 0,
      max: USER_SCALE_THRESHOLDS.SMALL,
    },
    scoreRangeParams: {
      type: 'ratio',
      minValue: 0.7,  // -30%
      maxValue: 1.3,  // +30%
    },
    priority: 1,
    enabled: true,
  },
  {
    strategy: MatchingStrategy.EXACT_MATCH,
    name: '精确匹配',
    description: '用户量较少时，也提供精确分数匹配选项',
    userScaleRange: {
      min: 0,
      max: USER_SCALE_THRESHOLDS.SMALL,
    },
    scoreRangeParams: {
      type: 'diff',
      minValue: -1,
      maxValue: 1,
    },
    priority: 2,
    enabled: true,
  },
  {
    strategy: MatchingStrategy.UPWARD_FLOAT,
    name: '上浮匹配',
    description: '用户量增多后，优先推荐略高于自己分数的对象',
    userScaleRange: {
      min: USER_SCALE_THRESHOLDS.SMALL,
      max: USER_SCALE_THRESHOLDS.VERY_LARGE,
    },
    scoreRangeParams: {
      type: 'diff',
      minValue: 0.1,
      maxValue: 1.0,
    },
    priority: 1,
    enabled: true,
  },
  {
    strategy: MatchingStrategy.SMART_MIX,
    name: '智能混合',
    description: '超大规模时，使用动态调整的混合策略',
    userScaleRange: {
      min: USER_SCALE_THRESHOLDS.VERY_LARGE,
      max: Infinity,
    },
    scoreRangeParams: {
      type: 'dynamic',
      minValue: 0.85,
      maxValue: 1.15,
      dynamicFactor: 0.1,
    },
    priority: 1,
    enabled: true,
  },
];

// ========================================
// 动态匹配配置
// ========================================

/**
 * 动态匹配配置
 */
export const DYNAMIC_MATCHING_CONFIG = {
  /** 是否启用动态匹配策略 */
  ENABLED: true,

  /** 用户数量缓存更新间隔（毫秒） */
  USER_COUNT_CACHE_TTL: 60 * 60 * 1000, // 1小时

  /** 策略切换冷却时间（毫秒） */
  STRATEGY_SWITCH_COOLDOWN: 24 * 60 * 60 * 1000, // 24小时

  /** 默认策略（当无法确定用户规模时使用） */
  DEFAULT_STRATEGY: MatchingStrategy.FLEXIBLE_FLOAT,

  /** 匹配结果最小数量（如果结果太少则扩大范围） */
  MIN_RESULTS_THRESHOLD: 5,

  /** 范围扩大步长（tick，0.1 分为 1 tick） */
  RANGE_EXPANSION_STEP_TICKS: DEFAULT_RANGE_EXPANSION_STEP_TICKS, // 每次扩大 0.3 分

  /** 最大扩大次数 */
  MAX_EXPANSION_ITERATIONS: 3,
} as const;

// ========================================
// 辅助函数
// ========================================

/**
 * 根据用户数量获取推荐的匹配策略
 * @param userCount - 当前用户数量
 * @returns 推荐的匹配策略
 */
export function getRecommendedStrategy(userCount: number): MatchingStrategy {
  // 找到适用的策略（按优先级排序）
  const applicableStrategies = DEFAULT_STRATEGY_CONFIGS
    .filter(config => 
      config.enabled &&
      userCount >= config.userScaleRange.min &&
      userCount < config.userScaleRange.max
    )
    .sort((a, b) => a.priority - b.priority);

  if (applicableStrategies.length > 0) {
    return applicableStrategies[0].strategy;
  }

  return DYNAMIC_MATCHING_CONFIG.DEFAULT_STRATEGY;
}

/**
 * 根据策略获取分数范围
 * @param userScore - 用户分数
 * @param strategy - 匹配策略
 * @returns 分数范围 { min, max }
 */
export function getScoreRangeByStrategy(
  userScore: number,
  strategy: MatchingStrategy
): { min: number; max: number } {
  const config = DEFAULT_STRATEGY_CONFIGS.find(c => c.strategy === strategy);

  if (!config) {
    // ????30%??
    return rangeFromRatio(userScore, 0.7, 1.3);
  }

  const { type, minValue, maxValue } = config.scoreRangeParams;

  switch (type) {
    case 'ratio':
      return rangeFromRatio(userScore, minValue, maxValue);
    case 'diff':
      return rangeFromDiffTicks(userScore, toTicks(minValue), toTicks(maxValue));
    case 'dynamic': {
      // ????????? + ???????
      const dynamicFactor = config.scoreRangeParams.dynamicFactor || 0.1;
      const adjustment = (50 - userScore) * dynamicFactor * 0.01;
      return rangeFromRatio(userScore, minValue + adjustment, maxValue + adjustment);
    }
    default:
      return rangeFromRatio(userScore, 0.7, 1.3);
  }
}

/**
 * 获取用户规模描述
 * @param userCount - 用户数量
 * @returns 规模描述
 */
export function getUserScaleDescription(userCount: number): string {
  if (userCount < USER_SCALE_THRESHOLDS.SMALL) {
    return '小规模';
  }
  if (userCount < USER_SCALE_THRESHOLDS.MEDIUM) {
    return '中规模';
  }
  if (userCount < USER_SCALE_THRESHOLDS.LARGE) {
    return '大规模';
  }
  if (userCount < USER_SCALE_THRESHOLDS.VERY_LARGE) {
    return '超大规模';
  }
  return '特大规模';
}

/**
 * 获取所有可用的匹配策略
 * @returns 可用策略列表
 */
export function getAvailableStrategies(): MatchingStrategyConfig[] {
  return DEFAULT_STRATEGY_CONFIGS.filter(config => config.enabled);
}

/**
 * 验证匹配策略是否适用于当前用户规模
 * @param strategy - 匹配策略
 * @param userCount - 用户数量
 * @returns 是否适用
 */
export function isStrategyApplicable(
  strategy: MatchingStrategy,
  userCount: number
): boolean {
  const config = DEFAULT_STRATEGY_CONFIGS.find(c => c.strategy === strategy);
  if (!config || !config.enabled) {
    return false;
  }
  return userCount >= config.userScaleRange.min && userCount < config.userScaleRange.max;
}

