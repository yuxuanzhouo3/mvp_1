/**
 * AI 助手 API - 统一入口
 * AI Assistant API - Unified Endpoint
 * 
 * 支持双环境:
 * - CN 环境: 通义千问 (qwen-turbo)
 * - INTL 环境: Mistral AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';
import { getAIService, getSystemPrompt } from '@/lib/ai';
import type { ChatMessage, AIChatSessionConfig } from '@/lib/ai/types';

// 统一认证函数
async function authenticateUser(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  try {
    const user = await requireUser(request);
    return { userId: user.userId, email: user.email };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      messages, 
      type = 'general_assistant',
      context,
      options,
    } = body as {
      messages: ChatMessage[];
      type?: 'chat_simulation' | 'personality_analysis' | 'general_assistant';
      context?: AIChatSessionConfig['targetUserProfile'];
      options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
      };
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    // 获取当前环境的 AI 服务
    const aiService = getAIService();
    const isCN = isChinaDeployment();

    console.log(`[AI Assistant] Using ${isCN ? 'Qwen' : 'Mistral'} AI service`);

    // 获取系统提示词
    const systemPrompt = getSystemPrompt(type, context ? {
      targetName: context.name,
      targetAge: context.age,
      targetGender: context.gender,
      targetInterests: context.interests,
      targetPersonality: context.personality,
      targetBio: context.bio,
    } : undefined);

    // 构建完整的消息列表
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // 调用 AI 服务
    const response = await aiService.chat(fullMessages, {
      model: options?.model,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 1500,
    });

    // 记录使用情况
    console.log(`[AI Assistant] Response generated, tokens used: ${response.tokensUsed}`);

    // TODO: 记录 AI 使用量到数据库用于限额控制

    return NextResponse.json({
      success: true,
      content: response.content,
      tokensUsed: response.tokensUsed,
      model: response.model || aiService.getDefaultModel(),
      region: isCN ? 'CN' : 'INTL',
    });
  } catch (error: any) {
    console.error('[AI Assistant] Error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'AI service error',
        errorCode: 'AI_SERVICE_ERROR',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // 返回当前 AI 服务信息
  const aiService = getAIService();
  const isCN = isChinaDeployment();

  return NextResponse.json({
    region: isCN ? 'CN' : 'INTL',
    provider: isCN ? 'Qwen (通义千问)' : 'Mistral AI',
    defaultModel: aiService.getDefaultModel(),
    availableModels: aiService.getAvailableModels(),
    defaultLanguage: isCN ? 'zh-CN' : 'en-US',
  });
}
