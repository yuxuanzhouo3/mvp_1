/**
 * INTL 环境聊天服务实现 (Supabase Realtime)
 * INTL Environment Chat Service Implementation
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import type {
  IChatService,
  ChatMessage,
  ChatRoom,
  ChatRoomWithUser,
  SendMessageRequest,
  SendMessageResponse,
  MessageCallbacks,
  MessageType,
} from './types';

/**
 * 转换数据库消息类型到统一格式
 */
function convertMessageType(dbType: string): MessageType {
  switch (dbType) {
    case 'text': return 'text';
    case 'image': return 'image';
    case 'audio': return 'audio';
    case 'video': return 'video';
    case 'location': return 'location';
    case 'file': return 'file';
    default: return 'text';
  }
}

/**
 * INTL 聊天服务 - 基于 Supabase Realtime
 */
export class IntlChatService implements IChatService {
  private currentUserId: string = '';
  private subscriptions: Map<string, () => void> = new Map();

  getClient() {
    return getSupabaseClient();
  }

  async initialize(userId: string): Promise<{ success: boolean; error?: string }> {
    this.currentUserId = userId;
    return { success: true };
  }

  async disconnect(): Promise<void> {
    // 取消所有订阅
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();
  }

  async getChatRooms(userId: string): Promise<ChatRoomWithUser[]> {
    const supabase = this.getClient();

    // 调用数据库函数获取用户的聊天室
    const { data, error } = await supabase
      .rpc('get_chat_rooms_for_user', { p_user_id: userId });

    if (error) {
      console.error('[Supabase Chat] Get rooms failed:', error);
      return [];
    }

    return (data || []).map((room: any) => ({
      id: room.id,
      matchId: room.match_id,
      participants: [userId, room.other_user_id],
      lastMessage: room.last_message_content ? {
        content: room.last_message_content,
        type: convertMessageType(room.last_message_type),
        senderId: '',
        createdAt: room.last_message_at,
      } : undefined,
      unreadCounts: room.unread_counts || {},
      isActive: room.is_active,
      createdAt: room.created_at,
      updatedAt: room.updated_at,
      otherUser: {
        id: room.other_user_id,
        username: room.other_user_username || 'Unknown',
        avatarUrl: room.other_user_avatar_url,
        gender: room.other_user_gender,
        isOnline: false, // 需要单独查询
        lastActiveAt: room.other_user_last_active,
      },
      myUnreadCount: room.unread_count || 0,
    }));
  }

  async getChatRoom(roomId: string, userId: string): Promise<ChatRoomWithUser | null> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .rpc('get_chat_room_for_user', { p_room_id: roomId, p_user_id: userId });

    if (error || !data || data.length === 0) {
      return null;
    }

    const room = data[0];
    return {
      id: room.id,
      matchId: room.match_id,
      participants: [userId, room.other_user_id],
      lastMessage: room.last_message_content ? {
        content: room.last_message_content,
        type: convertMessageType(room.last_message_type),
        senderId: '',
        createdAt: room.last_message_at,
      } : undefined,
      unreadCounts: room.unread_counts || {},
      isActive: room.is_active,
      createdAt: room.created_at,
      updatedAt: room.updated_at,
      otherUser: {
        id: room.other_user_id,
        username: room.other_user_username || 'Unknown',
        avatarUrl: room.other_user_avatar_url,
        gender: room.other_user_gender,
        lastActiveAt: room.other_user_last_active,
      },
      myUnreadCount: room.unread_count || 0,
    };
  }

  async getOrCreateChatRoom(matchId: string, _userId: string): Promise<ChatRoom | null> {
    const supabase = this.getClient();

    // 先尝试获取现有聊天室
    const { data: existing } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('match_id', matchId)
      .single();

    if (existing) {
      return {
        id: existing.id,
        matchId: existing.match_id,
        participants: [],
        unreadCounts: existing.unread_counts || {},
        isActive: existing.is_active,
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      };
    }

    // 创建新聊天室
    const { data: newRoom, error } = await supabase
      .from('chat_rooms')
      .insert({
        match_id: matchId,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase Chat] Create room failed:', error);
      return null;
    }

    return {
      id: newRoom.id,
      matchId: newRoom.match_id,
      participants: [],
      unreadCounts: {},
      isActive: true,
      createdAt: newRoom.created_at,
      updatedAt: newRoom.updated_at,
    };
  }

  async getMessages(roomId: string, options?: {
    limit?: number;
    beforeId?: string;
    afterId?: string;
  }): Promise<ChatMessage[]> {
    const supabase = this.getClient();
    
    let query = supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .is('deleted_at', null)
      .order('sent_at', { ascending: false })
      .limit(options?.limit || 50);

    if (options?.beforeId) {
      const { data: beforeMsg } = await supabase
        .from('messages')
        .select('sent_at')
        .eq('id', options.beforeId)
        .single();
      
      if (beforeMsg) {
        query = query.lt('sent_at', beforeMsg.sent_at);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase Chat] Get messages failed:', error);
      return [];
    }

    return (data || []).reverse().map((msg: any) => ({
      id: msg.id,
      roomId: msg.room_id,
      senderId: msg.sender_id,
      content: msg.content || '',
      type: convertMessageType(msg.message_type),
      metadata: msg.metadata || {},
      status: msg.is_read ? 'read' : 'sent',
      replyToMessageId: msg.reply_to_message_id,
      isRecalled: !!msg.deleted_at,
      createdAt: msg.sent_at || msg.created_at,
    }));
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: request.roomId,
        sender_id: this.currentUserId,
        content: request.content,
        message_type: request.type,
        metadata: request.metadata || {},
        reply_to_message_id: request.replyToMessageId,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase Chat] Send message failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message',
      };
    }

    // 更新聊天室最后消息
    await supabase
      .from('chat_rooms')
      .update({
        last_message_content: request.content,
        last_message_type: request.type,
        last_message_at: data.sent_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.roomId);

    return {
      success: true,
      message: {
        id: data.id,
        roomId: data.room_id,
        senderId: data.sender_id,
        content: data.content,
        type: convertMessageType(data.message_type),
        metadata: data.metadata,
        status: 'sent',
        createdAt: data.sent_at,
      },
    };
  }

  async recallMessage(messageId: string, _roomId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getClient();

    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', this.currentUserId);

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to recall message',
      };
    }

    return { success: true };
  }

  async markAsRead(roomId: string, messageIds: string[]): Promise<void> {
    const supabase = this.getClient();

    await supabase
      .from('messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .in('id', messageIds);

    // 更新未读计数
    await supabase.rpc('update_unread_count', {
      p_room_id: roomId,
      p_user_id: this.currentUserId,
      p_count: 0,
    });
  }

  async sendTypingStatus(roomId: string, isTyping: boolean): Promise<void> {
    const supabase = this.getClient();
    
    // 使用 Realtime broadcast 发送输入状态
    const channel = supabase.channel(`room:${roomId}`);
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: this.currentUserId,
        isTyping,
      },
    });
  }

  subscribe(roomId: string, callbacks: MessageCallbacks): () => void {
    const supabase = this.getClient();

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          const msg = payload.new;
          callbacks.onMessageReceived?.({
            id: msg.id,
            roomId: msg.room_id,
            senderId: msg.sender_id,
            content: msg.content,
            type: convertMessageType(msg.message_type),
            metadata: msg.metadata,
            status: 'sent',
            createdAt: msg.sent_at,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          const msg = payload.new;
          if (msg.deleted_at) {
            callbacks.onMessageRecalled?.(msg.id, roomId);
          } else {
            callbacks.onMessageUpdated?.({
              id: msg.id,
              roomId: msg.room_id,
              senderId: msg.sender_id,
              content: msg.content,
              type: convertMessageType(msg.message_type),
              metadata: msg.metadata,
              status: msg.is_read ? 'read' : 'sent',
              createdAt: msg.sent_at,
            });
          }
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        if (payload.userId !== this.currentUserId) {
          callbacks.onTypingStatusChanged?.(roomId, payload.userId);
        }
      })
      .subscribe();

    const unsubscribe = () => {
      supabase.removeChannel(channel);
    };

    this.subscriptions.set(`room:${roomId}`, unsubscribe);
    return unsubscribe;
  }

  subscribeAll(userId: string, callbacks: MessageCallbacks): () => void {
    // 订阅用户所有相关的消息变更
    const supabase = this.getClient();

    const channel = supabase
      .channel(`user:${userId}:messages`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        async (payload: any) => {
          // 验证消息是否属于用户的聊天室
          const msg = payload.new || payload.old;
          if (!msg) return;

          if (payload.eventType === 'INSERT') {
            callbacks.onMessageReceived?.({
              id: msg.id,
              roomId: msg.room_id,
              senderId: msg.sender_id,
              content: msg.content,
              type: convertMessageType(msg.message_type),
              metadata: msg.metadata,
              status: 'sent',
              createdAt: msg.sent_at,
            });
          }
        }
      )
      .subscribe();

    const unsubscribe = () => {
      supabase.removeChannel(channel);
    };

    this.subscriptions.set(`user:${userId}`, unsubscribe);
    return unsubscribe;
  }

  async uploadMedia(_roomId: string, file: File | Blob, type: 'image' | 'audio' | 'video' | 'file'): Promise<{
    success: boolean;
    url?: string;
    thumbnailUrl?: string;
    error?: string;
  }> {
    const supabase = this.getClient();
    
    const bucket = type === 'image' ? 'chat-images' : 
                   type === 'audio' ? 'chat-audio' :
                   type === 'video' ? 'chat-video' : 'chat-files';
    
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) {
      return {
        success: false,
        error: error.message || 'Upload failed',
      };
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  }

  async updatePresence(isOnline: boolean): Promise<void> {
    const supabase = this.getClient();
    
    await supabase
      .from('users')
      .update({
        last_active_at: isOnline ? new Date().toISOString() : null,
      })
      .eq('id', this.currentUserId);
  }

  async getPresence(userIds: string[]): Promise<Record<string, boolean>> {
    const supabase = this.getClient();
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data } = await supabase
      .from('users')
      .select('id, last_active_at')
      .in('id', userIds);

    const presence: Record<string, boolean> = {};
    (data || []).forEach((user: any) => {
      presence[user.id] = user.last_active_at && user.last_active_at > fiveMinutesAgo;
    });

    return presence;
  }
}

