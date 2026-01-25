/**
 * AI 助手 API - 统一入口
 * AI Assistant API - Unified Endpoint
 * 
 * 支持双环境:
 * - CN 环境: 通义千问 (qwen-turbo)
 * - INTL 环境: Mistral AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/requireUser';
import { getAIServiceForRegion, getSystemPromptForRegion } from '@/lib/ai';
import { getDeploymentRegionFromRequest } from '@/lib/config/request-region';
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
      message,
      chatHistory,
      language,
      targetUserName,
    } = body as any;

    const legacyHistoryMessages =
      Array.isArray(chatHistory)
        ? chatHistory
            .map((item: any) => ({
              role: item?.isOwn ? 'user' : 'assistant',
              content: item?.content,
            }))
            .filter((m: any) => typeof m.content === 'string' && m.content.trim().length > 0)
        : [];

    const legacyInstruction =
      typeof message === 'string' && message.trim().length > 0
        ? (language === 'zh'
            ? `请根据以上聊天上下文，分析对方最后这句消息，并给出 3 条自然、礼貌且不冒犯的中文回复建议：\n对方消息：“${message}”`
            : `Based on the chat context above, analyze the other person's last message and give 3 natural, polite reply suggestions in English:\nTheir message: "${message}"`)
        : null;

    const normalizedMessages: ChatMessage[] =
      Array.isArray(messages) && messages.length > 0
        ? messages
        : legacyInstruction
          ? [...legacyHistoryMessages, { role: 'user', content: legacyInstruction }]
          : [];

    const normalizedContext: AIChatSessionConfig['targetUserProfile'] | undefined =
      context || (targetUserName ? { name: targetUserName } : undefined);

    if (!normalizedMessages || normalizedMessages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    const region = getDeploymentRegionFromRequest(request);
    const aiService = getAIServiceForRegion(region);
    const isCN = region === 'CN';

    console.log(`[AI Assistant] Using ${isCN ? 'Qwen' : 'Mistral'} AI service`);

    // 获取系统提示词
    const systemPrompt = getSystemPromptForRegion(region, type, normalizedContext ? {
      targetName: normalizedContext.name,
      targetAge: normalizedContext.age,
      targetGender: normalizedContext.gender,
      targetInterests: normalizedContext.interests,
      targetPersonality: normalizedContext.personality,
      targetBio: normalizedContext.bio,
    } : undefined);

    // 构建完整的消息列表
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...normalizedMessages,
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
      analysis: response.content,
      tokensUsed: response.tokensUsed,
      tokens_used: response.tokensUsed,
      model: response.model || aiService.getDefaultModel(),
      region,
    });
  } catch (error: any) {
    console.error('[AI Assistant] Error:', error);
    const message = error?.message ? String(error.message) : 'AI service error';
    const upper = message.toUpperCase();
    let errorCode = 'AI_SERVICE_ERROR';
    if (upper.includes('MISTRAL_API_KEY')) errorCode = 'MISSING_MISTRAL_API_KEY';
    if (upper.includes('DASHSCOPE_API_KEY')) errorCode = 'MISSING_DASHSCOPE_API_KEY';

    return NextResponse.json(
      { 
        error: message,
        errorCode,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // 返回当前 AI 服务信息
  const region = getDeploymentRegionFromRequest(request);
  const aiService = getAIServiceForRegion(region);
  const isCN = region === 'CN';

  return NextResponse.json({
    region,
    provider: isCN ? 'Qwen (通义千问)' : 'Mistral AI',
    defaultModel: aiService.getDefaultModel(),
    availableModels: aiService.getAvailableModels(),
    defaultLanguage: isCN ? 'zh-CN' : 'en-US',
  });
}
