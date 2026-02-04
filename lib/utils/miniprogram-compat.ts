/**
 * Mini Program Compatibility Utilities
 * 微信小程序兼容性工具
 * 
 * 用于检测和处理微信小程序环境的兼容性问题
 */

// ========================================
// 环境检测
// ========================================

/**
 * 检测是否在微信小程序环境中
 */
export function isWechatMiniProgram(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // 检测微信小程序环境
  // @ts-ignore - wx 是微信小程序的全局对象
  return typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function';
}

export function isWechatMiniProgramWebView(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('miniprogram')) return true;

  const wxjsEnv = (window as any).__wxjs_environment;
  if (wxjsEnv === 'miniprogram') return true;

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('_wxjs_environment') === 'miniprogram') return true;
  } catch {}

  return false;
}

export function isWechatMiniProgramUserAgent(userAgent?: string | null): boolean {
  if (!userAgent) return false;
  return userAgent.toLowerCase().includes('miniprogram');
}

export interface WxMiniProgramBridge {
  postMessage?: (data: unknown) => void;
  navigateTo?: (options: { url: string }) => void;
  navigateBack?: (options?: { delta?: number }) => void;
  switchTab?: (options: { url: string }) => void;
  reLaunch?: (options: { url: string }) => void;
  redirectTo?: (options: { url: string }) => void;
  getEnv?: (callback: (res: { miniprogram: boolean }) => void) => void;
}

function resolveWxMiniProgramBridge(): WxMiniProgramBridge | null {
  if (typeof window === 'undefined') return null;
  const wxObj = (window as any).wx;
  if (!wxObj || typeof wxObj !== 'object') return null;
  const mp = wxObj.miniProgram;
  if (!mp || typeof mp !== 'object') return null;
  return mp as WxMiniProgramBridge;
}

export function getWxMiniProgramBridge(): WxMiniProgramBridge | null {
  return resolveWxMiniProgramBridge();
}

export async function waitForWxMiniProgramBridge(timeoutMs: number = 3000): Promise<WxMiniProgramBridge | null> {
  if (typeof window === 'undefined') return null;

  const ready = resolveWxMiniProgramBridge();
  if (ready && (typeof ready.navigateTo === 'function' || typeof ready.postMessage === 'function')) {
    console.log('[miniprogram] bridge ready immediately');
    return ready;
  }

  return new Promise((resolve) => {
    const start = Date.now();
    const intervalMs = 100;

    const tick = () => {
      const mp = resolveWxMiniProgramBridge();
      if (mp && (typeof mp.navigateTo === 'function' || typeof mp.postMessage === 'function')) {
        console.log('[miniprogram] bridge ready after', Date.now() - start, 'ms');
        resolve(mp);
        return;
      }

      if (Date.now() - start >= timeoutMs) {
        console.warn('[miniprogram] bridge wait timeout after', Date.now() - start, 'ms');
        resolve(mp ?? null);
        return;
      }

      setTimeout(tick, intervalMs);
    };

    tick();
  });
}

export async function requestWxMiniProgramLogin(returnUrl?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const currentUrl = returnUrl || window.location.href;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const wxEnv = (window as any).__wxjs_environment;
  const hasWx = typeof (window as any).wx !== 'undefined';
  const hasMp = !!(window as any)?.wx?.miniProgram;
  console.log('[miniprogram] request login', {
    currentUrl,
    hasWx,
    hasMp,
    wxEnv,
    ua,
  });
  const mp = await waitForWxMiniProgramBridge(3000);

  if (mp && typeof mp.navigateTo === 'function') {
    const encodedUrl = encodeURIComponent(currentUrl);
    console.log('[miniprogram] using navigateTo for login');
    mp.navigateTo({ url: `/pages/webshell/login?returnUrl=${encodedUrl}` });
    return true;
  }

  const payload = { type: 'REQUEST_WX_LOGIN', returnUrl: currentUrl };

  if (mp && typeof mp.postMessage === 'function') {
    console.log('[miniprogram] using postMessage for login');
    mp.postMessage({ data: payload });
    return true;
  }

  if ((window as any)?.wx?.miniProgram?.postMessage) {
    console.log('[miniprogram] using direct wx.miniProgram.postMessage for login');
    (window as any).wx.miniProgram.postMessage({ data: payload });
    return true;
  }

  console.warn('[miniprogram] login request failed: no available bridge method');
  return false;
}

/**
 * 检测是否在微信浏览器中
 */
export function isWechatBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('micromessenger');
}

/**
 * 检测是否在移动设备上
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * 获取微信小程序系统信息
 */
export function getWechatSystemInfo(): {
  platform: string;
  model: string;
  windowWidth: number;
  windowHeight: number;
  statusBarHeight: number;
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
} | null {
  if (!isWechatMiniProgram()) {
    return null;
  }
  
  try {
    // @ts-ignore
    const systemInfo = wx.getSystemInfoSync();
    return {
      platform: systemInfo.platform,
      model: systemInfo.model,
      windowWidth: systemInfo.windowWidth,
      windowHeight: systemInfo.windowHeight,
      statusBarHeight: systemInfo.statusBarHeight || 0,
      safeArea: systemInfo.safeArea || {
        top: 0,
        bottom: systemInfo.windowHeight,
        left: 0,
        right: systemInfo.windowWidth,
      },
    };
  } catch (e) {
    console.error('Failed to get Wechat system info:', e);
    return null;
  }
}

// ========================================
// 尺寸适配
// ========================================

/**
 * CN版中老年用户友好的尺寸配置
 */
export const SENIOR_FRIENDLY_SIZES = {
  /** 最小按钮尺寸 */
  minButtonSize: 44, // px
  /** 最小点击区域 */
  minTouchTarget: 48, // px
  /** 基础字号 */
  baseFontSize: 16, // px
  /** 标题字号 */
  titleFontSize: 20, // px
  /** 正文字号 */
  bodyFontSize: 16, // px
  /** 小字字号 */
  smallFontSize: 14, // px
  /** 行高 */
  lineHeight: 1.6,
  /** 内边距 */
  padding: 16, // px
  /** 外边距 */
  margin: 12, // px
  /** 圆角 */
  borderRadius: 12, // px
  /** 图标尺寸 */
  iconSize: 24, // px
} as const;

/**
 * 将px转换为微信小程序的rpx
 * 1rpx = 屏幕宽度/750
 */
export function pxToRpx(px: number, screenWidth: number = 375): number {
  return (px / screenWidth) * 750;
}

/**
 * 将rpx转换为px
 */
export function rpxToPx(rpx: number, screenWidth: number = 375): number {
  return (rpx / 750) * screenWidth;
}

// ========================================
// 触摸事件处理
// ========================================

/**
 * 触摸事件增强选项
 */
export interface TouchEnhancementOptions {
  /** 启用触摸反馈 */
  enableFeedback?: boolean;
  /** 触摸延迟（毫秒） */
  touchDelay?: number;
  /** 防止双击 */
  preventDoubleTap?: boolean;
  /** 双击间隔（毫秒） */
  doubleTapInterval?: number;
}

/**
 * 创建增强的触摸处理器
 * 适用于中老年用户的触摸操作优化
 */
export function createEnhancedTouchHandler(
  handler: () => void,
  options: TouchEnhancementOptions = {}
) {
  const {
    enableFeedback = true,
    touchDelay = 0,
    preventDoubleTap = true,
    doubleTapInterval = 300,
  } = options;

  let lastTapTime = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (event?: React.TouchEvent | React.MouseEvent) => {
    const now = Date.now();

    // 防止双击
    if (preventDoubleTap && now - lastTapTime < doubleTapInterval) {
      return;
    }
    lastTapTime = now;

    // 触摸反馈
    if (enableFeedback && isWechatMiniProgram()) {
      try {
        // @ts-ignore
        wx.vibrateShort({ type: 'light' });
      } catch (e) {
        // 忽略振动失败
      }
    }

    // 延迟执行
    if (touchDelay > 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        handler();
      }, touchDelay);
    } else {
      handler();
    }
  };
}

// ========================================
// 手势简化
// ========================================

/**
 * 简化手势配置
 * 减少复杂手势，适合中老年用户
 */
export const SIMPLIFIED_GESTURES = {
  /** 禁用长按 */
  disableLongPress: true,
  /** 禁用双击 */
  disableDoubleTap: true,
  /** 禁用滑动删除 */
  disableSwipeToDelete: true,
  /** 禁用下拉刷新（使用按钮替代） */
  disablePullToRefresh: true,
  /** 使用按钮替代滑动 */
  useButtonsInsteadOfSwipe: true,
} as const;

// ========================================
// 辅助功能
// ========================================

/**
 * 辅助功能配置
 */
export interface AccessibilityConfig {
  /** 启用高对比度 */
  highContrast: boolean;
  /** 启用大字体 */
  largeText: boolean;
  /** 减少动画 */
  reduceMotion: boolean;
  /** 启用屏幕阅读器支持 */
  screenReaderSupport: boolean;
}

/**
 * 默认辅助功能配置（适合中老年用户）
 */
export const DEFAULT_ACCESSIBILITY_CONFIG: AccessibilityConfig = {
  highContrast: true,
  largeText: true,
  reduceMotion: true,
  screenReaderSupport: true,
};

/**
 * 获取用户的辅助功能偏好
 */
export function getUserAccessibilityPreferences(): Partial<AccessibilityConfig> {
  if (typeof window === 'undefined') {
    return {};
  }

  const preferences: Partial<AccessibilityConfig> = {};

  // 检测系统偏好
  if (window.matchMedia) {
    // 检测减少动画偏好
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      preferences.reduceMotion = true;
    }

    // 检测高对比度偏好
    if (window.matchMedia('(prefers-contrast: more)').matches) {
      preferences.highContrast = true;
    }
  }

  return preferences;
}

// ========================================
// 微信API封装
// ========================================

/**
 * 安全调用微信API
 */
export function callWechatAPI<T>(
  apiName: string,
  params?: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!isWechatMiniProgram()) {
      reject(new Error('Not in Wechat Mini Program environment'));
      return;
    }

    try {
      // @ts-ignore
      wx[apiName]({
        ...params,
        success: (res: T) => resolve(res),
        fail: (err: Error) => reject(err),
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * 显示微信Toast提示
 */
export function showWechatToast(title: string, icon: 'success' | 'error' | 'none' = 'none') {
  if (!isWechatMiniProgram()) {
    // 在非小程序环境中使用console
    console.log(`[Toast] ${title}`);
    return;
  }

  callWechatAPI('showToast', {
    title,
    icon,
    duration: 2000,
  }).catch(console.error);
}

/**
 * 显示微信Loading
 */
export function showWechatLoading(title: string = '加载中...') {
  if (!isWechatMiniProgram()) {
    return;
  }

  callWechatAPI('showLoading', {
    title,
    mask: true,
  }).catch(console.error);
}

/**
 * 隐藏微信Loading
 */
export function hideWechatLoading() {
  if (!isWechatMiniProgram()) {
    return;
  }

  callWechatAPI('hideLoading', {}).catch(console.error);
}

// ========================================
// 导出
// ========================================

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  isWechatMiniProgram,
  isWechatMiniProgramWebView,
  isWechatMiniProgramUserAgent,
  isWechatBrowser,
  isMobileDevice,
  getWechatSystemInfo,
  getWxMiniProgramBridge,
  waitForWxMiniProgramBridge,
  requestWxMiniProgramLogin,
  SENIOR_FRIENDLY_SIZES,
  pxToRpx,
  rpxToPx,
  createEnhancedTouchHandler,
  SIMPLIFIED_GESTURES,
  DEFAULT_ACCESSIBILITY_CONFIG,
  getUserAccessibilityPreferences,
  callWechatAPI,
  showWechatToast,
  showWechatLoading,
  hideWechatLoading,
};

