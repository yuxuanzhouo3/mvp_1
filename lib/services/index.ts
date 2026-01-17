/**
 * 服务层统一导出
 * Services Unified Exports
 * 
 * 根据部署环境自动选择对应的服务实现:
 * - CN 环境: 腾讯云 Cloudbase + 环信 IM + 微信支付/支付宝 + 通义千问
 * - INTL 环境: Supabase + Supabase Realtime + Stripe/PayPal + Mistral AI
 */

// 导出所有类型
export * from './database';
export * from './auth/types';
export * from './payment/types';
export * from './chat/types';

// 导出服务获取函数
export { getAuthService } from './auth';
export { getPaymentService } from './payment';
export { getChatService } from './chat';

// 导出 AI 服务
export { getAIService, getSystemPrompt } from '../ai';

// 导出部署配置
export {
  deploymentConfig,
  currentRegion,
  isChinaDeployment,
  isInternationalDeployment,
  getDefaultLanguage,
} from '../config/deployment.config';

// 服务实例缓存
import { isChinaDeployment } from '../config/deployment.config';
import type { IAuthService } from './auth/types';
import type { IPaymentService } from './payment/types';
import type { IChatService } from './chat/types';
import type { IAIService } from '../ai/types';

// 单例缓存
let authServiceInstance: IAuthService | null = null;
let paymentServiceInstance: IPaymentService | null = null;
let chatServiceInstance: IChatService | null = null;
let aiServiceInstance: IAIService | null = null;

/**
 * 获取认证服务（单例）
 */
export function getAuthServiceSingleton(): IAuthService {
  if (!authServiceInstance) {
    if (isChinaDeployment()) {
      const { CnAuthService } = require('./auth/cn-auth');
      authServiceInstance = new CnAuthService();
    } else {
      const { IntlAuthService } = require('./auth/intl-auth');
      authServiceInstance = new IntlAuthService();
    }
  }
  return authServiceInstance;
}

/**
 * 获取支付服务（单例）
 */
export function getPaymentServiceSingleton(): IPaymentService {
  if (!paymentServiceInstance) {
    if (isChinaDeployment()) {
      const { CnPaymentService } = require('./payment/cn-payment');
      paymentServiceInstance = new CnPaymentService();
    } else {
      const { IntlPaymentService } = require('./payment/intl-payment');
      paymentServiceInstance = new IntlPaymentService();
    }
  }
  return paymentServiceInstance;
}

/**
 * 获取聊天服务（单例）
 */
export function getChatServiceSingleton(): IChatService {
  if (!chatServiceInstance) {
    if (isChinaDeployment()) {
      const { CnChatService } = require('./chat/cn-chat');
      chatServiceInstance = new CnChatService();
    } else {
      const { IntlChatService } = require('./chat/intl-chat');
      chatServiceInstance = new IntlChatService();
    }
  }
  return chatServiceInstance;
}

/**
 * 获取 AI 服务（单例）
 */
export function getAIServiceSingleton(): IAIService {
  if (!aiServiceInstance) {
    if (isChinaDeployment()) {
      const { QwenAIService } = require('../ai/qwen-client');
      aiServiceInstance = new QwenAIService();
    } else {
      const { MistralAIService } = require('../ai/intl-mistral');
      aiServiceInstance = new MistralAIService();
    }
  }
  return aiServiceInstance;
}

/**
 * 重置所有服务实例（用于测试或环境切换）
 */
export function resetServiceInstances(): void {
  authServiceInstance = null;
  paymentServiceInstance = null;
  chatServiceInstance = null;
  aiServiceInstance = null;
}

/**
 * 服务配置摘要
 */
export interface ServiceConfigSummary {
  region: 'CN' | 'INTL';
  defaultLanguage: 'zh' | 'en';
  services: {
    database: 'cloudbase' | 'supabase';
    auth: 'cloudbase' | 'supabase';
    payment: 'wechat_alipay' | 'stripe_paypal';
    chat: 'easemob' | 'supabase_realtime';
    ai: 'qwen' | 'mistral';
  };
}

/**
 * 获取当前服务配置摘要
 */
export function getServiceConfigSummary(): ServiceConfigSummary {
  const isCN = isChinaDeployment();
  
  return {
    region: isCN ? 'CN' : 'INTL',
    defaultLanguage: isCN ? 'zh' : 'en',
    services: {
      database: isCN ? 'cloudbase' : 'supabase',
      auth: isCN ? 'cloudbase' : 'supabase',
      payment: isCN ? 'wechat_alipay' : 'stripe_paypal',
      chat: isCN ? 'easemob' : 'supabase_realtime',
      ai: isCN ? 'qwen' : 'mistral',
    },
  };
}

