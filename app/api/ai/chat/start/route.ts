/**
 * AI 聊天模拟 - 开始会话
 * POST /api/ai/chat/start - 开始 AI 聊天模拟会话
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase + 通义千问
 * - INTL 环境: Supabase + Mistral AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';
import { getAIService } from '@/lib/ai';
import { checkAiUsageLimit, deductAiUsage } from '@/lib/ai/usage';

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

    const { target_user_id } = await request.json();
    if (!target_user_id) {
      return NextResponse.json({ error: 'target_user_id required' }, { status: 400 });
    }

    // 检查目标用户授权 (CN 环境跳过检查)
    if (!isCN) {
      const { data: targetProfile } = await db
        .from('user_profiles')
        .select('ai_chat_consent')
        .eq('user_id', target_user_id)
        .single();

      if (!targetProfile?.ai_chat_consent) {
        return NextResponse.json({
          error: isCN ? '目标用户未授权AI聊天模拟' : 'Target user has not consented to AI chat simulation',
          consent_required: true,
        }, { status: 403 });
      }
    }

    const limitCheck = await checkAiUsageLimit(db, authUser.userId, 'chat');
    if (limitCheck && !limitCheck.allowed) {
      return NextResponse.json(
        {
          error: isCN ? '已达到聊天限额' : 'Chat limit reached',
          current: limitCheck.current,
          limit: limitCheck.limit,
          isVip: limitCheck.is_vip,
        },
        { status: 429 }
      );
    }

    // 获取目标用户资料用于 AI 模拟
    const { data: targetUserProfile } = await db
      .from('v_user_full_profile')
      .select('*')
      .eq('id', target_user_id)
      .single();

    if (!targetUserProfile) {
      return NextResponse.json({
        error: isCN ? '目标用户不存在' : 'Target user not found',
      }, { status: 404 });
    }

    const aiService = getAIService();
    const nowIso = new Date().toISOString();
    const isVip = !!limitCheck?.is_vip;

    // 创建会话记录
    const { data: session, error: sessionError } = await db
      .from('ai_chat_sessions')
      .insert({
        user_id: authUser.userId,
        target_user_id: target_user_id,
        session_type: isVip ? 'vip_unlimited' : 'free_trial',
        model_used: aiService.getDefaultModel(),
        messages: [],
        token_usage: 0,
        target_user_consent: !isCN,
        created_at: nowIso,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating AI chat session:', sessionError);
      return NextResponse.json({
        error: isCN ? '创建会话失败' : 'Failed to create session',
      }, { status: 500 });
    }

    await deductAiUsage(db, authUser.userId, 'chat');

    // 生成初始 AI 消息
    const initialMessage = await generateInitialMessage(aiService, targetUserProfile, isCN);

    return NextResponse.json({
      success: true,
      session_id: session.id,
      target_user: {
        id: targetUserProfile.id,
        username: targetUserProfile.username || targetUserProfile.full_name,
        avatar_url: targetUserProfile.avatar_url,
        bio: targetUserProfile.bio,
      },
      initial_message: initialMessage,
      disclaimer: {
        zh: '⚠️ AI模拟对话声明\n\n此功能使用AI模拟目标用户的对话风格，仅供练习参考。',
        en: '⚠️ AI Chat Simulation Disclaimer\n\nThis feature uses AI to simulate the target user\'s conversation style for practice purposes only.',
      },
      watermark: {
        zh: '🤖 AI模拟回复',
        en: '🤖 AI-simulated response',
      },
      region: isCN ? 'CN' : 'INTL',
    });
  } catch (error: any) {
    console.error('[AI Chat Start] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateInitialMessage(aiService: any, targetProfile: any, isCN: boolean): Promise<string> {
  try {
    const prompt = isCN
      ? `你正在模拟用户 ${targetProfile.username || '某用户'}。根据以下资料生成一个友好的开场白：
         简介：${targetProfile.bio || '暂无'}
         兴趣：${targetProfile.interests || '暂无'}
         请用简短、友好的方式打招呼。`
      : `You are simulating user ${targetProfile.username || 'a user'}. Generate a friendly greeting based on:
         Bio: ${targetProfile.bio || 'N/A'}
         Interests: ${targetProfile.interests || 'N/A'}
         Keep it short and friendly.`;

    const response = await aiService.chat([
      { role: 'system', content: prompt }
    ], { maxTokens: 100 });

    return response.content;
  } catch {
    return isCN ? '你好！很高兴认识你！' : 'Hi! Nice to meet you!';
  }
}
