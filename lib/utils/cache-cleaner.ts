/**
 * 缓存清理工具
 * Cache Cleaner Utility
 *
 * 用于在用户退出登录时清理所有本地缓存
 */

import { chatClient } from '@/lib/realtime/chat-client';
import { geoRouter } from '@/lib/architecture-modules/core/geo-router';

/**
 * 需要清理的 localStorage 键名列表
 * 包括：认证、用户数据、加密密钥等
 */
const USER_RELATED_STORAGE_KEYS = [
  // Supabase 认证相关
  'supabase.auth.token',
  'supabase.auth.expires_at',
  'supabase.auth.refresh_token',
  // 加密密钥
  'e2e-encryption-keys',
  // 记住的邮箱（可选保留，但为安全起见清理）
  'remembered_email',
];

/**
 * 需要清理的带用户ID前缀的存储键
 */
const USER_ID_PREFIXED_KEYS = [
  'profile_setup_',
  'profile_setup_step_',
];

/**
 * 可选保留的设置（如语言偏好）
 * 默认不清理，除非明确指定
 */
const OPTIONAL_SETTINGS_KEYS = [
  'preferred-language',
  'deployment-region-version',
  'language',
  'colorMode',
];

/**
 * 清理选项
 */
interface ClearCacheOptions {
  /** 是否清理语言和主题偏好设置，默认 false */
  clearPreferences?: boolean;
  /** 用户ID，用于清理用户特定的缓存 */
  userId?: string;
}

/**
 * 清理所有用户相关的本地存储
 */
function clearLocalStorage(options: ClearCacheOptions = {}): void {
  if (typeof window === 'undefined') return;

  const { clearPreferences = false, userId } = options;

  // 1. 清理固定键名的存储
  USER_RELATED_STORAGE_KEYS.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Failed to remove localStorage key: ${key}`, e);
    }
  });

  // 2. 清理带用户ID前缀的存储
  if (userId) {
    USER_ID_PREFIXED_KEYS.forEach(prefix => {
      try {
        localStorage.removeItem(`${prefix}${userId}`);
      } catch (e) {
        console.warn(`Failed to remove localStorage key: ${prefix}${userId}`, e);
      }
    });
  }

  // 3. 清理所有 Supabase 相关的存储（可能有动态键名）
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('sb-') || // Supabase 前缀
      key.includes('supabase') ||
      key.startsWith('profile_setup_')
    )) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Failed to remove localStorage key: ${key}`, e);
    }
  });

  // 4. 可选：清理偏好设置
  if (clearPreferences) {
    OPTIONAL_SETTINGS_KEYS.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove localStorage key: ${key}`, e);
      }
    });
  }
}

/**
 * 清理 sessionStorage
 */
function clearSessionStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.clear();
  } catch (e) {
    console.warn('Failed to clear sessionStorage', e);
  }
}

/**
 * 清理聊天相关的实时订阅
 */
function clearChatSubscriptions(): void {
  try {
    chatClient.unsubscribeAll();
  } catch (e) {
    console.warn('Failed to unsubscribe chat client', e);
  }
}

/**
 * 清理地理位置缓存
 */
function clearGeoCache(): void {
  try {
    geoRouter.clearCache();
  } catch (e) {
    console.warn('Failed to clear geo cache', e);
  }
}

/**
 * 清理浏览器缓存（Service Worker 缓存）
 */
async function clearBrowserCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
  } catch (e) {
    console.warn('Failed to clear browser caches', e);
  }
}

/**
 * 清理所有 cookies（仅当前域名）
 */
function clearCookies(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      // 清除根路径的 cookie
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      // 清除当前路径的 cookie
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${window.location.pathname}`;
    }
  } catch (e) {
    console.warn('Failed to clear cookies', e);
  }
}

/**
 * 注销 Service Worker
 */
async function unregisterServiceWorkers(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(registration => registration.unregister())
    );
  } catch (e) {
    console.warn('Failed to unregister service workers', e);
  }
}

/**
 * 清理 IndexedDB 数据库
 */
async function clearIndexedDB(): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return;

  try {
    const databases = await indexedDB.databases();
    await Promise.all(
      databases.map(db => {
        if (db.name) {
          return new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(db.name!);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            request.onblocked = () => {
              console.warn(`IndexedDB ${db.name} is blocked`);
              resolve();
            };
          });
        }
        return Promise.resolve();
      })
    );
  } catch (e) {
    console.warn('Failed to clear IndexedDB', e);
  }
}

/**
 * 清理所有缓存
 * 在用户退出登录时调用
 */
export async function clearAllCaches(options: ClearCacheOptions = {}): Promise<void> {
  console.log('🧹 Clearing all caches...');

  // 1. 清理 localStorage
  clearLocalStorage(options);
  console.log('✅ localStorage cleared');

  // 2. 清理 sessionStorage
  clearSessionStorage();
  console.log('✅ sessionStorage cleared');

  // 3. 取消聊天订阅
  clearChatSubscriptions();
  console.log('✅ Chat subscriptions cleared');

  // 4. 清理 cookies
  clearCookies();
  console.log('✅ Cookies cleared');

  // 5. 清理浏览器缓存
  await clearBrowserCaches();
  console.log('✅ Browser caches cleared');

  // 6. 注销 Service Workers
  await unregisterServiceWorkers();
  console.log('✅ Service workers unregistered');

  // 7. 清理 IndexedDB
  await clearIndexedDB();
  console.log('✅ IndexedDB cleared');

  console.log('🎉 All caches cleared successfully');
}

/**
 * 导出单独的清理函数供需要的地方使用
 */
export {
  clearLocalStorage,
  clearSessionStorage,
  clearChatSubscriptions,
  clearGeoCache,
  clearBrowserCaches,
  clearCookies,
  unregisterServiceWorkers,
  clearIndexedDB,
};
