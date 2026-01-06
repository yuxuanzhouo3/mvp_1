/**
 * 实时输入状态 Hook
 * 订阅 Broadcast 频道的 typing 事件
 * 提供发送"正在输入"状态的方法
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { chatClient } from '@/lib/realtime/chat-client';
import { useAuth } from '@/app/providers/AuthProvider';

interface UseRealtimeTypingOptions {
  roomId: string;
  // 防抖延迟（毫秒）
  debounceDelay?: number;
  // 停止输入超时（毫秒）
  stopTypingTimeout?: number;
}

interface UseRealtimeTypingReturn {
  // 对方是否正在输入
  isOtherTyping: boolean;
  // 正在输入的用户ID
  typingUserId: string | null;
  // 发送"正在输入"状态
  sendTyping: () => void;
  // 发送"停止输入"状态
  stopTyping: () => void;
}

export function useRealtimeTyping({
  roomId,
  debounceDelay = 1000,
  stopTypingTimeout = 2000,
}: UseRealtimeTypingOptions): UseRealtimeTypingReturn {
  const { user } = useAuth();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  
  // 用于防抖
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 用于停止输入超时
  const stopTypingTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 用于清除对方输入状态的超时
  const clearOtherTypingTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 当前是否已发送输入状态
  const isSendingTypingRef = useRef(false);

  // 发送"正在输入"状态（带防抖）
  const sendTyping = useCallback(() => {
    if (!roomId || !user?.id) return;

    // 清除之前的停止输入定时器
    if (stopTypingTimerRef.current) {
      clearTimeout(stopTypingTimerRef.current);
    }

    // 如果已经发送过输入状态，使用防抖
    if (isSendingTypingRef.current) {
      // 设置停止输入定时器
      stopTypingTimerRef.current = setTimeout(() => {
        stopTyping();
      }, stopTypingTimeout);
      return;
    }

    // 首次发送，使用防抖
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await chatClient.sendTypingStatus(roomId, user.id, true);
        isSendingTypingRef.current = true;

        // 设置停止输入定时器
        stopTypingTimerRef.current = setTimeout(() => {
          stopTyping();
        }, stopTypingTimeout);
      } catch (err) {
        console.error('发送输入状态失败:', err);
      }
    }, debounceDelay);
  }, [roomId, user?.id, debounceDelay, stopTypingTimeout]);

  // 发送"停止输入"状态
  const stopTyping = useCallback(async () => {
    if (!roomId || !user?.id || !isSendingTypingRef.current) return;

    // 清除所有定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (stopTypingTimerRef.current) {
      clearTimeout(stopTypingTimerRef.current);
      stopTypingTimerRef.current = null;
    }

    try {
      await chatClient.sendTypingStatus(roomId, user.id, false);
      isSendingTypingRef.current = false;
    } catch (err) {
      console.error('发送停止输入状态失败:', err);
    }
  }, [roomId, user?.id]);

  // 处理对方的输入状态
  const handleTypingEvent = useCallback((userId: string, isTyping: boolean) => {
    // 忽略自己的输入状态
    if (userId === user?.id) return;

    if (isTyping) {
      setIsOtherTyping(true);
      setTypingUserId(userId);

      // 清除之前的超时
      if (clearOtherTypingTimerRef.current) {
        clearTimeout(clearOtherTypingTimerRef.current);
      }

      // 设置超时清除（如果对方没有发送停止输入，3秒后自动清除）
      clearOtherTypingTimerRef.current = setTimeout(() => {
        setIsOtherTyping(false);
        setTypingUserId(null);
      }, 3000);
    } else {
      setIsOtherTyping(false);
      setTypingUserId(null);

      if (clearOtherTypingTimerRef.current) {
        clearTimeout(clearOtherTypingTimerRef.current);
        clearOtherTypingTimerRef.current = null;
      }
    }
  }, [user?.id]);

  // 订阅输入状态
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = chatClient.subscribeToTyping(roomId, handleTypingEvent);

    return () => {
      unsubscribe();
      
      // 清理所有定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (stopTypingTimerRef.current) {
        clearTimeout(stopTypingTimerRef.current);
      }
      if (clearOtherTypingTimerRef.current) {
        clearTimeout(clearOtherTypingTimerRef.current);
      }

      // 发送停止输入状态
      if (isSendingTypingRef.current && user?.id) {
        chatClient.sendTypingStatus(roomId, user.id, false);
        isSendingTypingRef.current = false;
      }
    };
  }, [roomId, handleTypingEvent, user?.id]);

  return {
    isOtherTyping,
    typingUserId,
    sendTyping,
    stopTyping,
  };
}

export default useRealtimeTyping;

