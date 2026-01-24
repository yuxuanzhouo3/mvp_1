/**
 * usePresence Hook
 * 管理用户在聊天室的在线状态
 * 用于优化推送通知：只在用户不在聊天室时发送推送
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';

// 心跳间隔（毫秒）- 2分钟
const HEARTBEAT_INTERVAL = 120000;

interface UsePresenceOptions {
  roomId: string;
  enabled?: boolean;
}

export function usePresence({ roomId, enabled = true }: UsePresenceOptions) {
  const { session } = useAuth();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  // 获取授权 token
  const getAuthToken = useCallback(() => {
    return session?.access_token;
  }, [session?.access_token]);

  // 进入聊天室
  const enterRoom = useCallback(async () => {
    const token = getAuthToken();
    if (!token || !roomId) return;

    try {
      const response = await fetch('/api/presence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId }),
      });

      if (response.ok) {
        isActiveRef.current = true;
        console.log('[Presence] Entered room:', roomId);
      }
    } catch (error) {
      console.warn('[Presence] Failed to enter room:', error);
    }
  }, [roomId, getAuthToken]);

  // 离开聊天室
  const leaveRoom = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch('/api/presence', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        isActiveRef.current = false;
        console.log('[Presence] Left room');
      }
    } catch (error) {
      console.warn('[Presence] Failed to leave room:', error);
    }
  }, [getAuthToken]);

  // 发送心跳
  const sendHeartbeat = useCallback(async () => {
    const token = getAuthToken();
    if (!token || !roomId || !isActiveRef.current) return;

    try {
      await fetch('/api/presence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId, action: 'heartbeat' }),
      });
    } catch (error) {
      console.warn('[Presence] Heartbeat failed:', error);
    }
  }, [roomId, getAuthToken]);

  // 启动心跳
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  }, [sendHeartbeat]);

  // 停止心跳
  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // 当进入聊天室时设置状态
  useEffect(() => {
    if (!enabled || !roomId || !session?.access_token) return;

    // 进入聊天室
    enterRoom();
    startHeartbeat();

    // 处理页面可见性变化
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => {
          enterRoom();
          startHeartbeat();
        }, 0);
      } else {
        // 页面隐藏时不立即离开，让 TTL 自然过期
        stopHeartbeat();
      }
    };

    // 处理页面卸载
    const handleBeforeUnload = () => {
      // 使用 sendBeacon 确保请求发送
      const token = getAuthToken();
      if (token) {
        navigator.sendBeacon('/api/presence/leave', JSON.stringify({ token }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopHeartbeat();
      leaveRoom();
    };
  }, [enabled, roomId, session?.access_token, enterRoom, leaveRoom, startHeartbeat, stopHeartbeat, getAuthToken]);

  return {
    enterRoom,
    leaveRoom,
    sendHeartbeat,
  };
}

export default usePresence;
