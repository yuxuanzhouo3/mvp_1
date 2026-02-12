/**
 * Feature Flags Configuration
 */

import { isChinaDeployment } from './deployment.config';

export interface FeatureFlags {
  familyBackground: {
    showHukouLocation: boolean;
    showNativePlace: boolean;
    showParentsOccupation: boolean;
    showHouseProperty: boolean;
    showCarProperty: boolean;
    showFamilyBackgroundSection: boolean;
  };

  profile: {
    emphasizeEducation: boolean;
    emphasizeIncome: boolean;
    emphasizeJobStability: boolean;
    emphasizeInterests: boolean;
    emphasizeMBTI: boolean;
    emphasizeLifestyle: boolean;
  };

  matching: {
    defaultAlgorithm: 'compatible' | 'romantic' | 'pragmatic' | 'serendipity';
    showCompatibleAlgorithm: boolean;
    algorithmNameStyle: 'traditional' | 'modern';
    showSuccessRate: boolean;
  };

  ui: {
    themeStyle: 'traditional' | 'modern';
    useLargeFonts: boolean;
    simplifyNavigation: boolean;
    showSwipeCards: boolean;
    bottomNavStyle: 'simple' | 'standard';
  };

  copywriting: {
    style: 'parent-centric' | 'individual-centric';
    useTraditionalWording: boolean;
    matchingTerm: string;
    likeTerm: string;
    chatTerm: string;
  };

  auth: {
    wechatLogin: boolean;
    googleLogin: boolean;
    phoneLogin: boolean;
    emailLogin: boolean;
  };

  payment: {
    wechatPay: boolean;
    alipay: boolean;
    stripe: boolean;
    paypal: boolean;
  };

  chat: {
    voiceCall: boolean;
    videoCall: boolean;
  };
}

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
  chat: {
    voiceCall: true,
    videoCall: true,
  },
};

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
  chat: {
    voiceCall: false,
    videoCall: false,
  },
};

export function getFeatureFlags(): FeatureFlags {
  return isChinaDeployment() ? CN_FEATURE_FLAGS : INTL_FEATURE_FLAGS;
}

export function isFeatureEnabled(
  category: keyof FeatureFlags,
  feature: string,
): boolean {
  const flags = getFeatureFlags();
  const categoryFlags = flags[category] as Record<string, boolean | string>;
  return categoryFlags[feature] === true;
}

export function getFeatureValue<T>(
  category: keyof FeatureFlags,
  feature: string,
): T {
  const flags = getFeatureFlags();
  const categoryFlags = flags[category] as Record<string, unknown>;
  return categoryFlags[feature] as T;
}

export function shouldShowFamilyBackground(): boolean {
  return getFeatureFlags().familyBackground.showFamilyBackgroundSection;
}

export function shouldEmphasizeMBTI(): boolean {
  return getFeatureFlags().profile.emphasizeMBTI;
}

export function shouldUseLargeFonts(): boolean {
  return getFeatureFlags().ui.useLargeFonts;
}

export function getDefaultAlgorithm(): FeatureFlags['matching']['defaultAlgorithm'] {
  return getFeatureFlags().matching.defaultAlgorithm;
}

export function getThemeStyle(): FeatureFlags['ui']['themeStyle'] {
  return getFeatureFlags().ui.themeStyle;
}

export function getCopywritingStyle(): FeatureFlags['copywriting']['style'] {
  return getFeatureFlags().copywriting.style;
}

export function supportsWechatLogin(): boolean {
  return getFeatureFlags().auth.wechatLogin;
}

export function supportsGoogleLogin(): boolean {
  return getFeatureFlags().auth.googleLogin;
}

export function useFeatureFlags(): FeatureFlags {
  return getFeatureFlags();
}

export const cnFeatureFlags = CN_FEATURE_FLAGS;
export const intlFeatureFlags = INTL_FEATURE_FLAGS;

