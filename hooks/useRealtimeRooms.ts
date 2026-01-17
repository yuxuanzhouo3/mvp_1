/**
 * 实时聊天室列表 Hook
 * 订阅 chat_rooms 表的 UPDATE 事件
 * 实时更新聊天列表的最后消息和未读数
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { chatClient, ChatRoomWithUser, ChatRoom } from '@/lib/realtime/chat-client';
import { useAuth } from '@/app/providers/AuthProvider';
import { isChinaDeployment } from '@/lib/config/deployment.config';
import { getChatService } from '@/lib/services/chat';

interface UseRealtimeRoomsReturn {
  rooms: ChatRoomWithUser[];
  loading: boolean;
  error: Error | null;
  // 操作方法
  refresh: () => Promise<void>;
  // 统计
  totalUnreadCount: number;
}

export function useRealtimeRooms(): UseRealtimeRoomsReturn {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoomWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载聊天室列表
  const loadRooms = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // CN 环境使用环信 IM，INTL 环境使用 Supabase
      if (isChinaDeployment()) {
        const cnChatService = getChatService();
        const data = await cnChatService.getChatRooms(user.id);
        // 转换为 ChatRoomWithUser 格式
        setRooms(data.map(room => ({
          ...room,
          id: room.id,
          match_id: room.matchId || room.id,
          last_message_content: room.lastMessage?.content || null,
          last_message_type: (room.lastMessage?.type || 'text') as any,
          last_message_at: room.lastMessage?.createdAt || null,
          unread_counts: room.unreadCounts || {},
          typing_status: {},
          is_active: room.isActive,
          created_at: room.createdAt,
          updated_at: room.updatedAt,
          other_user_id: room.otherUser?.id || '',
          other_user_username: room.otherUser?.username || '',
          other_user_avatar_url: room.otherUser?.avatarUrl || null,
          other_user_gender: null,
          other_user_last_active: null,
          unread_count: room.myUnreadCount || 0,
        })));
      } else {
        const data = await chatClient.getChatRooms(user.id);
        setRooms(data);
      }
    } catch (err) {
      setError(err as Error);
      console.error('加载聊天室列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 刷新聊天室列表
  const refresh = useCallback(async () => {
    await loadRooms();
  }, [loadRooms]);

  // 处理聊天室更新事件
  const handleRoomUpdate = useCallback((payload: { new?: ChatRoom; old?: ChatRoom }) => {
    const updatedRoom = payload.new as ChatRoom;
    if (!updatedRoom) return;

    setRooms(prev => {
      // 找到对应的聊天室并更新
      const updatedRooms = prev.map(room => {
        if (room.id === updatedRoom.id) {
          return {
            ...room,
            last_message_content: updatedRoom.last_message_content,
            last_message_type: updatedRoom.last_message_type,
            last_message_at: updatedRoom.last_message_at,
            unread_counts: updatedRoom.unread_counts,
            unread_count: user?.id 
              ? (updatedRoom.unread_counts?.[user.id] || 0)
              : 0,
            updated_at: updatedRoom.updated_at,
          };
        }
        return room;
      });

      // 按最后消息时间排序
      return updatedRooms.sort((a, b) => {
        const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return timeB - timeA;
      });
    });
  }, [user?.id]);

  // 计算总未读数
  const totalUnreadCount = rooms.reduce((sum, room) => sum + (room.unread_count || 0), 0);

  // 初始加载
  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // 订阅聊天室更新
  useEffect(() => {
    if (!user?.id) return;

    // CN 环境使用环信的订阅机制
    if (isChinaDeployment()) {
      const cnChatService = getChatService();
      const unsubscribe = cnChatService.subscribeAll(user.id, {
        onMessageReceived: () => {
          // 收到新消息时刷新聊天室列表
          loadRooms();
        },
      });
      return unsubscribe;
    }

    // INTL 环境使用 Supabase Realtime
    const unsubscribe = chatClient.subscribeToRooms(user.id, (payload) => {
      handleRoomUpdate(payload as { new?: ChatRoom; old?: ChatRoom });
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, handleRoomUpdate, loadRooms]);

  return {
    rooms,
    loading,
    error,
    refresh,
    totalUnreadCount,
  };
}

export default useRealtimeRooms;

