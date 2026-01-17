/**
 * 系统配置 API
 * System Configuration API
 * 
 * 返回当前部署环境的配置信息
 */

import { NextResponse } from 'next/server';
import { 
  deploymentConfig, 
  isChinaDeployment,
  getServiceConfigSummary,
} from '@/lib/services';
import { getAIService } from '@/lib/ai';
import { getPaymentService } from '@/lib/services/payment';
import { getAuthService } from '@/lib/services/auth';

export async function GET() {
  const isCN = isChinaDeployment();
  const serviceConfig = getServiceConfigSummary();
  
  // 获取各服务的可用配置
  const aiService = getAIService();
  const paymentService = getPaymentService();
  const authService = getAuthService();

  return NextResponse.json({
    // 基础配置
    deployment: {
      region: deploymentConfig.region,
      defaultLanguage: deploymentConfig.defaultLanguage,
      appName: deploymentConfig.appName,
      version: deploymentConfig.version,
    },

    // 服务配置摘要
    services: serviceConfig.services,

    // AI 服务
    ai: {
      provider: isCN ? 'qwen' : 'mistral',
      providerName: isCN ? '通义千问' : 'Mistral AI',
      defaultModel: aiService.getDefaultModel(),
      availableModels: aiService.getAvailableModels(),
    },

    // 支付服务
    payment: {
      availableMethods: paymentService.getAvailablePaymentMethods().map(m => ({
        id: m.id,
        name: m.name,
        currencies: m.currencies,
      })),
      creditPackages: paymentService.getCreditPackages().map(p => ({
        id: p.id,
        name: p.name,
        credits: p.credits,
        price: p.price,
        currency: p.currency,
      })),
    },

    // 认证服务
    auth: {
      oauthProviders: authService.getAvailableOAuthProviders(),
      features: {
        emailAuth: true,
        phoneAuth: isCN,
        wechatAuth: isCN,
        googleAuth: !isCN,
      },
    },

    // 聊天服务
    chat: {
      provider: isCN ? 'easemob' : 'supabase_realtime',
      providerName: isCN ? '环信 IM' : 'Supabase Realtime',
    },

    // 数据库服务
    database: {
      provider: isCN ? 'cloudbase' : 'supabase',
      providerName: isCN ? '腾讯云 Cloudbase' : 'Supabase',
    },

    // 国际化
    i18n: {
      defaultLocale: isCN ? 'zh-CN' : 'en-US',
      supportedLocales: ['zh-CN', 'en-US'],
      currencySymbol: isCN ? '¥' : '$',
      currencyCode: isCN ? 'CNY' : 'USD',
    },

    // 功能开关
    features: {
      aiChatSimulation: true,
      personalityAnalysis: true,
      marketValueScore: true,
      photoReview: true,
      membership: true,
      creditSystem: true,
    },
  });
}

