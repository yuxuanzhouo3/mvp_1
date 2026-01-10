/**
 * INTL 环境实时聊天客户端
 * 基于 Supabase Realtime 实现
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';

// 消息类型定义
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'location' | 'sticker' | 'system';

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string | null;
  message_type: MessageType;
  reply_to_message_id: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  sent_at: string;
  deleted_at: string | null;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  match_id: string;
  last_message_content: string | null;
  last_message_type: MessageType;
  last_message_at: string | null;
  unread_counts: Record<string, number>;
  typing_status: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatRoomWithUser extends ChatRoom {
  other_user_id: string;
  other_user_username: string;
  other_user_avatar_url: string | null;
  other_user_gender: string | null;
  other_user_last_active: string | null;
  unread_count: number;
}

// 事件类型
export type MessageEventType = 'INSERT' | 'UPDATE' | 'DELETE';
export type RoomEventType = 'UPDATE';

// 回调类型
export type MessageCallback = (
  payload: RealtimePostgresChangesPayload<Message>,
  eventType: MessageEventType
) => void;

export type RoomCallback = (
  payload: RealtimePostgresChangesPayload<ChatRoom>,
  eventType: RoomEventType
) => void;

export type TypingCallback = (userId: string, isTyping: boolean) => void;
export type PresenceCallback = (userId: string, isOnline: boolean) => void;

/**
 * 聊天客户端类
 * 封装 Supabase Realtime 的订阅和发送逻辑
 */
class ChatRealtimeClient {
  private supabase = getSupabaseClient();
  private messageChannels: Map<string, RealtimeChannel> = new Map();
  private roomChannel: RealtimeChannel | null = null;
  private typingChannels: Map<string, RealtimeChannel> = new Map();
  private presenceChannel: RealtimeChannel | null = null;

  /**
   * 订阅指定聊天室的消息变更
   */
  subscribeToMessages(roomId: string, callback: MessageCallback): () => void {
    // 如果已存在订阅，先取消
    this.unsubscribeFromMessages(roomId);

    const channel = this.supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => callback(payload, 'INSERT')
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => callback(payload, 'UPDATE')
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<Message>) => callback(payload, 'DELETE')
      )
      .subscribe();

    this.messageChannels.set(roomId, channel);

    // 返回取消订阅函数
    return () => this.unsubscribeFromMessages(roomId);
  }

  /**
   * 取消订阅指定聊天室的消息
   */
  unsubscribeFromMessages(roomId: string): void {
    const channel = this.messageChannels.get(roomId);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.messageChannels.delete(roomId);
    }
  }

  /**
   * 订阅聊天室列表更新
   */
  subscribeToRooms(userId: string, callback: RoomCallback): () => void {
    // 如果已存在订阅，先取消
    this.unsubscribeFromRooms();

    const channel = this.supabase
      .channel(`rooms:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_rooms',
        },
        (payload: RealtimePostgresChangesPayload<ChatRoom>) => callback(payload, 'UPDATE')
      )
      .subscribe();

    this.roomChannel = channel;

    return () => this.unsubscribeFromRooms();
  }

  /**
   * 取消订阅聊天室列表
   */
  unsubscribeFromRooms(): void {
    if (this.roomChannel) {
      this.supabase.removeChannel(this.roomChannel);
      this.roomChannel = null;
    }
  }

  /**
   * 订阅"正在输入"状态（使用 Broadcast）
   */
  subscribeToTyping(roomId: string, callback: TypingCallback): () => void {
    // 如果已存在订阅，先取消
    this.unsubscribeFromTyping(roomId);

    const channel = this.supabase
      .channel(`typing:${roomId}`)
      .on('broadcast', { event: 'typing' }, (payload: { payload: { userId: string; isTyping: boolean } }) => {
        const { userId, isTyping } = payload.payload;
        callback(userId, isTyping);
      })
      .subscribe();

    this.typingChannels.set(roomId, channel);

    return () => this.unsubscribeFromTyping(roomId);
  }

  /**
   * 取消订阅"正在输入"状态
   */
  unsubscribeFromTyping(roomId: string): void {
    const channel = this.typingChannels.get(roomId);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.typingChannels.delete(roomId);
    }
  }

  /**
   * 发送"正在输入"状态
   */
  async sendTypingStatus(roomId: string, userId: string, isTyping: boolean): Promise<void> {
    const channel = this.typingChannels.get(roomId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, isTyping },
      });
    }
  }

  /**
   * 订阅用户在线状态（使用 Presence）
   */
  subscribeToPresence(roomId: string, userId: string, callback: PresenceCallback): () => void {
    if (this.presenceChannel) {
      this.supabase.removeChannel(this.presenceChannel);
    }

    const channel = this.supabase
      .channel(`presence:${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // 检查其他用户是否在线
        Object.keys(state).forEach((key) => {
          if (key !== userId) {
            callback(key, true);
          }
        });
      })
      .on('presence', { event: 'join' }, ({ key }: { key: string }) => {
        if (key !== userId) {
          callback(key, true);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        if (key !== userId) {
          callback(key, false);
        }
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId });
        }
      });

    this.presenceChannel = channel;

    return () => {
      if (this.presenceChannel) {
        this.supabase.removeChannel(this.presenceChannel);
        this.presenceChannel = null;
      }
    };
  }

  /**
   * 发送消息
   * Uses API endpoint to handle credit deduction atomically
   */
  async sendMessage(
    roomId: string,
    senderId: string,
    content: string,
    messageType: MessageType = 'text',
    metadata: Record<string, unknown> = {},
    replyToMessageId?: string
  ): Promise<Message | null> {
    // Get auth token
    const { data: { session } } = await this.supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Use API endpoint for message sending (handles credit deduction)
    const response = await fetch(`/api/messages/${roomId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        content,
        message_type: messageType,
        metadata,
        reply_to_message_id: replyToMessageId || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error || 'Failed to send message');
      // Attach error code for credit-related errors
      if (errorData.errorCode) {
        (error as any).errorCode = errorData.errorCode;
        (error as any).required = errorData.required;
      }
      throw error;
    }

    const result = await response.json();
    return result.message as Message;
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(roomId: string, userId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('mark_messages_as_read', {
      p_room_id: roomId,
      p_user_id: userId,
    });

    if (error) {
      console.error('标记已读失败:', error);
      throw error;
    }

    return data as number;
  }

  /**
   * 获取聊天室列表
   */
  async getChatRooms(userId: string): Promise<ChatRoomWithUser[]> {
    const { data, error } = await this.supabase.rpc('get_chat_rooms_for_user', {
      p_user_id: userId,
    });

    if (error) {
      console.error('获取聊天室列表失败:', error);
      throw error;
    }

    return (data || []).map((room: Record<string, unknown>) => ({
      id: room.room_id,
      match_id: room.match_id,
      last_message_content: room.last_message_content,
      last_message_type: room.last_message_type || 'text',
      last_message_at: room.last_message_at,
      unread_counts: {},
      typing_status: {},
      is_active: room.is_active,
      created_at: room.created_at,
      updated_at: room.created_at,
      other_user_id: room.other_user_id,
      other_user_username: room.other_user_username,
      other_user_avatar_url: room.other_user_avatar_url,
      other_user_gender: room.other_user_gender,
      other_user_last_active: room.other_user_last_active,
      unread_count: room.unread_count || 0,
    })) as ChatRoomWithUser[];
  }

  /**
   * 获取历史消息
   */
  async getMessages(
    roomId: string,
    limit: number = 20,
    beforeTimestamp?: string
  ): Promise<Message[]> {
    const { data, error } = await this.supabase.rpc('get_messages', {
      p_room_id: roomId,
      p_limit: limit,
      p_before_timestamp: beforeTimestamp || null,
    });

    if (error) {
      console.error('获取消息失败:', error);
      throw error;
    }

    return (data || []).map((msg: Record<string, unknown>) => ({
      id: msg.message_id,
      room_id: msg.room_id,
      sender_id: msg.sender_id,
      content: msg.content,
      message_type: msg.message_type || 'text',
      reply_to_message_id: msg.reply_to_message_id,
      metadata: msg.metadata || {},
      is_read: msg.is_read || false,
      read_at: msg.read_at,
      sent_at: msg.sent_at,
      deleted_at: msg.deleted_at,
      created_at: msg.sent_at,
      // 回复消息的附加信息
      reply_content: msg.reply_content,
      reply_sender_id: msg.reply_sender_id,
    })) as Message[];
  }

  /**
   * 撤回消息
   */
  async recallMessage(messageId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('recall_message', {
      p_message_id: messageId,
      p_user_id: userId,
    });

    if (error) {
      console.error('撤回消息失败:', error);
      throw error;
    }

    return data as boolean;
  }

  /**
   * 搜索消息
   */
  async searchMessages(
    roomId: string,
    keyword: string,
    limit: number = 20
  ): Promise<Message[]> {
    const { data, error } = await this.supabase.rpc('search_messages', {
      p_room_id: roomId,
      p_keyword: keyword,
      p_limit: limit,
    });

    if (error) {
      console.error('搜索消息失败:', error);
      throw error;
    }

    return (data || []) as Message[];
  }

  /**
   * 清空聊天记录
   * 软删除指定聊天室的所有消息
   */
  async clearMessages(roomId: string, userId: string): Promise<boolean> {
    // 软删除所有消息（设置 deleted_at）
    const { error } = await this.supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('room_id', roomId);

    if (error) {
      console.error('清空聊天记录失败:', error);
      throw error;
    }

    // 更新聊天室的最后消息信息
    await this.supabase
      .from('chat_rooms')
      .update({
        last_message_content: null,
        last_message_type: 'text',
        last_message_at: null,
      })
      .eq('id', roomId);

    return true;
  }

  /**
   * 删除对话
   * 将聊天室标记为非活跃状态
   */
  async deleteConversation(roomId: string, userId: string): Promise<boolean> {
    // 将聊天室标记为非活跃
    const { error } = await this.supabase
      .from('chat_rooms')
      .update({ is_active: false })
      .eq('id', roomId);

    if (error) {
      console.error('删除对话失败:', error);
      throw error;
    }

    return true;
  }

  /**
   * 获取或创建聊天室
   */
  async getOrCreateChatRoom(matchId: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('get_or_create_chat_room', {
      p_match_id: matchId,
    });

    if (error) {
      console.error('获取/创建聊天室失败:', error);
      throw error;
    }

    return data as string;
  }

  /**
   * 取消所有订阅
   */
  unsubscribeAll(): void {
    this.messageChannels.forEach((channel) => {
      this.supabase.removeChannel(channel);
    });
    this.messageChannels.clear();

    this.typingChannels.forEach((channel) => {
      this.supabase.removeChannel(channel);
    });
    this.typingChannels.clear();

    if (this.roomChannel) {
      this.supabase.removeChannel(this.roomChannel);
      this.roomChannel = null;
    }

    if (this.presenceChannel) {
      this.supabase.removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }
  }
}

// 导出单例
export const chatClient = new ChatRealtimeClient();

// 导出默认实例
export default chatClient;

