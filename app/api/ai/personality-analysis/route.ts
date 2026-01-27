/**
 * AI 性格分析 API
 * POST /api/ai/personality-analysis - 分析目标用户的性格
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase + 通义千问
 * - INTL 环境: Supabase + Mistral AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';
import { getAIService } from '@/lib/ai';
import { checkAiUsageLimit, deductAiUsage, insertAiUsageLog } from '@/lib/ai/usage';

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

    // 检查缓存
    const { data: targetProfile } = await db
      .from('user_profiles')
      .select('ai_personality_cache, ai_personality_cache_expires_at')
      .eq('user_id', target_user_id)
      .single();

    if (
      targetProfile?.ai_personality_cache &&
      targetProfile?.ai_personality_cache_expires_at &&
      new Date(targetProfile.ai_personality_cache_expires_at) > new Date()
    ) {
      return NextResponse.json({
        analysis: targetProfile.ai_personality_cache,
        cached: true,
        region: isCN ? 'CN' : 'INTL',
      });
    }

    const limitCheck = await checkAiUsageLimit(db, authUser.userId, 'analysis');
    if (limitCheck && !limitCheck.allowed) {
      return NextResponse.json(
        {
          error: isCN ? '已达到每日分析限额' : 'Daily limit reached',
          current: limitCheck.current,
          limit: limitCheck.limit,
          isVip: limitCheck.is_vip,
        },
        { status: 429 }
      );
    }

    // 获取目标用户完整资料
    const { data: fullProfile } = await db
      .from('v_user_full_profile')
      .select('*')
      .eq('id', target_user_id)
      .single();

    if (!fullProfile) {
      return NextResponse.json({
        error: isCN ? '目标用户不存在' : 'Target user not found',
      }, { status: 404 });
    }

    // 调用 AI 进行性格分析
    const aiService = getAIService();
    const { analysis, tokensUsed } = await generatePersonalityAnalysis(aiService, fullProfile, isCN);

    // 缓存分析结果 (7天)
    const cacheExpiresAt = new Date();
    cacheExpiresAt.setDate(cacheExpiresAt.getDate() + 7);

    await db
      .from('user_profiles')
      .update({
        ai_personality_cache: analysis,
        ai_personality_cache_expires_at: cacheExpiresAt.toISOString(),
      })
      .eq('user_id', target_user_id);

    const nowIso = new Date().toISOString();
    await insertAiUsageLog(db, {
      user_id: authUser.userId,
      feature: 'analysis',
      tokens_used: tokensUsed,
      created_at: nowIso,
    });
    await deductAiUsage(db, authUser.userId, 'analysis');

    return NextResponse.json({
      analysis,
      cached: false,
      region: isCN ? 'CN' : 'INTL',
    });
  } catch (error: any) {
    console.error('[AI Personality Analysis] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generatePersonalityAnalysis(
  aiService: any,
  profile: any,
  isCN: boolean
): Promise<{ analysis: any; tokensUsed: number }> {
  const prompt = isCN
    ? `请根据以下用户资料进行性格分析：

用户名：${profile.username || profile.full_name || '未知'}
简介：${profile.bio || '暂无'}
性别：${profile.gender === 'male' ? '男' : profile.gender === 'female' ? '女' : '未知'}
职业：${profile.occupation || '暂无'}
学历：${profile.education_level || '暂无'}
MBTI：${profile.mbti || '暂无'}
兴趣爱好：${profile.interests || '暂无'}

请从以下维度进行分析并返回 JSON 格式：
{
  "personality_summary": "性格总结描述",
  "compatibility_score": 75,
  "compatibility_analysis": "匹配度分析",
  "conversation_topics": ["话题1", "话题2", "话题3"],
  "dos": ["建议做1", "建议做2"],
  "donts": ["避免做1", "避免做2"],
  "potential_challenges": ["潜在挑战1"],
  "first_message_suggestions": ["开场白1", "开场白2"]
}`
    : `Analyze the personality based on this user profile:

Username: ${profile.username || profile.full_name || 'Unknown'}
Bio: ${profile.bio || 'N/A'}
Gender: ${profile.gender || 'Unknown'}
Occupation: ${profile.occupation || 'N/A'}
Education: ${profile.education_level || 'N/A'}
MBTI: ${profile.mbti || 'N/A'}
Interests: ${profile.interests || 'N/A'}

Return analysis in JSON format:
{
  "personality_summary": "personality description",
  "compatibility_score": 75,
  "compatibility_analysis": "compatibility analysis",
  "conversation_topics": ["topic1", "topic2", "topic3"],
  "dos": ["do1", "do2"],
  "donts": ["dont1", "dont2"],
  "potential_challenges": ["challenge1"],
  "first_message_suggestions": ["opener1", "opener2"]
}`;

  try {
    const response = await aiService.chat([
      { role: 'system', content: 'You are a personality analyst. Return only valid JSON.' },
      { role: 'user', content: prompt }
    ], { maxTokens: 800 });
    const tokensUsed = typeof response?.tokensUsed === 'number' && Number.isFinite(response.tokensUsed) ? response.tokensUsed : 0;

    // 尝试解析 JSON
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // 确保所有数组字段存在
      return {
        analysis: {
          personality_summary: parsed.personality_summary || (isCN ? '暂无数据' : 'No data'),
          compatibility_score: parsed.compatibility_score || 70,
          compatibility_analysis: parsed.compatibility_analysis || (isCN ? '暂无数据' : 'No data'),
          conversation_topics: parsed.conversation_topics || [],
          dos: parsed.dos || [],
          donts: parsed.donts || [],
          potential_challenges: parsed.potential_challenges || [],
          first_message_suggestions: parsed.first_message_suggestions || [],
        },
        tokensUsed,
      };
    }

    // 如果无法解析，返回默认结构
    return {
      analysis: {
        personality_summary: isCN ? '暂无数据' : 'No data',
        compatibility_score: 70,
        compatibility_analysis: isCN ? '暂无数据' : 'No data',
        conversation_topics: [],
        dos: [],
        donts: [],
        potential_challenges: [],
        first_message_suggestions: [],
      },
      tokensUsed,
    };
  } catch (error) {
    console.error('Error generating personality analysis:', error);
    return {
      analysis: {
        personality_summary: isCN ? '分析失败' : 'Analysis failed',
        compatibility_score: 0,
        compatibility_analysis: isCN ? '分析过程中出现错误' : 'Error during analysis',
        conversation_topics: [],
        dos: [],
        donts: [],
        potential_challenges: [],
        first_message_suggestions: [],
      },
      tokensUsed: 0,
    };
  }
}
