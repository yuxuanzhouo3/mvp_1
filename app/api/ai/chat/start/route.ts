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

    // 检查使用限额
    if (isCN) {
      const nowIso = new Date().toISOString();
      const { data: existingLimits } = await db
        .from('ai_usage_limits')
        .select('*')
        .eq('user_id', authUser.userId)
        .single();

      if (!existingLimits) {
        await db.from('ai_usage_limits').insert({
          user_id: authUser.userId,
          daily_analysis_count: 0,
          daily_analysis_limit: 3,
          total_chat_count: 0,
          total_chat_limit: 10,
          last_reset_at: nowIso,
          updated_at: nowIso,
        });
      } else {
        const current = existingLimits.total_chat_count ?? 0;
        const limit = existingLimits.total_chat_limit ?? 10;
        if (existingLimits.total_chat_limit !== null && current >= limit) {
          return NextResponse.json(
            { error: '已达到聊天限额', current, limit },
            { status: 429 }
          );
        }
      }
    } else {
      try {
        const { data: limitCheck } = await db.rpc('check_ai_usage_limit', {
          p_user_id: authUser.userId,
          p_limit_type: 'chat',
        });

        if (limitCheck && !limitCheck.allowed) {
          return NextResponse.json(
            {
              error: 'Chat limit reached',
              current: limitCheck.current,
              limit: limitCheck.limit,
              is_vip: limitCheck.is_vip,
            },
            { status: 429 }
          );
        }
      } catch {}
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

    // 创建会话记录
    const { data: session, error: sessionError } = await db
      .from('ai_chat_sessions')
      .insert({
        user_id: authUser.userId,
        target_user_id: target_user_id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating AI chat session:', sessionError);
      return NextResponse.json({
        error: isCN ? '创建会话失败' : 'Failed to create session',
      }, { status: 500 });
    }

    // 扣减使用次数（按会话次数）
    if (isCN) {
      const { data: currentLimits } = await db
        .from('ai_usage_limits')
        .select('total_chat_count')
        .eq('user_id', authUser.userId)
        .single();

      await db
        .from('ai_usage_limits')
        .update({
          total_chat_count: (currentLimits?.total_chat_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', authUser.userId);
    } else {
      try {
        await db.rpc('deduct_ai_usage', {
          p_user_id: authUser.userId,
          p_usage_type: 'chat',
        });
      } catch {}
    }

    // 生成初始 AI 消息
    const aiService = getAIService();
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
