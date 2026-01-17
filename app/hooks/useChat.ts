'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { isChinaDeployment } from '@/lib/config/deployment.config';

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  chat_id: string;
  is_ai: boolean;
  attachments: string[];
  created_at: string;
  message_type?: 'text' | 'image' | 'audio' | 'video' | 'location' | 'file';
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface Chat {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
}

interface UseChatOptions {
  chatId?: string;
  onMessageReceived?: (message: Message) => void;
  onTyping?: (userId: string, isTyping: boolean) => void;
}

// 环信聊天服务类型
interface IChatService {
  initialize(userId: string): Promise<{ success: boolean; error?: string }>;
  disconnect(): Promise<void>;
  sendMessage(request: any): Promise<any>;
  subscribe(roomId: string, callbacks: any): () => void;
  markAsRead(roomId: string, messageIds: string[]): Promise<void>;
  sendTypingStatus(roomId: string, isTyping: boolean): Promise<void>;
  getMessages(roomId: string, options?: any): Promise<any>;
}

// 获取聊天服务实例
let chatServiceInstance: IChatService | null = null;

async function getChatServiceInstance(): Promise<IChatService | null> {
  if (chatServiceInstance) return chatServiceInstance;

  if (isChinaDeployment()) {
    try {
      const { CnChatService } = await import('@/lib/services/chat/cn-chat');
      chatServiceInstance = new CnChatService();
      return chatServiceInstance;
    } catch (error) {
      console.error('Failed to load CnChatService:', error);
      return null;
    }
  }
  return null;
}

export function useChat(options: UseChatOptions = {}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatServiceRef = useRef<IChatService | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isCN = isChinaDeployment();

  // CN环境：初始化环信服务
  const initEasemob = useCallback(async () => {
    if (!user || !options.chatId) return;

    try {
      const service = await getChatServiceInstance();
      if (!service) {
        console.error('Chat service not available');
        return;
      }
      chatServiceRef.current = service;

      // 初始化连接
      const result = await service.initialize(user.id);
      if (!result.success) {
        console.error('Easemob init failed:', result.error);
        return;
      }

      setIsConnected(true);

      // 订阅消息
      unsubscribeRef.current = service.subscribe(options.chatId, {
        onMessageReceived: (msg: any) => {
          const newMessage: Message = {
            id: msg.id,
            content: msg.content || '',
            sender_id: msg.senderId,
            chat_id: options.chatId!,
            is_ai: false,
            attachments: msg.attachments || [],
            created_at: msg.createdAt || new Date().toISOString(),
            message_type: msg.type || 'text',
            status: 'delivered',
          };
          setMessages(prev => [...prev, newMessage]);
          options.onMessageReceived?.(newMessage);
        },
        onTypingStatusChanged: (userId: string, typing: boolean) => {
          if (typing) {
            setTypingUsers(prev => new Set(prev).add(userId));
          } else {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(userId);
              return newSet;
            });
          }
          options.onTyping?.(userId, typing);
        },
        onError: (error: Error) => {
          console.error('Chat error:', error);
        },
      });
    } catch (error) {
      console.error('Easemob connection error:', error);
      setIsConnected(false);
    }
  }, [user, options.chatId, options.onMessageReceived, options.onTyping]);

  // INTL环境：WebSocket连接
  const connectWebSocket = useCallback(() => {
    if (!user || !options.chatId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) {
      console.warn('WebSocket URL not configured, using HTTP polling');
      setIsConnected(true);
      return;
    }

    const ws = new WebSocket(`${wsUrl}/chat/${options.chatId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'message':
            const newMessage: Message = data.message;
            setMessages(prev => [...prev, newMessage]);
            options.onMessageReceived?.(newMessage);
            break;

          case 'typing_start':
            setTypingUsers(prev => new Set(prev).add(data.userId));
            options.onTyping?.(data.userId, true);
            break;

          case 'typing_stop':
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.userId);
              return newSet;
            });
            options.onTyping?.(data.userId, false);
            break;

          case 'ai_response':
            const aiMessage: Message = data.message;
            setMessages(prev => [...prev, aiMessage]);
            options.onMessageReceived?.(aiMessage);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };
  }, [user, options.chatId, options.onMessageReceived, options.onTyping]);

  const disconnect = useCallback(() => {
    if (isCN) {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    } else {
      wsRef.current?.close();
      wsRef.current = null;
    }
  }, [isCN]);

  const sendMessage = useCallback(async (content: string, attachments: string[] = []) => {
    if (!user || !options.chatId || !isConnected) return;

    if (isCN && chatServiceRef.current) {
      // CN环境：使用环信发送
      try {
        const result = await chatServiceRef.current.sendMessage({
          roomId: options.chatId,
          content,
          type: 'text',
          attachments,
        });

        if (result.success && result.message) {
          const newMessage: Message = {
            id: result.message.id,
            content,
            sender_id: user.id,
            chat_id: options.chatId,
            is_ai: false,
            attachments,
            created_at: new Date().toISOString(),
            status: 'sent',
          };
          setMessages(prev => [...prev, newMessage]);
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      // INTL环境：WebSocket + HTTP API
      const message: Omit<Message, 'id' | 'created_at'> = {
        content,
        sender_id: user.id,
        chat_id: options.chatId,
        is_ai: false,
        attachments,
      };

      wsRef.current?.send(JSON.stringify({ type: 'message', message }));

      try {
        await fetch(`/api/chat/${options.chatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });
      } catch (error) {
        console.error('Error saving message:', error);
      }
    }
  }, [user, options.chatId, isConnected, isCN]);

  const sendTyping = useCallback((typing: boolean) => {
    if (!user || !options.chatId || !isConnected) return;

    if (isCN && chatServiceRef.current) {
      chatServiceRef.current.sendTypingStatus(options.chatId, typing);
    } else if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        userId: user.id,
        isTyping: typing,
      }));
    }

    setIsTyping(typing);
  }, [user, options.chatId, isConnected, isCN]);

  const loadMessages = useCallback(async () => {
    if (!options.chatId) return;

    try {
      const response = await fetch(`/api/chat/${options.chatId}/messages`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [options.chatId]);

  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!options.chatId || !isCN || !chatServiceRef.current) return;

    try {
      await chatServiceRef.current.markAsRead(options.chatId, messageIds);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [options.chatId, isCN]);

  const sendAIMessage = useCallback(async (content: string) => {
    if (!user || !options.chatId) return;

    wsRef.current?.send(JSON.stringify({
      type: 'ai_message',
      content,
      userId: user.id,
      chatId: options.chatId,
    }));
  }, [user, options.chatId]);

  // 输入状态超时处理
  useEffect(() => {
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(false);
      }, 3000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, sendTyping]);

  // 连接/断开
  useEffect(() => {
    if (options.chatId) {
      if (isCN) {
        initEasemob();
      } else {
        connectWebSocket();
      }
      loadMessages();
    }

    return () => {
      disconnect();
    };
  }, [options.chatId, isCN, initEasemob, connectWebSocket, disconnect, loadMessages]);

  return {
    messages,
    isConnected,
    isTyping,
    typingUsers,
    sendMessage,
    sendTyping,
    sendAIMessage,
    loadMessages,
    markAsRead,
  };
}
