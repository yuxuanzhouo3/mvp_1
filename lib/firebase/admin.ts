/**
 * Firebase Admin SDK 初始化和推送通知服务
 * 仅 INTL 环境使用，CN 环境不使用 Firebase
 */

import admin from 'firebase-admin';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, isPlaceholderSupabaseUrl } from '@/lib/config/supabase-env';

/**
 * 检查是否启用 Firebase（仅 INTL 环境）
 */
function isFirebaseEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEPLOYMENT_REGION !== 'CN';
}

// Supabase Admin 客户端（用于查询用户 FCM Token）- 延迟初始化
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient | null {
  if (!isFirebaseEnabled()) {
    return null;
  }
  if (!supabaseAdmin) {
    const url = getSupabaseUrl();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key || isPlaceholderSupabaseUrl(url)) {
      return null;
    }
    supabaseAdmin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdmin;
}

// Firebase Admin 单例
let firebaseAdminInitialized = false;

/**
 * 初始化 Firebase Admin SDK（仅 INTL 环境）
 */
function initializeFirebaseAdmin(): boolean {
  if (!isFirebaseEnabled()) {
    return false;
  }

  if (firebaseAdminInitialized) {
    return true;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase Admin] Missing configuration, push notifications disabled');
    return false;
  }

  try {
    // 检查是否已经初始化
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    }

    firebaseAdminInitialized = true;
    console.log('[Firebase Admin] Initialized successfully');
    return true;
  } catch (error) {
    console.error('[Firebase Admin] Initialization failed:', error);
    return false;
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: Record<string, string>;
  clickAction?: string;
}

/**
 * 发送推送通知到指定 FCM Token
 */
export async function sendPushNotification(
  fcmToken: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  if (!initializeFirebaseAdmin()) {
    console.warn('[Push] Firebase Admin not initialized, skipping push');
    return false;
  }

  try {
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.image && { imageUrl: payload.image }),
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/logo.png',
          badge: '/logo.png',
          tag: 'personalink-notification',
          renotify: true,
          ...(payload.image && { image: payload.image }),
        },
        fcmOptions: {
          link: payload.clickAction || '/',
        },
      },
      data: payload.data || {},
    };

    const response = await admin.messaging().send(message);
    console.log('[Push] Notification sent successfully:', response);
    return true;
  } catch (error: any) {
    // 处理无效 Token 的情况
    if (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered') {
      console.warn('[Push] Invalid FCM token, should be removed from database');
      return false;
    }

    console.error('[Push] Failed to send notification:', error);
    return false;
  }
}

/**
 * 根据用户 ID 发送推送通知
 */
export async function sendPushNotificationToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.log('[Push] Supabase not available (CN environment), skipping push');
      return false;
    }

    // 从数据库获取用户的 FCM Token
    const { data: user, error } = await supabase
      .from('users')
      .select('fcm_token')
      .eq('id', userId)
      .single();

    if (error || !user?.fcm_token) {
      console.log('[Push] User has no FCM token:', userId);
      return false;
    }

    return await sendPushNotification(user.fcm_token, payload);
  } catch (error) {
    console.error('[Push] Failed to send notification to user:', error);
    return false;
  }
}

/**
 * 批量发送推送通知给多个用户
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  const results = await Promise.all(
    userIds.map(userId => sendPushNotificationToUser(userId, payload))
  );

  return {
    success: results.filter(r => r).length,
    failed: results.filter(r => !r).length,
  };
}

/**
 * 清除无效的 FCM Token
 */
export async function removeInvalidFcmToken(userId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return;
    }

    await supabase
      .from('users')
      .update({ fcm_token: null })
      .eq('id', userId);

    console.log('[Push] Removed invalid FCM token for user:', userId);
  } catch (error) {
    console.error('[Push] Failed to remove invalid FCM token:', error);
  }
}

const firebaseAdminUtils = {
  sendPushNotification,
  sendPushNotificationToUser,
  sendPushNotificationToUsers,
  removeInvalidFcmToken,
};

export default firebaseAdminUtils;
