/**
 * Firebase 推送通知服务
 * 处理 FCM Token 管理和推送通知
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import { requestNotificationPermission, onForegroundMessage } from './config';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: Record<string, string>;
  click_action?: string;
}

/**
 * 初始化推送通知
 * 请求权限、获取 Token 并保存到数据库
 */
export async function initializePushNotifications(userId: string): Promise<boolean> {
  try {
    // 请求权限并获取 Token
    const token = await requestNotificationPermission();
    
    if (!token) {
      console.warn('Failed to get FCM token');
      return false;
    }

    // 保存 Token 到数据库
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('users')
      .update({ fcm_token: token })
      .eq('id', userId);

    if (error) {
      console.error('Failed to save FCM token:', error);
      return false;
    }

    console.log('Push notifications initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return false;
  }
}

/**
 * 监听前台通知
 */
export function setupForegroundNotifications(
  onNotification: (payload: NotificationPayload) => void
): () => void {
  return onForegroundMessage((payload: unknown) => {
    const typedPayload = payload as {
      notification?: {
        title?: string;
        body?: string;
        icon?: string;
        image?: string;
      };
      data?: Record<string, string>;
    };

    const notification: NotificationPayload = {
      title: typedPayload.notification?.title || '新消息',
      body: typedPayload.notification?.body || '',
      icon: typedPayload.notification?.icon,
      image: typedPayload.notification?.image,
      data: typedPayload.data,
    };

    onNotification(notification);
  });
}

/**
 * 显示本地通知（前台时使用）
 */
export function showLocalNotification(payload: NotificationPayload): void {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  // 扩展 NotificationOptions 以支持非标准属性
  interface ExtendedNotificationOptions extends NotificationOptions {
    image?: string;
    renotify?: boolean;
  }

  const options: ExtendedNotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/logo.png',
    tag: 'chat-notification',
    renotify: true,
    data: payload.data,
  };

  // image 是非标准属性，但某些浏览器支持
  if (payload.image) {
    options.image = payload.image;
  }

  const notification = new Notification(payload.title, options as NotificationOptions);

  notification.onclick = () => {
    window.focus();
    if (payload.click_action) {
      window.location.href = payload.click_action;
    } else if (payload.data?.room_id) {
      window.location.href = `/dashboard/messages/${payload.data.room_id}`;
    }
    notification.close();
  };
}

/**
 * 删除 FCM Token（用户登出时调用）
 */
export async function removeFcmToken(userId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('users')
      .update({ fcm_token: null })
      .eq('id', userId);

    if (error) {
      console.error('Failed to remove FCM token:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error removing FCM token:', error);
    return false;
  }
}

/**
 * 检查通知权限状态
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export default {
  initializePushNotifications,
  setupForegroundNotifications,
  showLocalNotification,
  removeFcmToken,
  getNotificationPermissionStatus,
};

