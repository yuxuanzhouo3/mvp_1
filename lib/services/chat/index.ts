/**
 * 聊天服务统一导出
 * Chat Service Unified Exports
 */

export * from './types';

// 根据环境获取聊天服务
import { isChinaDeployment } from '@/lib/config/deployment.config';
import type { IChatService } from './types';

// 缓存服务实例
let chatServiceInstance: IChatService | null = null;

/**
 * 获取当前环境的聊天服务
 * 使用动态导入避免在客户端加载服务器端代码
 */
export function getChatService(): IChatService {
  if (chatServiceInstance) {
    return chatServiceInstance;
  }

  if (isChinaDeployment()) {
    // CN 环境：使用环信 IM（同步导入，因为不依赖服务器端代码）
    const { CnChatService } = require('./cn-chat');
    chatServiceInstance = new CnChatService();
  } else {
    // INTL 环境：使用 Supabase Realtime
    // 注意：IntlChatService 依赖服务器端代码，只能在服务器端使用
    const { IntlChatService } = require('./intl-chat');
    chatServiceInstance = new IntlChatService();
  }

  return chatServiceInstance;
}

