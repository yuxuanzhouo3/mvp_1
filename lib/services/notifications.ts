/**
 * Notification Service
 * Handles creating and managing user notifications
 * Includes Firebase Push Notification integration
 */

import { createClient } from '@supabase/supabase-js';
import { sendPushNotificationToUser, type PushNotificationPayload } from '@/lib/firebase/admin';

// Notification types
export type NotificationType =
  | 'photo_review'
  | 'match'
  | 'message'
  | 'system'
  | 'payment';

// Notification data interface
export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  /** Whether to send push notification (default: true) */
  sendPush?: boolean;
  /** Custom push notification payload (optional, auto-generated if not provided) */
  pushPayload?: Partial<PushNotificationPayload>;
}

// Create Supabase admin client (for server-side use only)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Create a notification for a user
 * Automatically sends push notification if enabled
 */
export async function createNotification(data: NotificationData): Promise<{ success: boolean; error?: string; pushSent?: boolean }> {
  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.from('notifications').insert({
      user_id: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      action_url: data.actionUrl,
      metadata: data.metadata || {},
      is_read: false,
    });

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }

    // Send push notification (default: enabled)
    let pushSent = false;
    if (data.sendPush !== false) {
      try {
        const pushPayload: PushNotificationPayload = {
          title: data.pushPayload?.title || data.title,
          body: data.pushPayload?.body || data.message,
          icon: data.pushPayload?.icon || '/logo.png',
          clickAction: data.pushPayload?.clickAction || data.actionUrl || '/',
          data: {
            type: data.type,
            notificationId: String(Date.now()),
            ...(data.metadata ? Object.fromEntries(
              Object.entries(data.metadata).map(([k, v]) => [k, String(v)])
            ) : {}),
          },
        };

        pushSent = await sendPushNotificationToUser(data.userId, pushPayload);
        if (pushSent) {
          console.log('[Notification] Push notification sent to user:', data.userId);
        }
      } catch (pushError) {
        console.warn('[Notification] Failed to send push notification:', pushError);
        // Don't fail the whole operation if push fails
      }
    }

    return { success: true, pushSent };
  } catch (error) {
    console.error('Notification creation error:', error);
    return { success: false, error: 'Failed to create notification' };
  }
}

/**
 * Create photo review approved notification
 */
export async function notifyPhotoApproved(
  userId: string,
  photoId: string
): Promise<{ success: boolean; error?: string }> {
  return createNotification({
    userId,
    type: 'photo_review',
    title: 'Photo Approved',
    message: 'Your photo has been approved and is now visible on your profile.',
    actionUrl: '/dashboard/profile',
    metadata: { photoId, status: 'approved' },
  });
}

/**
 * Create photo review rejected notification
 */
export async function notifyPhotoRejected(
  userId: string,
  photoId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  return createNotification({
    userId,
    type: 'photo_review',
    title: 'Photo Review Update',
    message: `Your photo was not approved: ${reason}. Please upload a different photo.`,
    actionUrl: '/dashboard/profile',
    metadata: { photoId, status: 'rejected', reason },
  });
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const supabase = getSupabaseAdmin();

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  } = {}
): Promise<{
  notifications: Array<{
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    is_read: boolean;
    action_url?: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
  total: number;
}> {
  try {
    const supabase = getSupabaseAdmin();
    const { limit = 20, offset = 0, unreadOnly = false } = options;

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('Error getting notifications:', error);
      return { notifications: [], total: 0 };
    }

    return {
      notifications: data || [],
      total: count || 0,
    };
  } catch {
    return { notifications: [], total: 0 };
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Mark as read error:', error);
    return { success: false, error: 'Failed to mark notification as read' };
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Mark all as read error:', error);
    return { success: false, error: 'Failed to mark all notifications as read' };
  }
}

/**
 * Delete old notifications (for cleanup)
 * Keeps notifications for the last 90 days as per privacy requirements
 */
export async function cleanupOldNotifications(): Promise<{ success: boolean; deletedCount: number }> {
  try {
    const supabase = getSupabaseAdmin();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.error('Error cleaning up notifications:', error);
      return { success: false, deletedCount: 0 };
    }

    return { success: true, deletedCount: data?.length || 0 };
  } catch {
    return { success: false, deletedCount: 0 };
  }
}

// Notification message templates (for i18n support)
export const NOTIFICATION_TEMPLATES = {
  photo_approved: {
    en: {
      title: 'Photo Approved',
      message: 'Your photo has been approved and is now visible on your profile.',
    },
    zh: {
      title: '照片已通过审核',
      message: '您的照片已通过审核，现已在您的个人资料中显示。',
    },
  },
  photo_rejected: {
    en: {
      title: 'Photo Review Update',
      message: (reason: string) => `Your photo was not approved: ${reason}`,
    },
    zh: {
      title: '照片审核结果',
      message: (reason: string) => `您的照片未通过审核：${reason}`,
    },
  },
  match_success: {
    en: {
      title: '🎉 It\'s a Match!',
      message: (userName: string) => `Congratulations! You and ${userName} liked each other. Start chatting now!`,
    },
    zh: {
      title: '🎉 匹配成功！',
      message: (userName: string) => `恭喜！你和 ${userName} 互相喜欢，快去聊天吧！`,
    },
  },
  someone_liked_you: {
    en: {
      title: '❤️ Someone Likes You!',
      message: 'Someone likes you! Check out the matching page to find out who.',
    },
    zh: {
      title: '❤️ 有人喜欢你！',
      message: '有人喜欢你！快去匹配页面看看吧 ❤️',
    },
  },
  super_like_received: {
    en: {
      title: '💖 You Got a Super Like!',
      message: 'Someone super liked you! Check out the matching page to find out who 💖',
    },
    zh: {
      title: '💖 收到超级喜欢！',
      message: '有人超级喜欢你！快去匹配页面看看吧 💖',
    },
  },
  new_message: {
    en: {
      title: (senderName: string) => `💬 New message from ${senderName}`,
      message: (content: string) => content.length > 50 ? content.substring(0, 50) + '...' : content,
    },
    zh: {
      title: (senderName: string) => `💬 ${senderName} 发来新消息`,
      message: (content: string) => content.length > 50 ? content.substring(0, 50) + '...' : content,
    },
  },
  payment_success: {
    en: {
      title: '✅ Payment Successful',
      message: (credits: number) => `You have successfully purchased ${credits} credits.`,
    },
    zh: {
      title: '✅ 支付成功',
      message: (credits: number) => `您已成功购买 ${credits} 积分。`,
    },
  },
  payment_failed: {
    en: {
      title: '❌ Payment Failed',
      message: 'Your payment could not be processed. Please try again.',
    },
    zh: {
      title: '❌ 支付失败',
      message: '您的支付无法处理，请重试。',
    },
  },
} as const;

/**
 * Get notification content based on deployment region
 * INTL region uses English, CN region uses Chinese
 */
export function getNotificationContent(
  templateKey: keyof typeof NOTIFICATION_TEMPLATES,
  language?: 'en' | 'zh'
): { title: string | ((...args: any[]) => string); message: string | ((...args: any[]) => string) } {
  // Import deployment config dynamically to avoid circular dependencies
  const lang = language ?? (process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN' ? 'zh' : 'en');
  const template = NOTIFICATION_TEMPLATES[templateKey];
  return template[lang] as { title: string | ((...args: any[]) => string); message: string | ((...args: any[]) => string) };
}

/**
 * Create match success notification with i18n support
 */
export async function notifyMatchSuccess(
  userId: string,
  matchedUserName: string,
  matchId: string,
  matchedUserId: string,
  matchScore: number | null
): Promise<{ success: boolean; error?: string }> {
  const lang = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN' ? 'zh' : 'en';
  const content = NOTIFICATION_TEMPLATES.match_success[lang];
  const message = typeof content.message === 'function'
    ? content.message(matchedUserName)
    : content.message;

  return createNotification({
    userId,
    type: 'match',
    title: content.title,
    message,
    actionUrl: `/chat?matchId=${matchId}`,
    metadata: {
      matchId,
      matchedUserId,
      matchedUserName,
      matchScore,
    },
  });
}

/**
 * Create "someone liked you" notification with i18n support
 */
export async function notifySomeoneLikedYou(
  userId: string,
  fromUserId: string,
  isSuperLike: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const lang = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN' ? 'zh' : 'en';
  const templateKey = isSuperLike ? 'super_like_received' : 'someone_liked_you';
  const content = NOTIFICATION_TEMPLATES[templateKey][lang];

  return createNotification({
    userId,
    type: 'match',
    title: content.title,
    message: content.message as string,
    actionUrl: '/matching',
    metadata: {
      type: 'someone_liked_you',
      action: isSuperLike ? 'super_like' : 'like',
      fromUserId,
    },
  });
}

/**
 * Create new message notification with i18n support
 */
export async function notifyNewMessage(
  recipientUserId: string,
  senderName: string,
  messageContent: string,
  roomId: string,
  senderId: string,
  messageType: string = 'text'
): Promise<{ success: boolean; error?: string; pushSent?: boolean }> {
  const lang = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN' ? 'zh' : 'en';
  const template = NOTIFICATION_TEMPLATES.new_message[lang];

  // Format message based on type
  let displayContent = messageContent;
  if (messageType === 'image') {
    displayContent = lang === 'zh' ? '[图片]' : '[Image]';
  } else if (messageType === 'audio') {
    displayContent = lang === 'zh' ? '[语音消息]' : '[Voice message]';
  } else if (messageType === 'video') {
    displayContent = lang === 'zh' ? '[视频]' : '[Video]';
  } else if (messageType === 'location') {
    displayContent = lang === 'zh' ? '[位置]' : '[Location]';
  } else if (messageType === 'sticker') {
    displayContent = lang === 'zh' ? '[贴纸]' : '[Sticker]';
  }

  const title = typeof template.title === 'function' ? template.title(senderName) : template.title;
  const message = typeof template.message === 'function' ? template.message(displayContent) : displayContent;

  return createNotification({
    userId: recipientUserId,
    type: 'message',
    title,
    message,
    actionUrl: `/dashboard/messages/${roomId}`,
    metadata: {
      roomId,
      senderId,
      senderName,
      messageType,
    },
    pushPayload: {
      clickAction: `/dashboard/messages/${roomId}`,
      data: {
        room_id: roomId,
        sender_id: senderId,
        type: 'message',
      },
    },
  });
}

/**
 * Create payment success notification with i18n support
 */
export async function notifyPaymentSuccess(
  userId: string,
  credits: number,
  paymentId: string,
  amount: number
): Promise<{ success: boolean; error?: string; pushSent?: boolean }> {
  const lang = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN' ? 'zh' : 'en';
  const template = NOTIFICATION_TEMPLATES.payment_success[lang];

  const message = typeof template.message === 'function' ? template.message(credits) : template.message;

  return createNotification({
    userId,
    type: 'payment',
    title: template.title,
    message,
    actionUrl: '/dashboard/credits',
    metadata: {
      paymentId,
      credits,
      amount,
      status: 'success',
    },
  });
}

/**
 * Create payment failed notification with i18n support
 */
export async function notifyPaymentFailed(
  userId: string,
  paymentId: string,
  reason?: string
): Promise<{ success: boolean; error?: string; pushSent?: boolean }> {
  const lang = process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN' ? 'zh' : 'en';
  const template = NOTIFICATION_TEMPLATES.payment_failed[lang];

  return createNotification({
    userId,
    type: 'payment',
    title: template.title,
    message: reason || (template.message as string),
    actionUrl: '/dashboard/credits',
    metadata: {
      paymentId,
      status: 'failed',
      reason,
    },
  });
}
