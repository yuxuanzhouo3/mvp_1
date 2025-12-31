'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  chat_id: string;
  is_ai: boolean;
  attachments: string[];
  created_at: string;
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

export function useChat(options: UseChatOptions = {}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!user || !options.chatId) return;

    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/chat/${options.chatId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
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
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  }, [user, options.chatId, options.onMessageReceived, options.onTyping]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(async (content: string, attachments: string[] = []) => {
    if (!user || !options.chatId || !isConnected) return;

    const message: Omit<Message, 'id' | 'created_at'> = {
      content,
      sender_id: user.id,
      chat_id: options.chatId,
      is_ai: false,
      attachments,
    };

    // Send via WebSocket
    wsRef.current?.send(JSON.stringify({
      type: 'message',
      message,
    }));

    // Also save to database
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  }, [user, options.chatId, isConnected]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (!user || !options.chatId || !isConnected) return;

    wsRef.current?.send(JSON.stringify({
      type: 'typing',
      userId: user.id,
      isTyping,
    }));

    setIsTyping(isTyping);
  }, [user, options.chatId, isConnected]);

  const loadMessages = useCallback(async () => {
    if (!options.chatId) return;

    try {
      const response = await fetch(`/api/chat/messages?chatId=${options.chatId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [options.chatId]);

  const sendAIMessage = useCallback(async (content: string) => {
    if (!user || !options.chatId) return;

    // Send AI message request
    wsRef.current?.send(JSON.stringify({
      type: 'ai_message',
      content,
      userId: user.id,
      chatId: options.chatId,
    }));
  }, [user, options.chatId]);

  // Handle typing timeout
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

  // Connect/disconnect on mount/unmount
  useEffect(() => {
    if (options.chatId) {
      connect();
      loadMessages();
    }

    return () => {
      disconnect();
    };
  }, [options.chatId, connect, disconnect, loadMessages]);

  return {
    messages,
    isConnected,
    isTyping,
    typingUsers,
    sendMessage,
    sendTyping,
    sendAIMessage,
    loadMessages,
  };
} 