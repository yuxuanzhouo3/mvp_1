'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { chatClient, type MessageType } from '@/lib/realtime/chat-client';

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

interface IChatService {
  initialize(userId: string): Promise<{ success: boolean; error?: string }>;
  disconnect(): Promise<void>;
  sendMessage(request: any): Promise<any>;
  subscribe(roomId: string, callbacks: any): () => void;
  markAsRead(roomId: string, messageIds: string[]): Promise<void>;
  sendTypingStatus(roomId: string, isTyping: boolean): Promise<void>;
  getMessages(roomId: string, options?: any): Promise<any>;
}

interface ChatRealtimeMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string | null;
  sent_at: string;
  message_type: MessageType;
  metadata: Record<string, unknown>;
}

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

function toLegacyMessage(message: ChatRealtimeMessage): Message {
  const metadata = (message.metadata || {}) as Record<string, unknown>;
  const attachments: string[] = [];

  if (typeof metadata.file_url === 'string') attachments.push(metadata.file_url);
  if (typeof metadata.image_url === 'string') attachments.push(metadata.image_url);
  if (typeof metadata.audio_url === 'string') attachments.push(metadata.audio_url);
  if (typeof metadata.video_url === 'string') attachments.push(metadata.video_url);

  const normalizedType: Message['message_type'] =
    message.message_type === 'sticker' || message.message_type === 'system'
      ? 'text'
      : message.message_type;

  return {
    id: message.id,
    content: message.content || '',
    sender_id: message.sender_id,
    chat_id: message.room_id,
    is_ai: false,
    attachments,
    created_at: message.sent_at,
    message_type: normalizedType,
    status: 'sent',
  };
}

export function useChat(options: UseChatOptions = {}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatServiceRef = useRef<IChatService | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const unsubscribeTypingRef = useRef<(() => void) | null>(null);
  const isCN = isChinaDeployment();

  const initEasemob = useCallback(async () => {
    if (!user || !options.chatId) return;

    try {
      const service = await getChatServiceInstance();
      if (!service) {
        console.error('Chat service not available');
        return;
      }
      chatServiceRef.current = service;

      const result = await service.initialize(user.id);
      if (!result.success) {
        console.error('Easemob init failed:', result.error);
        return;
      }

      setIsConnected(true);

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
              const next = new Set(prev);
              next.delete(userId);
              return next;
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
  }, [user, options]);

  const connectIntlRealtime = useCallback(() => {
    if (!user || !options.chatId) return;

    unsubscribeRef.current?.();
    unsubscribeTypingRef.current?.();

    unsubscribeRef.current = chatClient.subscribeToMessages(options.chatId, (payload, eventType) => {
      if (eventType === 'INSERT' && payload.new) {
        const nextMessage = toLegacyMessage(payload.new as unknown as ChatRealtimeMessage);
        setMessages(prev => {
          if (prev.some(item => item.id === nextMessage.id)) {
            return prev;
          }
          return [...prev, nextMessage];
        });
        options.onMessageReceived?.(nextMessage);
      }

      if (eventType === 'UPDATE' && payload.new) {
        const nextMessage = toLegacyMessage(payload.new as unknown as ChatRealtimeMessage);
        setMessages(prev => prev.map(item => (item.id === nextMessage.id ? nextMessage : item)));
      }

      if (eventType === 'DELETE' && payload.old) {
        const removedId = (payload.old as unknown as ChatRealtimeMessage).id;
        setMessages(prev => prev.filter(item => item.id !== removedId));
      }
    });

    unsubscribeTypingRef.current = chatClient.subscribeToTyping(options.chatId, (typingUserId, typing) => {
      if (typing) {
        setTypingUsers(prev => new Set(prev).add(typingUserId));
      } else {
        setTypingUsers(prev => {
          const next = new Set(prev);
          next.delete(typingUserId);
          return next;
        });
      }
      options.onTyping?.(typingUserId, typing);
    });

    setIsConnected(true);
  }, [user, options]);

  const disconnect = useCallback(() => {
    if (isCN) {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      chatServiceRef.current?.disconnect().catch(() => {});
    } else {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;

      unsubscribeTypingRef.current?.();
      unsubscribeTypingRef.current = null;
    }

    setIsConnected(false);
  }, [isCN]);

  const sendMessage = useCallback(async (content: string, attachments: string[] = []) => {
    if (!user || !options.chatId || !isConnected) return;

    if (isCN && chatServiceRef.current) {
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
      return;
    }

    try {
      const metadata: Record<string, unknown> = {};
      if (attachments[0]) {
        metadata.file_url = attachments[0];
      }

      const sent = await chatClient.sendMessage(
        options.chatId,
        user.id,
        content,
        'text',
        metadata,
      );

      if (sent) {
        const next = toLegacyMessage(sent as unknown as ChatRealtimeMessage);
        setMessages(prev => {
          if (prev.some(item => item.id === next.id)) {
            return prev;
          }
          return [...prev, next];
        });
        options.onMessageReceived?.(next);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }, [user, options, isConnected, isCN]);

  const sendTyping = useCallback((typing: boolean) => {
    if (!user || !options.chatId || !isConnected) return;

    if (isCN && chatServiceRef.current) {
      chatServiceRef.current.sendTypingStatus(options.chatId, typing);
    } else {
      chatClient
        .sendTypingStatus(options.chatId, user.id, typing)
        .catch((error) => console.error('Error sending typing status:', error));
    }

    setIsTyping(typing);
  }, [user, options.chatId, isConnected, isCN]);

  const loadMessages = useCallback(async () => {
    if (!options.chatId) return;

    if (isCN) {
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
      return;
    }

    try {
      const intlMessages = await chatClient.getMessages(options.chatId, 20);
      setMessages(
        intlMessages
          .slice()
          .reverse()
          .map((item) => toLegacyMessage(item as unknown as ChatRealtimeMessage)),
      );
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [options.chatId, isCN]);

  const markAsRead = useCallback(async (messageIds: string[]) => {
    if (!options.chatId || !isCN || !chatServiceRef.current) return;

    try {
      await chatServiceRef.current.markAsRead(options.chatId, messageIds);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [options.chatId, isCN]);

  const sendAIMessage = useCallback(async (content: string) => {
    if (!user || !options.chatId || !content.trim()) return;

    if (isCN) return;

    await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId: options.chatId,
        content,
      }),
    });
  }, [user, options.chatId, isCN]);

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

  useEffect(() => {
    if (options.chatId) {
      if (isCN) {
        initEasemob();
      } else {
        connectIntlRealtime();
      }
      loadMessages();
    }

    return () => {
      disconnect();
    };
  }, [options.chatId, isCN, initEasemob, connectIntlRealtime, loadMessages, disconnect]);

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
