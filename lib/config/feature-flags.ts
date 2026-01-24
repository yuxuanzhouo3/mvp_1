/**
 * Feature Flags Configuration
 * 功能开关配置
 * 
 * 定义CN/INTL版本的功能差异
 */

import { isChinaDeployment, isInternationalDeployment } from './deployment.config';

// ========================================
// 功能开关类型定义
// ========================================

/**
 * 功能开关配置接口
 */
export interface FeatureFlags {
  // 家庭背景相关
  familyBackground: {
    /** 是否显示户籍所在地 */
    showHukouLocation: boolean;
    /** 是否显示籍贯 */
    showNativePlace: boolean;
    /** 是否显示父母职业 */
    showParentsOccupation: boolean;
    /** 是否显示房产情况 */
    showHouseProperty: boolean;
    /** 是否显示车产情况 */
    showCarProperty: boolean;
    /** 是否显示家庭背景区块 */
    showFamilyBackgroundSection: boolean;
  };

  // 个人资料相关
  profile: {
    /** 是否强调学历/院校 */
    emphasizeEducation: boolean;
    /** 是否强调收入 */
    emphasizeIncome: boolean;
    /** 是否强调职业稳定性 */
    emphasizeJobStability: boolean;
    /** 是否强调兴趣爱好 */
    emphasizeInterests: boolean;
    /** 是否强调MBTI性格 */
    emphasizeMBTI: boolean;
    /** 是否强调生活方式 */
    emphasizeLifestyle: boolean;
  };

  // 匹配算法相关
  matching: {
    /** 默认匹配算法 */
    defaultAlgorithm: 'compatible' | 'romantic' | 'pragmatic' | 'serendipity';
    /** 是否显示"门当户对"算法 */
    showCompatibleAlgorithm: boolean;
    /** 算法显示名称风格 */
    algorithmNameStyle: 'traditional' | 'modern';
    /** 是否显示成功率 */
    showSuccessRate: boolean;
  };

  // UI/UX相关
  ui: {
    /** 主题风格 */
    themeStyle: 'traditional' | 'modern';
    /** 是否使用大字号（适合中老年） */
    useLargeFonts: boolean;
    /** 是否简化导航 */
    simplifyNavigation: boolean;
    /** 是否显示滑动卡片 */
    showSwipeCards: boolean;
    /** 底部导航样式 */
    bottomNavStyle: 'simple' | 'standard';
  };

  // 文案相关
  copywriting: {
    /** 文案风格 */
    style: 'parent-centric' | 'individual-centric';
    /** 是否使用传统措辞 */
    useTraditionalWording: boolean;
    /** "匹配"的替代词 */
    matchingTerm: string;
    /** "喜欢"的替代词 */
    likeTerm: string;
    /** "聊天"的替代词 */
    chatTerm: string;
  };

  // 认证相关
  auth: {
    /** 是否支持微信登录 */
    wechatLogin: boolean;
    /** 是否支持Google登录 */
    googleLogin: boolean;
    /** 是否支持手机号登录 */
    phoneLogin: boolean;
    /** 是否支持邮箱登录 */
    emailLogin: boolean;
  };

  // 支付相关
  payment: {
    /** 是否支持微信支付 */
    wechatPay: boolean;
    /** 是否支持支付宝 */
    alipay: boolean;
    /** 是否支持Stripe */
    stripe: boolean;
    /** 是否支持PayPal */
    paypal: boolean;
  };
}

// ========================================
// CN版功能配置
// ========================================

const CN_FEATURE_FLAGS: FeatureFlags = {
  familyBackground: {
    showHukouLocation: true,
    showNativePlace: true,
    showParentsOccupation: true,
    showHouseProperty: true,
    showCarProperty: true,
    showFamilyBackgroundSection: true,
  },
  profile: {
    emphasizeEducation: true,
    emphasizeIncome: true,
    emphasizeJobStability: true,
    emphasizeInterests: false,
    emphasizeMBTI: false,
    emphasizeLifestyle: false,
  },
  matching: {
    defaultAlgorithm: 'compatible',
    showCompatibleAlgorithm: true,
    algorithmNameStyle: 'traditional',
    showSuccessRate: true,
  },
  ui: {
    themeStyle: 'traditional',
    useLargeFonts: true,
    simplifyNavigation: true,
    showSwipeCards: false,
    bottomNavStyle: 'simple',
  },
  copywriting: {
    style: 'parent-centric',
    useTraditionalWording: true,
    matchingTerm: '门当户对',
    likeTerm: '有意向',
    chatTerm: '联系',
  },
  auth: {
    wechatLogin: true,
    googleLogin: false,
    phoneLogin: true,
    emailLogin: true,
  },
  payment: {
    wechatPay: true,
    alipay: true,
    stripe: false,
    paypal: false,
  },
};

// ========================================
// INTL版功能配置
// ========================================

const INTL_FEATURE_FLAGS: FeatureFlags = {
  familyBackground: {
    showHukouLocation: false,
    showNativePlace: false,
    showParentsOccupation: false,
    showHouseProperty: false,
    showCarProperty: false,
    showFamilyBackgroundSection: false,
  },
  profile: {
    emphasizeEducation: false,
    emphasizeIncome: false,
    emphasizeJobStability: false,
    emphasizeInterests: true,
    emphasizeMBTI: true,
    emphasizeLifestyle: true,
  },
  matching: {
    defaultAlgorithm: 'compatible',
    showCompatibleAlgorithm: true,
    algorithmNameStyle: 'modern',
    showSuccessRate: false,
  },
  ui: {
    themeStyle: 'modern',
    useLargeFonts: false,
    simplifyNavigation: false,
    showSwipeCards: true,
    bottomNavStyle: 'standard',
  },
  copywriting: {
    style: 'individual-centric',
    useTraditionalWording: false,
    matchingTerm: 'Match',
    likeTerm: 'Like',
    chatTerm: 'Chat',
  },
  auth: {
    wechatLogin: false,
    googleLogin: true,
    phoneLogin: false,
    emailLogin: true,
  },
  payment: {
    wechatPay: false,
    alipay: false,
    stripe: true,
    paypal: true,
  },
};

// ========================================
// 导出函数
// ========================================

/**
 * 获取当前环境的功能配置
 */
export function getFeatureFlags(): FeatureFlags {
  if (isChinaDeployment()) {
    return CN_FEATURE_FLAGS;
  }
  return INTL_FEATURE_FLAGS;
}

/**
 * 检查特定功能是否启用
 */
export function isFeatureEnabled(
  category: keyof FeatureFlags,
  feature: string
): boolean {
  const flags = getFeatureFlags();
  const categoryFlags = flags[category] as Record<string, boolean | string>;
  return categoryFlags[feature] === true;
}

/**
 * 获取功能值（非布尔值）
 */
export function getFeatureValue<T>(
  category: keyof FeatureFlags,
  feature: string
): T {
  const flags = getFeatureFlags();
  const categoryFlags = flags[category] as Record<string, unknown>;
  return categoryFlags[feature] as T;
}

// ========================================
// 便捷函数
// ========================================

/**
 * 是否显示家庭背景
 */
export function shouldShowFamilyBackground(): boolean {
  return getFeatureFlags().familyBackground.showFamilyBackgroundSection;
}

/**
 * 是否强调MBTI
 */
export function shouldEmphasizeMBTI(): boolean {
  return getFeatureFlags().profile.emphasizeMBTI;
}

/**
 * 是否使用大字号
 */
export function shouldUseLargeFonts(): boolean {
  return getFeatureFlags().ui.useLargeFonts;
}

/**
 * 获取默认匹配算法
 */
export function getDefaultAlgorithm(): FeatureFlags['matching']['defaultAlgorithm'] {
  return getFeatureFlags().matching.defaultAlgorithm;
}

/**
 * 获取主题风格
 */
export function getThemeStyle(): FeatureFlags['ui']['themeStyle'] {
  return getFeatureFlags().ui.themeStyle;
}

/**
 * 获取文案风格
 */
export function getCopywritingStyle(): FeatureFlags['copywriting']['style'] {
  return getFeatureFlags().copywriting.style;
}

/**
 * 是否支持微信登录
 */
export function supportsWechatLogin(): boolean {
  return getFeatureFlags().auth.wechatLogin;
}

/**
 * 是否支持Google登录
 */
export function supportsGoogleLogin(): boolean {
  return getFeatureFlags().auth.googleLogin;
}

// ========================================
// Hook for React Components
// ========================================

/**
 * useFeatureFlags - 在React组件中使用功能配置
 * 
 * 用法示例：
 * ```tsx
 * const flags = useFeatureFlags();
 * 
 * return (
 *   <div>
 *     {flags.familyBackground.showFamilyBackgroundSection && (
 *       <FamilyBackgroundSection />
 *     )}
 *   </div>
 * );
 * ```
 */
export function useFeatureFlags(): FeatureFlags {
  return getFeatureFlags();
}

// 导出配置（用于测试或特殊场景）
export const cnFeatureFlags = CN_FEATURE_FLAGS;
export const intlFeatureFlags = INTL_FEATURE_FLAGS;

