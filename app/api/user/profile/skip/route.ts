/**
 * 个人资料跳过 API
 * Profile Skip API
 *
 * PATCH /api/user/profile/skip
 * 递增用户的 profile_skip_count，返回更新后的计数和 can_skip 状态
 *
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';
import { MAX_PROFILE_SKIP_COUNT } from '@/lib/constants/profile';
import type { MarketValueScore } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

/**
 * 合并默认资料值（仅填充 null/undefined 字段）
 * Merge default profile values (only fill null/undefined fields)
 *
 * 当用户跳过资料填写时，为必填字段填入默认值，
 * 以确保系统能计算市场价值得分。
 * 已有用户填写的值不会被覆盖。
 *
 * @param existingProfile - 现有的 profile 数据
 * @returns 需要填入的默认值对象（仅包含原本为 null 的字段）
 */
function getDefaultProfileValues(existingProfile: any): Record<string, any> {
  const defaults: Record<string, any> = {
    marital_status: 'single',
    relationship_history_count: 0,
  };

  const merged: Record<string, any> = {};
  for (const [key, defaultValue] of Object.entries(defaults)) {
    // 仅在字段为 null/undefined 时填入默认值
    if (existingProfile?.[key] == null) {
      merged[key] = defaultValue;
    }
  }
  return merged;
}

// 从请求中验证用户身份
async function authenticateUser(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  try {
    const user = await requireUser(request);
    return { userId: user.userId, email: user.email };
  } catch {
    return null;
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 获取服务端数据库客户端 (绕过 RLS)
    const db = await getServiceDbClient();

    // Step 1: 获取完整 profile 数据（用于合并默认值）
    const { data: profileData, error: fetchError } = await db
      .from('user_profiles')
      .select('*')
      .eq('user_id', authUser.userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[Profile Skip PATCH] Error fetching profile:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // 对 CN 环境 Cloudbase 文档中缺失 profile_skip_count 字段的情况默认为 0
    const currentSkipCount = profileData?.profile_skip_count ?? 0;

    // Step 2: 检查是否已达到最大跳过次数
    if (currentSkipCount >= MAX_PROFILE_SKIP_COUNT) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum skip limit reached',
          data: {
            profile_skip_count: currentSkipCount,
            can_skip: false,
          },
        },
        { status: 403 }
      );
    }

    // Step 3: 合并默认值、设置完成标志、递增 profile_skip_count、写入默认评分
    const newSkipCount = currentSkipCount + 1;
    const defaultValues = getDefaultProfileValues(profileData);
    const defaultScore: MarketValueScore = {
      totalScore: 60,
      scoreBreakdown: {
        wealth: 50,
        education: 50,
        age: 50,
        bmi: 50,
        appearance: 50,
        relationshipHistory: 50,
        personality: 50,
        jobStability: 50,
        location: 50,
        childrenPreference: 50,
      },
      percentile: 0,
      calculatedAt: new Date().toISOString(),
      version: 'skip-default',
    };

    if (!profileData) {
      // Profile 不存在，创建新的 profile 记录（含默认值、完成标志和默认评分）
      const { error: insertError } = await db
        .from('user_profiles')
        .insert({
          user_id: authUser.userId,
          profile_skip_count: newSkipCount,
          is_profile_complete: true,
          market_value_score: defaultScore,
          ...defaultValues,
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[Profile Skip PATCH] Error inserting profile:', insertError);
        return NextResponse.json(
          { success: false, error: 'Failed to update skip count' },
          { status: 500 }
        );
      }
    } else {
      // Profile 存在，更新 skip count、默认值、完成标志和默认评分
      const { error: updateError } = await db
        .from('user_profiles')
        .update({
          profile_skip_count: newSkipCount,
          is_profile_complete: true,
          market_value_score: defaultScore,
          ...defaultValues,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', authUser.userId);

      if (updateError) {
        console.error('[Profile Skip PATCH] Error updating skip count:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update skip count' },
          { status: 500 }
        );
      }
    }

    // Step 4: 验证更新结果（确保原子性）
    const { data: updatedProfile, error: verifyError } = await db
      .from('user_profiles')
      .select('profile_skip_count')
      .eq('user_id', authUser.userId)
      .single();

    if (verifyError) {
      console.error('[Profile Skip PATCH] Error verifying update:', verifyError);
      // 即使验证失败，也返回预期的值
      return NextResponse.json({
        success: true,
        data: {
          profile_skip_count: newSkipCount,
          can_skip: newSkipCount < MAX_PROFILE_SKIP_COUNT,
        },
      });
    }

    const finalSkipCount = updatedProfile?.profile_skip_count ?? newSkipCount;

    return NextResponse.json({
      success: true,
      data: {
        profile_skip_count: finalSkipCount,
        can_skip: finalSkipCount < MAX_PROFILE_SKIP_COUNT,
      },
    });
  } catch (error) {
    console.error('[Profile Skip PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
