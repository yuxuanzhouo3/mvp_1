/**
 * AI 聊天模拟 - 发送消息
 * POST /api/ai/chat/message - 发送消息并获取 AI 回复
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase + 通义千问
 * - INTL 环境: Supabase + Mistral AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';
import { getAIService } from '@/lib/ai';
import { insertAiUsageLog } from '@/lib/ai/usage';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDbClient();
    const isCN = isChinaDeployment();

    const { session_id, message } = await request.json();
    if (!session_id || !message) {
      return NextResponse.json({ error: 'session_id and message required' }, { status: 400 });
    }

    // 验证会话所有权
    const { data: chatSession } = await db
      .from('ai_chat_sessions')
      .select('id, user_id, target_user_id, ended_at, messages, token_usage, model_used')
      .eq('id', session_id)
      .single();

    if (!chatSession || chatSession.user_id !== authUser.userId) {
      return NextResponse.json({ error: isCN ? '会话不存在' : 'Session not found' }, { status: 404 });
    }

    if (chatSession.ended_at) {
      return NextResponse.json({ error: isCN ? '会话已结束' : 'Session has ended' }, { status: 400 });
    }

    // 获取目标用户资料
    const { data: targetProfile } = await db
      .from('v_user_full_profile')
      .select('*')
      .eq('id', chatSession.target_user_id)
      .single();

    const existingMessages = Array.isArray(chatSession.messages) ? chatSession.messages : [];
    const history = existingMessages
      .filter((m: any) => m && typeof m === 'object')
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content : '',
      }))
      .filter((m: any) => typeof m.content === 'string' && m.content.trim().length > 0)
      .slice(-20);

    // 构建 AI 提示
    const aiService = getAIService();
    const systemPrompt = buildSystemPrompt(targetProfile, isCN);
    
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // 调用 AI 服务
    const aiResponse = await aiService.chat(messages, {
      model: chatSession.model_used || undefined,
      temperature: 0.8,
      maxTokens: 300,
    });

    const nowIso = new Date().toISOString();
    const tokensUsed = typeof aiResponse?.tokensUsed === 'number' && Number.isFinite(aiResponse.tokensUsed) ? aiResponse.tokensUsed : 0;

    const updatedMessages = [
      ...history,
      { role: 'user', content: String(message) },
      { role: 'assistant', content: aiResponse.content },
    ].slice(-20);

    const currentTokenUsage = typeof chatSession.token_usage === 'number' ? chatSession.token_usage : 0;
    const nextTokenUsage = currentTokenUsage + tokensUsed;

    await insertAiUsageLog(db, {
      user_id: authUser.userId,
      feature: 'chat',
      tokens_used: tokensUsed,
      created_at: nowIso,
    });

    await db
      .from('ai_chat_sessions')
      .update({
        messages: updatedMessages,
        token_usage: nextTokenUsage,
      })
      .eq('id', session_id)
      .eq('user_id', authUser.userId);

    const messageCount = updatedMessages.length;
    return NextResponse.json({
      success: true,
      ai_reply: aiResponse.content,
      tokens_used: tokensUsed,
      message_count: messageCount,
      show_reminder: messageCount % 5 === 0,
      region: isCN ? 'CN' : 'INTL',
    });
  } catch (error: any) {
    console.error('[AI Chat Message] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function buildSystemPrompt(targetProfile: any, isCN: boolean): string {
  if (isCN) {
    return `你正在模拟用户 ${targetProfile?.username || '某用户'} 与人聊天。

用户资料：
- 简介：${targetProfile?.bio || '暂无'}
- 性别：${targetProfile?.gender === 'male' ? '男' : targetProfile?.gender === 'female' ? '女' : '未知'}
- 职业：${targetProfile?.occupation || '暂无'}
- MBTI：${targetProfile?.mbti || '暂无'}

请根据以上资料模拟该用户的说话风格和性格特点。
回复要简洁自然，像真实聊天一样。
不要透露你是 AI。`;
  }

  return `You are simulating user ${targetProfile?.username || 'a user'} in a chat conversation.

User profile:
- Bio: ${targetProfile?.bio || 'N/A'}
- Gender: ${targetProfile?.gender || 'Unknown'}
- Occupation: ${targetProfile?.occupation || 'N/A'}
- MBTI: ${targetProfile?.mbti || 'N/A'}

Simulate their speaking style and personality based on this profile.
Keep responses natural and conversational.
Do not reveal that you are an AI.`;
}
