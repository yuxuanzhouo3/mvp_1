/**
 * CN 环境聊天服务实现 (环信 IM)
 * CN Environment Chat Service Implementation (Easemob IM)
 * 
 * 环信 IM Web SDK 文档: https://docs-im-beta.easemob.com/document/web/overview.html
 */

import type {
  IChatService,
  ChatMessage,
  ChatRoom,
  ChatRoomWithUser,
  SendMessageRequest,
  SendMessageResponse,
  MessageCallbacks,
} from './types';

// 环信会话数据类型
interface EasemobConversation {
  conversationId: string;
  conversationType: string;
  isPinned: boolean;
  pinnedTime: number;
  lastMessage?: any;
  unreadCount: number;
  marks: string[];
}

interface EasemobConversationsResult {
  data?: {
    conversations: EasemobConversation[];
    cursor: string;
  };
}

// 环信 IM SDK 类型定义
interface EasemobConnection {
  open(options: { user: string; accessToken: string }): Promise<void>;
  close(): void;
  isOpened(): boolean;
  addEventHandler(id: string, handlers: any): void;
  removeEventHandler(id: string): void;
  // 消息相关
  send(message: any): Promise<any>;
  recallMessage(options: { mid: string; to: string; chatType: string }): Promise<void>;
  // 会话相关 - 使用新的 API
  getServerConversations(options: { pageSize?: number; cursor?: string; includeEmptyConversations?: boolean }): Promise<EasemobConversationsResult>;
  getHistoryMessages(options: any): Promise<any>;
  // 在线状态
  subscribePresence(options: any): Promise<void>;
  publishPresence(options: any): Promise<void>;
  getPresenceStatus?(options: { usernames: string[] }): Promise<any>;
  // 群组相关
  getGroupInfo(options: { groupId: string }): Promise<any>;
  getJoinedGroups(options: { pageNum: number; pageSize: number }): Promise<any>;
  createGroup(options: any): Promise<any>;
  destroyGroup(options: { groupId: string }): Promise<void>;
  leaveGroup(options: { groupId: string }): Promise<void>;
  joinGroup(options: { groupId: string; message?: string }): Promise<void>;
  inviteUsersToGroup(options: { groupId: string; users: string[] }): Promise<void>;
  removeGroupMember(options: { groupId: string; username: string }): Promise<void>;
  getGroupMembers(options: { groupId: string; pageNum: number; pageSize: number }): Promise<any>;
  modifyGroup(options: { groupId: string; groupName?: string; description?: string }): Promise<void>;
  // 消息同步
  getServerConversations(options?: { pageSize?: number; cursor?: string }): Promise<any>;
  deleteConversation(options: { channel: string; chatType: string; deleteRoam: boolean }): Promise<void>;
}

// 群组信息
interface GroupInfo {
  id: string;
  name: string;
  description?: string;
  owner: string;
  memberCount: number;
  maxUsers: number;
  public: boolean;
  allowInvites: boolean;
  createdAt: string;
}

interface EasemobMessage {
  create(options: any): any;
}

// 使用 any 类型以避免与实际 SDK 类型冲突
interface EasemobSDK {
  connection: any;
  message: EasemobMessage;
}

// 全局环信实例
let easemobSDK: EasemobSDK | null = null;
let easemobConnection: EasemobConnection | null = null;
// 服务端返回的 appKey（优先使用）
let serverAppKey: string | null = null;

// 禁用环信 SDK 日志输出
if (typeof window !== 'undefined') {
  const originalLog = console.log;
  const originalDebug = console.debug;
  const originalInfo = console.info;

  console.log = function(...args: any[]) {
    const message = args[0]?.toString() || '';
    if (message.includes('IM SDK') || message.includes('Easemob')) {
      return; // 过滤掉环信日志
    }
    return originalLog.apply(console, args);
  };

  console.debug = function(...args: any[]) {
    const message = args[0]?.toString() || '';
    if (message.includes('IM SDK') || message.includes('Easemob')) {
      return; // 过滤掉环信日志
    }
    return originalDebug.apply(console, args);
  };

  console.info = function(...args: any[]) {
    const message = args[0]?.toString() || '';
    if (message.includes('IM SDK') || message.includes('Easemob')) {
      return; // 过滤掉环信日志
    }
    return originalInfo.apply(console, args);
  };
}

function normalizePresenceStatus(status: any): boolean | null {
  if (typeof status === 'boolean') return status;
  if (typeof status === 'number') return status > 0;
  if (typeof status === 'string') {
    const value = status.trim().toLowerCase();
    const numericValue = Number(value);
    if (!Number.isNaN(numericValue) && value !== '') {
      return numericValue > 0;
    }
    if (['online', 'available', 'chat', 'busy', 'away', 'dnd', 'do_not_disturb'].includes(value)) {
      return true;
    }
    if (['offline', 'invisible', 'logout', 'disconnected'].includes(value)) {
      return false;
    }
  }
  return null;
}

function extractPresenceEntries(payload: any): Array<{ userId: string; isOnline: boolean }> {
  if (!payload) return [];

  const candidates: any[] = Array.isArray(payload)
    ? payload
    : payload?.data?.result ||
      payload?.result ||
      payload?.data ||
      payload?.presence ||
      payload?.userStatus ||
      [payload];

  const entries: Array<{ userId: string; isOnline: boolean }> = [];

  for (const item of candidates) {
    if (!item) continue;
    const userId = item.userId || item.uid || item.username || item.user || item.id;
    let normalized: boolean | null = null;

    const statusDetails = item.statusDetails || item.status_details;
    if (Array.isArray(statusDetails)) {
      const detailStatuses = statusDetails
        .map((detail: any) => normalizePresenceStatus(detail?.status ?? detail?.state ?? detail?.online))
        .filter((value: any): value is boolean => typeof value === 'boolean');
      if (detailStatuses.length > 0) {
        normalized = detailStatuses.some(Boolean);
      }
    }

    if (normalized === null) {
      const status = item.status ?? item.state ?? item.online ?? item.presence;
      if (status && typeof status === 'object' && !Array.isArray(status)) {
        const valueStatuses = Object.values(status)
          .map((value: any) => normalizePresenceStatus(value?.status ?? value?.state ?? value?.online ?? value))
          .filter((value: any): value is boolean => typeof value === 'boolean');
        if (valueStatuses.length > 0) {
          normalized = valueStatuses.some(Boolean);
        }
      } else {
        normalized = normalizePresenceStatus(status);
      }
    }

    if (userId && typeof normalized === 'boolean') {
      entries.push({ userId, isOnline: normalized });
    }
  }

  return entries;
}

/**
 * 初始化环信 SDK
 */
async function getEasemobSDK(): Promise<EasemobSDK> {
  if (easemobSDK) {
    return easemobSDK;
  }

  // 动态导入环信 SDK
  // @ts-ignore - 环信 SDK
  const websdk = await import('easemob-websdk');
  // 使用类型断言以避免类型冲突
  easemobSDK = (websdk.default || websdk) as EasemobSDK;

  // 禁用环信 SDK 日志 - 尝试多种方式
  // @ts-ignore
  if (easemobSDK.config) {
    // @ts-ignore
    easemobSDK.config.logger = false;
  }

  return easemobSDK;
}

/**
 * 获取环信连接实例
 * @param appKeyFromServer 从服务端 API 返回的 appKey（优先使用）
 */
async function getConnection(appKeyFromServer?: string): Promise<EasemobConnection> {
  // 如果提供了服务端 appKey，保存它
  if (appKeyFromServer) {
    serverAppKey = appKeyFromServer;
  }

  // 如果连接已存在，直接返回
  if (easemobConnection) {
    return easemobConnection;
  }

  // 优先使用服务端返回的 appKey，其次使用环境变量
  const appKey = serverAppKey || process.env.NEXT_PUBLIC_EASEMOB_APP_KEY;

  // 检查 appKey 是否有效（排除构建时的占位符）
  const isPlaceholder = !appKey || appKey === 'your_org#your_app_name';
  if (isPlaceholder) {
    throw new Error('Easemob appKey is not configured. Please check NEXT_PUBLIC_EASEMOB_APP_KEY or wait for server config.');
  }

  const sdk = await getEasemobSDK();

  easemobConnection = new sdk.connection({
    appKey,
    // 禁用环信 SDK 日志 - 尝试直接传 false 或 0
    // @ts-ignore
    logger: false,
  });

  return easemobConnection!;
}

/**
 * 转换环信消息到统一格式
 */
function convertEasemobMessage(msg: any, roomId: string): ChatMessage {
  let content = '';
  let type: ChatMessage['type'] = 'text';
  let metadata: ChatMessage['metadata'] = {};

  const ext = msg?.ext || msg?.body?.ext || msg?.payload?.ext || msg?.customExts || {};

  // 环信历史消息的 type 可能是数字或字符串
  const msgType = msg.type || msg.contentsType;

  switch (msgType) {
    case 'txt':
    case 'TEXT':
      content = msg.msg || msg.data || msg.body?.msg;
      type = 'text';
      break;
    case 'img':
    case 'IMAGE':
      content = '[图片]';
      type = 'image';
      // 优先使用扩展字段中的 Cloudbase URL
      const cloudbaseImgUrl = ext?.cloudbaseUrl;
      metadata = {
        imageUrl: cloudbaseImgUrl || msg.url || msg.body?.url || msg.thumb || msg.body?.thumb,
        thumbnailUrl: cloudbaseImgUrl || msg.thumb || msg.body?.thumb || msg.url || msg.body?.url,
        width: msg.width || msg.body?.width,
        height: msg.height || msg.body?.height,
      };
      break;
    case 'audio':
    case 'AUDIO':
      content = '[语音]';
      type = 'audio';
      // 优先使用扩展字段中的 Cloudbase URL
      const cloudbaseAudioUrl = ext?.cloudbaseUrl;
      metadata = {
        audioUrl: cloudbaseAudioUrl || msg.url || msg.body?.url,
        duration: ext?.duration || msg.length || msg.body?.length,
      };
      break;
    case 'video':
    case 'VIDEO':
      content = '[视频]';
      type = 'video';
      const cloudbaseVideoUrl = ext?.cloudbaseUrl;
      metadata = {
        videoUrl: cloudbaseVideoUrl || msg.url || msg.body?.url,
        thumbnailUrl: msg.thumb || msg.body?.thumb,
        cloudbaseFileId: ext?.cloudbaseFileId,
        cloudbasePath: ext?.cloudbasePath,
      };
      break;
    case 'loc':
    case 'LOCATION':
      content = '[位置]';
      type = 'location';
      metadata = {
        latitude: msg.lat || msg.body?.lat,
        longitude: msg.lng || msg.body?.lng,
        address: msg.addr || msg.body?.addr,
      };
      break;
    case 'file':
    case 'FILE':
      content = '[文件]';
      type = 'file';
      metadata = {
        fileUrl: msg.url || msg.body?.url,
        fileName: msg.filename || msg.body?.filename,
        fileSize: msg.file_length || msg.body?.file_length,
      };
      break;
    default:
      content = msg.msg || msg.data || msg.body?.msg || '';
  }

  return {
    id: msg.id || msg.mid,
    roomId,
    senderId: msg.from,
    content,
    type,
    metadata,
    status: msg.status || 'sent',
    createdAt: msg.time ? new Date(msg.time).toISOString() : new Date().toISOString(),
  };
}

/**
 * CN 聊天服务 - 基于环信 IM
 */
export class CnChatService implements IChatService {
  private currentUserId: string = '';
  private isInitialized: boolean = false;
  private eventHandlers: Map<string, MessageCallbacks> = new Map();
  private initPromise: Promise<{ success: boolean; error?: string }> | null = null;

  async initialize(userId: string): Promise<{ success: boolean; error?: string }> {
    // 如果已经初始化且是同一用户，直接返回成功
    if (this.isInitialized && this.currentUserId === userId) {
      return { success: true };
    }

    // 如果正在初始化同一用户，等待初始化完成
    if (this.initPromise && this.currentUserId === userId) {
      return this.initPromise;
    }

    // 开始新的初始化
    this.initPromise = this._initialize(userId);
    const result = await this.initPromise;
    this.initPromise = null; // 清除 Promise
    return result;
  }

  private async _initialize(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.currentUserId = userId;

      // 先获取环信 Token 和 appKey（需要从后端获取）
      const tokenResponse = await fetch('/api/chat/easemob-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text().catch(() => '');
        throw new Error(
          `Failed to get Easemob token (status ${tokenResponse.status})${errorText ? `: ${errorText}` : ''}`
        );
      }

      const { accessToken, appKey } = await tokenResponse.json();

      // 使用服务端返回的 appKey 获取连接
      const connection = await getConnection(appKey);

      // 检查连接是否已经打开
      if (connection.isOpened()) {
        // 设置全局消息处理器
        this.setupEventHandlers(connection);
        // 标记为已初始化
        this.isInitialized = true;
        return { success: true };
      }

      // 连接环信服务器
      await connection.open({
        user: userId,
        accessToken,
      });

      // 设置全局消息处理器
      this.setupEventHandlers(connection);

      // 标记为已初始化
      this.isInitialized = true;

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '聊天服务初始化失败',
      };
    }
  }

  private setupEventHandlers(connection: EasemobConnection): void {
    connection.addEventHandler('global', {
      // 收到文本消息
      onTextMessage: (msg: any) => {
        this.handleIncomingMessage(msg);
      },
      // 收到图片消息
      onImageMessage: (msg: any) => {
        this.handleIncomingMessage(msg);
      },
      // 收到语音消息
      onAudioMessage: (msg: any) => {
        this.handleIncomingMessage(msg);
      },
      // 收到视频消息
      onVideoMessage: (msg: any) => {
        this.handleIncomingMessage(msg);
      },
      // 收到位置消息
      onLocationMessage: (msg: any) => {
        this.handleIncomingMessage(msg);
      },
      // 收到文件消息
      onFileMessage: (msg: any) => {
        this.handleIncomingMessage(msg);
      },
      // 消息撤回
      onRecallMessage: (msg: any) => {
        const roomId = msg.from === this.currentUserId ? msg.to : msg.from;
        this.eventHandlers.forEach((callbacks) => {
          callbacks.onMessageRecalled?.(msg.mid, roomId);
        });
      },
      // 已读回执
      onReadMessage: (msg: any) => {
        const roomId = msg.from === this.currentUserId ? msg.to : msg.from;
        this.eventHandlers.forEach((callbacks) => {
          callbacks.onMessageRead?.(msg.mid, roomId);
        });
      },
      // CMD消息（用于输入状态）
      onCmdMessage: (msg: any) => {
        if (msg.action === 'typing_start' || msg.action === 'typing_stop') {
          const isTyping = msg.action === 'typing_start';
          this.eventHandlers.forEach((callbacks) => {
            callbacks.onTypingStatusChanged?.(msg.from, isTyping);
          });
        }
      },
      // 在线状态
      onPresenceStatusChange: (msg: any) => {
        const entries = extractPresenceEntries(msg);
        if (entries.length === 0) return;
        this.eventHandlers.forEach((callbacks) => {
          entries.forEach(({ userId, isOnline }) => {
            callbacks.onPresenceChanged?.(userId, isOnline);
          });
        });
      },
      // 错误处理
      onError: (error: any) => {
        this.eventHandlers.forEach((callbacks) => {
          callbacks.onError?.(new Error(error.message || 'Chat error'));
        });
      },
    });
  }

  private handleIncomingMessage(msg: any): void {
    const roomId = msg.from === this.currentUserId ? msg.to : msg.from;
    const message = convertEasemobMessage(msg, roomId);
    
    this.eventHandlers.forEach((callbacks) => {
      callbacks.onMessageReceived?.(message);
    });
  }

  async disconnect(): Promise<void> {
    const connection = await getConnection();
    connection.close();
    this.eventHandlers.clear();
  }

  async getChatRooms(userId: string): Promise<ChatRoomWithUser[]> {
    // 如果未初始化，先初始化
    if (!this.isInitialized) {
      const initResult = await this.initialize(userId);
      if (!initResult.success) {
        return [];
      }
    }

    try {
      const connection = await getConnection();

      // 并行获取 Easemob 会话和 CloudBase chat_rooms
      const [easemobResult, cloudbaseRooms] = await Promise.all([
        connection.getServerConversations({
          pageSize: 50,
          cursor: '',
          includeEmptyConversations: false,
        }),
        this.getCloudbaseChatRooms(userId),
      ]);

      const conversations = easemobResult.data?.conversations || [];

      // 转换 Easemob 会话为统一格式（过滤掉和自己的对话）
      const easemobRooms: ChatRoomWithUser[] = conversations
        .filter((conv) => conv.conversationType === 'singleChat' && conv.conversationId !== userId)
        .map((conv) => ({
          id: conv.conversationId,
          participants: [userId, conv.conversationId],
          lastMessage: conv.lastMessage
            ? {
                content: conv.lastMessage.msg || conv.lastMessage.data || '',
                type: conv.lastMessage.type === 'txt' ? 'text' : conv.lastMessage.type,
                senderId: conv.lastMessage.from,
                createdAt: new Date(conv.lastMessage.time).toISOString(),
              }
            : undefined,
          unreadCounts: { [userId]: conv.unreadCount || 0 },
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          otherUser: {
            id: conv.conversationId,
            username: conv.conversationId,
            avatarUrl: undefined,
          },
          myUnreadCount: conv.unreadCount || 0,
        }));

      // 合并 CloudBase 聊天室（添加 Easemob 中不存在的，过滤掉和自己的对话）
      const easemobUserIds = new Set(easemobRooms.map(r => r.otherUser?.id));
      const mergedRooms = [...easemobRooms];

      for (const cbRoom of cloudbaseRooms) {
        if (cbRoom.otherUser?.id && !easemobUserIds.has(cbRoom.otherUser.id) && cbRoom.otherUser.id !== userId) {
          mergedRooms.push(cbRoom);
        }
      }

      // 最终过滤：确保没有和自己的对话
      const filteredRooms = mergedRooms.filter(room => room.otherUser?.id !== userId);

      // 按更新时间排序（从早到晚）
      filteredRooms.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt || a.updatedAt || '';
        const timeB = b.lastMessage?.createdAt || b.updatedAt || '';
        return timeA.localeCompare(timeB);
      });

      return filteredRooms;
    } catch (error: any) {
      return [];
    }
  }

  /**
   * 从 CloudBase 获取 chat_rooms 数据（通过 API）
   */
  private async getCloudbaseChatRooms(userId: string): Promise<ChatRoomWithUser[]> {
    try {
      // 通过 API 获取 CloudBase 聊天室数据，避免在客户端导入服务端模块
      const response = await fetch('/api/chat/cn-rooms', {
        cache: 'no-store',
      });

      if (!response.ok) {
        return [];
      }

      const { rooms } = await response.json();

      // 转换为 ChatRoomWithUser 格式
      return (rooms || []).map((room: any) => ({
        id: room.id,
        matchId: room.matchId,
        participants: room.participants,
        lastMessage: undefined,
        unreadCounts: { [userId]: 0 },
        isActive: room.isActive,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        otherUser: room.otherUser,
        myUnreadCount: 0,
      }));
    } catch (error) {
      return [];
    }
  }

  async getChatRoom(roomId: string, userId: string): Promise<ChatRoomWithUser | null> {
    const rooms = await this.getChatRooms(userId);
    return rooms.find(room => room.id === roomId) || null;
  }

  async getOrCreateChatRoom(matchId: string, _userId: string): Promise<ChatRoom | null> {
    // 环信使用用户 ID 作为会话 ID，这里返回基本信息
    return {
      id: matchId,
      matchId,
      participants: [],
      unreadCounts: {},
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getMessages(roomId: string, options?: {
    limit?: number;
    beforeId?: string;
    afterId?: string;
  }): Promise<ChatMessage[]> {
    // 如果未初始化，先初始化
    if (!this.isInitialized && this.currentUserId) {
      const initResult = await this.initialize(this.currentUserId);
      if (!initResult.success) {
        return [];
      }
    }

    try {
      const connection = await getConnection();

      const result = await connection.getHistoryMessages({
        targetId: roomId,
        chatType: 'singleChat',
        pageSize: options?.limit || 20,
        cursor: options?.beforeId || '',
      });

      const messages = (result.messages || []).map((msg: any) => convertEasemobMessage(msg, roomId));
      // 按时间从早到晚排序
      messages.sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt));
      return messages;
    } catch (error: any) {
      return [];
    }
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      // 先扣减积分
      const creditsResponse = await fetch('/api/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'message',
        }),
      });

      if (!creditsResponse.ok) {
        const creditsData = await creditsResponse.json();
        return {
          success: false,
          error: creditsData.error || '积分不足',
        } as any;
      }

      const sdk = await getEasemobSDK();
      const connection = await getConnection();

      let msg: any;
      
      switch (request.type) {
        case 'text':
          msg = sdk.message.create({
            type: 'txt',
            chatType: 'singleChat',
            to: request.roomId,
            msg: request.content,
          });
          break;
        case 'image':
          msg = sdk.message.create({
            type: 'img',
            chatType: 'singleChat',
            to: request.roomId,
            url: request.metadata?.imageUrl,
            ext: { cloudbaseUrl: request.metadata?.imageUrl },
          });
          break;
        case 'audio':
          msg = sdk.message.create({
            type: 'audio',
            chatType: 'singleChat',
            to: request.roomId,
            url: request.metadata?.audioUrl,
            length: request.metadata?.duration,
            ext: { cloudbaseUrl: request.metadata?.audioUrl, duration: request.metadata?.duration },
          });
          break;
        case 'video':
          msg = sdk.message.create({
            type: 'video',
            chatType: 'singleChat',
            to: request.roomId,
            url: request.metadata?.videoUrl,
            length: request.metadata?.duration,
            ext: {
              cloudbaseUrl: request.metadata?.videoUrl,
              cloudbaseFileId: request.metadata?.cloudbaseFileId,
              cloudbasePath: request.metadata?.cloudbasePath,
              duration: request.metadata?.duration,
            },
          });
          break;
        case 'location':
          msg = sdk.message.create({
            type: 'loc',
            chatType: 'singleChat',
            to: request.roomId,
            lat: request.metadata?.latitude,
            lng: request.metadata?.longitude,
            addr: request.metadata?.address,
          });
          break;
        default:
          msg = sdk.message.create({
            type: 'txt',
            chatType: 'singleChat',
            to: request.roomId,
            msg: request.content,
          });
      }

      const result = await connection.send(msg);

      return {
        success: true,
        message: {
          id: result.serverMsgId,
          roomId: request.roomId,
          senderId: this.currentUserId,
          content: request.content,
          type: request.type,
          metadata: request.metadata,
          status: 'sent',
          createdAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '发送消息失败',
      };
    }
  }

  async recallMessage(messageId: string, roomId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await getConnection();
      
      await connection.recallMessage({
        mid: messageId,
        to: roomId,
        chatType: 'singleChat',
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '撤回消息失败',
      };
    }
  }

  async markAsRead(roomId: string, messageIds: string[]): Promise<void> {
    try {
      const connection = await getConnection();
      const sdk = await getEasemobSDK();

      for (const msgId of messageIds) {
        const readMsg = sdk.message.create({
          type: 'channel',
          chatType: 'singleChat',
          to: roomId,
          id: msgId,
        });
        await connection.send(readMsg);
      }
    } catch (error) {
      // Error handling silently
    }
  }

  async sendTypingStatus(roomId: string, isTyping: boolean): Promise<void> {
    try {
      const connection = await getConnection();
      const sdk = await getEasemobSDK();

      const cmdMsg = sdk.message.create({
        type: 'cmd',
        chatType: 'singleChat',
        to: roomId,
        action: isTyping ? 'typing_start' : 'typing_stop',
      });
      await connection.send(cmdMsg);
    } catch (error) {
      // Error handling silently
    }
  }

  subscribe(roomId: string, callbacks: MessageCallbacks): () => void {
    const handlerId = `room_${roomId}`;
    this.eventHandlers.set(handlerId, callbacks);

    return () => {
      this.eventHandlers.delete(handlerId);
    };
  }

  subscribeAll(userId: string, callbacks: MessageCallbacks): () => void {
    const handlerId = `user_${userId}`;
    this.eventHandlers.set(handlerId, callbacks);

    return () => {
      this.eventHandlers.delete(handlerId);
    };
  }

  async uploadMedia(roomId: string, file: File | Blob, type: 'image' | 'audio' | 'video' | 'file'): Promise<{
    success: boolean;
    url?: string;
    thumbnailUrl?: string;
    error?: string;
  }> {
    try {
      // 使用后端 API 上传文件
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roomId', roomId);
      formData.append('type', type);

      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      return {
        success: true,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '文件上传失败',
      };
    }
  }

  async updatePresence(isOnline: boolean): Promise<void> {
    try {
      const connection = await getConnection();
      await connection.publishPresence({
        description: isOnline ? 'online' : 'offline',
      });
    } catch (error) {
      // Error handling silently
    }
  }

  async getPresence(userIds: string[]): Promise<Record<string, boolean>> {
    try {
      const connection = await getConnection();
      await connection.subscribePresence({
        usernames: userIds,
        expiry: 7 * 24 * 3600, // 7 days
      });

      const presenceMap: Record<string, boolean> = {};
      const getPresenceStatus = (connection as EasemobConnection).getPresenceStatus;
      if (typeof getPresenceStatus === 'function') {
        const response = await getPresenceStatus.call(connection, { usernames: userIds });
        const entries = extractPresenceEntries(
          response?.data?.result || response?.result || response?.data || response
        );
        entries.forEach(({ userId, isOnline }) => {
          presenceMap[userId] = isOnline;
        });
      }

      return presenceMap;
    } catch (error) {
      return {};
    }
  }

  getClient(): EasemobConnection | null {
    return easemobConnection;
  }

  // ==================== 群聊功能 ====================

  /**
   * 创建群组
   */
  async createGroup(options: {
    name: string;
    description?: string;
    members?: string[];
    public?: boolean;
    allowInvites?: boolean;
    maxUsers?: number;
  }): Promise<{ success: boolean; groupId?: string; error?: string }> {
    try {
      const connection = await getConnection();
      
      const result = await connection.createGroup({
        data: {
          groupname: options.name,
          desc: options.description || '',
          members: options.members || [],
          public: options.public ?? false,
          allowinvites: options.allowInvites ?? true,
          maxusers: options.maxUsers || 200,
          invite_need_confirm: false, // 邀请不需要确认
        },
      });

      return {
        success: true,
        groupId: result.data?.groupid,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '创建群组失败',
      };
    }
  }

  /**
   * 获取群组信息
   */
  async getGroupInfo(groupId: string): Promise<GroupInfo | null> {
    try {
      const connection = await getConnection();
      const result = await connection.getGroupInfo({ groupId });
      
      const groupData = result.data?.[0];
      if (!groupData) return null;

      return {
        id: groupData.id,
        name: groupData.name,
        description: groupData.description,
        owner: groupData.owner,
        memberCount: groupData.affiliations_count || 0,
        maxUsers: groupData.maxusers || 200,
        public: groupData.public || false,
        allowInvites: groupData.allowinvites || true,
        createdAt: groupData.created || new Date().toISOString(),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取用户加入的群组列表
   */
  async getJoinedGroups(options?: { pageNum?: number; pageSize?: number }): Promise<GroupInfo[]> {
    try {
      const connection = await getConnection();
      const result = await connection.getJoinedGroups({
        pageNum: options?.pageNum || 1,
        pageSize: options?.pageSize || 20,
      });

      return (result.data || []).map((group: any) => ({
        id: group.groupid,
        name: group.groupname,
        description: group.description,
        owner: group.owner,
        memberCount: group.affiliations_count || 0,
        maxUsers: group.maxusers || 200,
        public: group.public || false,
        allowInvites: group.allowinvites || true,
        createdAt: group.created || new Date().toISOString(),
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * 邀请用户加入群组
   */
  async inviteToGroup(groupId: string, userIds: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await getConnection();
      await connection.inviteUsersToGroup({
        groupId,
        users: userIds,
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '邀请用户失败',
      };
    }
  }

  /**
   * 移除群成员
   */
  async removeFromGroup(groupId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await getConnection();
      await connection.removeGroupMember({
        groupId,
        username: userId,
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '移除成员失败',
      };
    }
  }

  /**
   * 退出群组
   */
  async leaveGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await getConnection();
      await connection.leaveGroup({ groupId });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '退出群组失败',
      };
    }
  }

  /**
   * 解散群组（仅群主）
   */
  async destroyGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await getConnection();
      await connection.destroyGroup({ groupId });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '解散群组失败',
      };
    }
  }

  /**
   * 获取群成员列表
   */
  async getGroupMembers(groupId: string, options?: { pageNum?: number; pageSize?: number }): Promise<{ 
    members: { id: string; role: 'owner' | 'admin' | 'member' }[];
    total: number;
  }> {
    try {
      const connection = await getConnection();
      const result = await connection.getGroupMembers({
        groupId,
        pageNum: options?.pageNum || 1,
        pageSize: options?.pageSize || 100,
      });

      const members = (result.data || []).map((member: any) => ({
        id: member.member || member.owner,
        role: member.owner ? 'owner' : (member.admin ? 'admin' : 'member'),
      }));

      return {
        members,
        total: result.count || members.length,
      };
    } catch (error) {
      return { members: [], total: 0 };
    }
  }

  /**
   * 发送群消息
   */
  async sendGroupMessage(request: SendMessageRequest & { groupId: string }): Promise<SendMessageResponse> {
    try {
      const sdk = await getEasemobSDK();
      const connection = await getConnection();

      let msg: any;
      
      switch (request.type) {
        case 'text':
          msg = sdk.message.create({
            type: 'txt',
            chatType: 'groupChat',
            to: request.groupId,
            msg: request.content,
          });
          break;
        case 'image':
          msg = sdk.message.create({
            type: 'img',
            chatType: 'groupChat',
            to: request.groupId,
            url: request.metadata?.imageUrl,
          });
          break;
        default:
          msg = sdk.message.create({
            type: 'txt',
            chatType: 'groupChat',
            to: request.groupId,
            msg: request.content,
          });
      }

      const result = await connection.send(msg);

      return {
        success: true,
        message: {
          id: result.serverMsgId,
          roomId: request.groupId,
          senderId: this.currentUserId,
          content: request.content,
          type: request.type,
          metadata: { ...request.metadata, isGroup: true },
          status: 'sent',
          createdAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '发送群消息失败',
      };
    }
  }

  /**
   * 获取群历史消息
   */
  async getGroupMessages(groupId: string, options?: {
    limit?: number;
    cursor?: string;
  }): Promise<{ messages: ChatMessage[]; cursor?: string }> {
    try {
      const connection = await getConnection();
      
      const result = await connection.getHistoryMessages({
        targetId: groupId,
        chatType: 'groupChat',
        pageSize: options?.limit || 20,
        cursor: options?.cursor || '',
      });

      const messages = (result.messages || []).map((msg: any) => 
        convertEasemobMessage(msg, groupId)
      );

      return {
        messages,
        cursor: result.cursor,
      };
    } catch (error) {
      return { messages: [] };
    }
  }

  // ==================== 消息同步功能 ====================

  /**
   * 同步服务器会话列表
   * 获取所有会话（包括单聊和群聊）
   */
  async syncConversations(options?: { pageSize?: number; cursor?: string }): Promise<{
    conversations: Array<{
      id: string;
      type: 'singleChat' | 'groupChat';
      unreadCount: number;
      lastMessage?: ChatMessage;
    }>;
    cursor?: string;
  }> {
    try {
      const connection = await getConnection();

      const result = await connection.getServerConversations({
        pageSize: options?.pageSize || 50,
        cursor: options?.cursor || '',
      });

      const conversations = (result.data?.conversations || []).map((conv: EasemobConversation) => ({
        id: conv.conversationId,
        type: (conv.conversationType as 'singleChat' | 'groupChat') || 'singleChat',
        unreadCount: conv.unreadCount || 0,
        lastMessage: conv.lastMessage ? convertEasemobMessage(conv.lastMessage, conv.conversationId) : undefined,
      }));

      return {
        conversations,
        cursor: result.data?.cursor,
      };
    } catch (error) {
      return { conversations: [] };
    }
  }

  /**
   * 同步指定会话的历史消息
   * @param conversationId 会话ID（用户ID或群组ID）
   * @param chatType 会话类型
   * @param options 分页选项
   */
  async syncMessages(
    conversationId: string,
    chatType: 'singleChat' | 'groupChat' = 'singleChat',
    options?: { limit?: number; startTime?: number; endTime?: number }
  ): Promise<ChatMessage[]> {
    try {
      const connection = await getConnection();
      
      const result = await connection.getHistoryMessages({
        targetId: conversationId,
        chatType,
        pageSize: options?.limit || 50,
        startTime: options?.startTime,
        endTime: options?.endTime,
        searchDirection: 'down', // 从旧到新
      });

      return (result.messages || []).map((msg: any) => 
        convertEasemobMessage(msg, conversationId)
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * 删除会话（可选是否删除漫游消息）
   */
  async deleteConversation(
    conversationId: string, 
    chatType: 'singleChat' | 'groupChat' = 'singleChat',
    deleteMessages: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const connection = await getConnection();
      
      await connection.deleteConversation({
        channel: conversationId,
        chatType,
        deleteRoam: deleteMessages,
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '删除会话失败',
      };
    }
  }

  /**
   * 设置消息已读（上报已读位置）
   */
  async reportRead(conversationId: string, messageId: string): Promise<void> {
    try {
      // 环信通过发送 channel ack 上报已读
      const sdk = await getEasemobSDK();
      const connection = await getConnection();
      
      const ackMsg = sdk.message.create({
        type: 'channel',
        chatType: 'singleChat',
        to: conversationId,
        mid: messageId,
      });

      await connection.send(ackMsg);
    } catch (error) {
      // Error handling silently
    }
  }
}

