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
import { createClient } from '@supabase/supabase-js';
import { getAIService } from '@/lib/ai';

// 统一认证函数
async function authenticateUser(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization');

  if (isChinaDeployment()) {
    // CN 环境
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    // CN 环境: 支持 cn_ 前缀的用户 ID token
    if (token.startsWith('cn_')) {
      const userId = token.substring(3);
      if (userId) {
        return { userId };
      }
    }
    // 从 token 中解析用户信息 (JWT)
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return {
        userId: payload.sub || payload.uid,
        email: payload.email,
      };
    } catch {
      return null;
    }
  } else {
    // INTL 环境: 使用 Supabase 验证 token
    const db = await getDbClient();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) {
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (url && key) {
            const anonClient = createClient(url, key, {
              auth: { autoRefreshToken: false, persistSession: false }
            });
            const { data: { user: tokenUser }, error: tokenError } = await anonClient.auth.getUser(token);
            if (!tokenError && tokenUser) {
              return { userId: tokenUser.id, email: tokenUser.email };
            }
          }
        } catch {}
      }
      return null;
    }
    return { userId: user.id, email: user.email };
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
      .select('user_id, target_user_id, ended_at')
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

    // 获取历史消息
    const { data: historyMessages } = await db
      .from('ai_chat_messages')
      .select('role, content')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true })
      .limit(20);

    // 保存用户消息
    await db
      .from('ai_chat_messages')
      .insert({
        session_id: session_id,
        role: 'user',
        content: message,
      });

    // 构建 AI 提示
    const aiService = getAIService();
    const systemPrompt = buildSystemPrompt(targetProfile, isCN);
    
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(historyMessages || []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // 调用 AI 服务
    const aiResponse = await aiService.chat(messages, {
      temperature: 0.8,
      maxTokens: 300,
    });

    // 保存 AI 回复
    await db
      .from('ai_chat_messages')
      .insert({
        session_id: session_id,
        role: 'assistant',
        content: aiResponse.content,
      });

    return NextResponse.json({
      success: true,
      ai_reply: aiResponse.content,
      tokens_used: aiResponse.tokensUsed,
      message_count: (historyMessages?.length || 0) + 2,
      show_reminder: ((historyMessages?.length || 0) + 2) % 5 === 0,
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
