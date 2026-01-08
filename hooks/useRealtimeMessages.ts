/**
 * 实时消息 Hook
 * 订阅指定聊天室的消息变更，自动追加新消息到本地状态
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { chatClient, Message, MessageType } from '@/lib/realtime/chat-client';
import { useAuth } from '@/app/providers/AuthProvider';

interface UseRealtimeMessagesOptions {
  roomId: string;
  initialMessages?: Message[];
  pageSize?: number;
}

interface UseRealtimeMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  // 操作方法
  sendMessage: (content: string, type?: MessageType, metadata?: Record<string, unknown>, replyTo?: string) => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: () => Promise<void>;
  recallMessage: (messageId: string) => Promise<boolean>;
  // 状态
  isSending: boolean;
}

export function useRealtimeMessages({
  roomId,
  initialMessages = [],
  pageSize = 20,
}: UseRealtimeMessagesOptions): UseRealtimeMessagesReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // 用于防止重复加载
  const isLoadingRef = useRef(false);
  // 存储最早消息的时间戳
  const oldestTimestampRef = useRef<string | null>(null);

  // 加载初始消息
  const loadInitialMessages = useCallback(async () => {
    if (!roomId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await chatClient.getMessages(roomId, pageSize);
      
      // 消息按时间倒序返回，需要反转以正序显示
      const sortedMessages = [...data].reverse();
      setMessages(sortedMessages);
      
      // 记录最早消息的时间戳
      if (data.length > 0) {
        oldestTimestampRef.current = data[data.length - 1].sent_at;
      }
      
      setHasMore(data.length >= pageSize);
    } catch (err) {
      setError(err as Error);
      console.error('加载消息失败:', err);
    } finally {
      setLoading(false);
    }
  }, [roomId, pageSize]);

  // 加载更多历史消息
  const loadMore = useCallback(async () => {
    if (!roomId || !hasMore || isLoadingRef.current || !oldestTimestampRef.current) return;

    try {
      isLoadingRef.current = true;

      const data = await chatClient.getMessages(roomId, pageSize, oldestTimestampRef.current);
      
      if (data.length > 0) {
        // 消息按时间倒序返回，需要反转以正序显示
        const sortedNewMessages = [...data].reverse();
        setMessages(prev => [...sortedNewMessages, ...prev]);
        
        // 更新最早消息的时间戳
        oldestTimestampRef.current = data[data.length - 1].sent_at;
      }
      
      setHasMore(data.length >= pageSize);
    } catch (err) {
      setError(err as Error);
      console.error('加载更多消息失败:', err);
    } finally {
      isLoadingRef.current = false;
    }
  }, [roomId, pageSize, hasMore]);

  // 发送消息
  const sendMessage = useCallback(async (
    content: string,
    type: MessageType = 'text',
    metadata: Record<string, unknown> = {},
    replyTo?: string
  ) => {
    // 对于媒体消息（图片、音频、视频），content 可以为空
    const isMediaMessage = type === 'image' || type === 'audio' || type === 'video';
    if (!roomId || !user?.id) return;
    if (!isMediaMessage && !content.trim()) return;

    try {
      setIsSending(true);

      // 创建乐观更新的临时消息
      const tempId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        room_id: roomId,
        sender_id: user.id,
        content,
        message_type: type,
        reply_to_message_id: replyTo || null,
        metadata,
        is_read: false,
        read_at: null,
        sent_at: new Date().toISOString(),
        deleted_at: null,
        created_at: new Date().toISOString(),
      };

      // 乐观更新
      setMessages(prev => [...prev, tempMessage]);

      // 实际发送
      const sentMessage = await chatClient.sendMessage(
        roomId,
        user.id,
        content,
        type,
        metadata,
        replyTo
      );

      // 替换临时消息为真实消息
      if (sentMessage) {
        setMessages(prev => 
          prev.map(msg => msg.id === tempId ? sentMessage : msg)
        );
      }
    } catch (err) {
      // 发送失败，移除临时消息
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
      setError(err as Error);
      console.error('发送消息失败:', err);
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [roomId, user?.id]);

  // 标记消息为已读
  const markAsRead = useCallback(async () => {
    if (!roomId || !user?.id) return;

    try {
      await chatClient.markAsRead(roomId, user.id);
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  }, [roomId, user?.id]);

  // 撤回消息
  const recallMessage = useCallback(async (messageId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await chatClient.recallMessage(messageId, user.id);
      
      if (success) {
        // 更新本地状态
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, deleted_at: new Date().toISOString(), content: null }
              : msg
          )
        );
      }
      
      return success;
    } catch (err) {
      console.error('撤回消息失败:', err);
      throw err;
    }
  }, [user?.id]);

  // 处理实时消息事件
  const handleMessageEvent = useCallback((payload: { new?: Message; old?: Message }, eventType: string) => {
    switch (eventType) {
      case 'INSERT': {
        const newMessage = payload.new as Message;
        // 避免重复添加自己发送的消息（已通过乐观更新添加）
        setMessages(prev => {
          // 检查是否已存在
          const exists = prev.some(msg => msg.id === newMessage.id);
          // 检查是否是临时消息（已被真实消息替换）
          const isReplaced = prev.some(
            msg => msg.id.startsWith('temp-') && 
            msg.sender_id === newMessage.sender_id &&
            Math.abs(new Date(msg.sent_at).getTime() - new Date(newMessage.sent_at).getTime()) < 5000
          );
          
          if (exists || isReplaced) {
            return prev;
          }
          
          return [...prev, newMessage];
        });
        break;
      }
      case 'UPDATE': {
        const updatedMessage = payload.new as Message;
        setMessages(prev =>
          prev.map(msg => msg.id === updatedMessage.id ? updatedMessage : msg)
        );
        break;
      }
      case 'DELETE': {
        const deletedMessage = payload.old as Message;
        setMessages(prev =>
          prev.map(msg =>
            msg.id === deletedMessage.id
              ? { ...msg, deleted_at: new Date().toISOString(), content: null }
              : msg
          )
        );
        break;
      }
    }
  }, []);

  // 订阅实时消息
  useEffect(() => {
    if (!roomId) return;

    // 加载初始消息
    loadInitialMessages();

    // 订阅实时消息
    const unsubscribe = chatClient.subscribeToMessages(roomId, (payload, eventType) => {
      handleMessageEvent(payload as { new?: Message; old?: Message }, eventType);
    });

    return () => {
      unsubscribe();
    };
  }, [roomId, loadInitialMessages, handleMessageEvent]);

  // 进入聊天室时标记已读
  useEffect(() => {
    if (roomId && user?.id && messages.length > 0) {
      markAsRead();
    }
  }, [roomId, user?.id, messages.length, markAsRead]);

  return {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    loadMore,
    markAsRead,
    recallMessage,
    isSending,
  };
}

export default useRealtimeMessages;

