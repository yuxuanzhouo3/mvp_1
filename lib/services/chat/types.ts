/**
 * 聊天服务接口类型定义
 * Chat Service Interface Types
 * 
 * 为 CN (环信 IM) 和 INTL (Supabase Realtime) 环境定义统一接口
 */

// 消息类型
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'location' | 'file' | 'custom';

// 消息状态
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

// 聊天消息
export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: MessageType;
  status?: MessageStatus;
  metadata?: {
    // 图片
    imageUrl?: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    // 音频
    audioUrl?: string;
    duration?: number;
    // 视频
    videoUrl?: string;
    cloudbaseFileId?: string;
    cloudbasePath?: string;
    // 位置
    latitude?: number;
    longitude?: number;
    address?: string;
    // 文件
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    // 自定义
    [key: string]: any;
  };
  replyToMessageId?: string;
  isRecalled?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// 聊天室
export interface ChatRoom {
  id: string;
  matchId?: string;
  participants: string[];
  lastMessage?: {
    content: string;
    type: MessageType;
    senderId: string;
    createdAt: string;
  };
  unreadCounts: Record<string, number>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 聊天室详情（含用户信息）
export interface ChatRoomWithUser extends ChatRoom {
  otherUser: {
    id: string;
    username: string;
    avatarUrl?: string;
    email?: string;
    gender?: string;
    isOnline?: boolean;
    lastActiveAt?: string;
  };
  myUnreadCount: number;
}

// 发送消息请求
export interface SendMessageRequest {
  roomId: string;
  content: string;
  type: MessageType;
  metadata?: ChatMessage['metadata'];
  replyToMessageId?: string;
}

// 发送消息响应
export interface SendMessageResponse {
  success: boolean;
  message?: ChatMessage;
  error?: string;
}

// 消息事件回调
export interface MessageCallbacks {
  onMessageReceived?: (message: ChatMessage) => void;
  onMessageUpdated?: (message: ChatMessage) => void;
  onMessageRecalled?: (messageId: string, roomId: string) => void;
  onMessageRead?: (messageId: string, roomId: string) => void;
  onTypingStatusChanged?: (userId: string, isTyping: boolean) => void;
  onPresenceChanged?: (userId: string, isOnline: boolean) => void;
  onError?: (error: Error) => void;
}

// 聊天服务接口
export interface IChatService {
  /**
   * 初始化聊天服务（连接服务器）
   */
  initialize(userId: string): Promise<{ success: boolean; error?: string }>;

  /**
   * 断开连接
   */
  disconnect(): Promise<void>;

  /**
   * 获取聊天室列表
   */
  getChatRooms(userId: string): Promise<ChatRoomWithUser[]>;

  /**
   * 获取单个聊天室
   */
  getChatRoom(roomId: string, userId: string): Promise<ChatRoomWithUser | null>;

  /**
   * 创建或获取聊天室
   */
  getOrCreateChatRoom(matchId: string, userId: string): Promise<ChatRoom | null>;

  /**
   * 获取聊天历史
   */
  getMessages(roomId: string, options?: {
    limit?: number;
    beforeId?: string;
    afterId?: string;
  }): Promise<ChatMessage[]>;

  /**
   * 发送消息
   */
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;

  /**
   * 撤回消息
   */
  recallMessage(messageId: string, roomId: string): Promise<{ success: boolean; error?: string }>;

  /**
   * 标记消息已读
   */
  markAsRead(roomId: string, messageIds: string[]): Promise<void>;

  /**
   * 发送正在输入状态
   */
  sendTypingStatus(roomId: string, isTyping: boolean): Promise<void>;

  /**
   * 订阅消息事件
   */
  subscribe(roomId: string, callbacks: MessageCallbacks): () => void;

  /**
   * 订阅所有聊天室的消息
   */
  subscribeAll(userId: string, callbacks: MessageCallbacks): () => void;

  /**
   * 上传聊天媒体文件
   */
  uploadMedia(roomId: string, file: File | Blob, type: 'image' | 'audio' | 'video' | 'file'): Promise<{
    success: boolean;
    url?: string;
    thumbnailUrl?: string;
    error?: string;
  }>;

  /**
   * 更新在线状态
   */
  updatePresence(isOnline: boolean): Promise<void>;

  /**
   * 获取用户在线状态
   */
  getPresence(userIds: string[]): Promise<Record<string, boolean>>;
}

