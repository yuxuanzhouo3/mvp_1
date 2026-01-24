/**
 * AI 使用限额 API
 * GET /api/ai/usage-limits - 获取用户的 AI 使用限额
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbClient, isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';

// 统一认证函数
async function authenticateUser(request: NextRequest): Promise<{ userId: string; email?: string } | null> {
  try {
    const user = await requireUser(request);
    return { userId: user.userId, email: user.email };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authUser = await authenticateUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDbClient();

    // 获取使用限额
    const { data: limits } = await db
      .from('ai_usage_limits')
      .select('*')
      .eq('user_id', authUser.userId)
      .single();

    // 检查VIP状态
    const { data: membership } = await db
      .from('user_memberships')
      .select('status, expires_at')
      .eq('user_id', authUser.userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single();

    const isVip = !!membership;

    // 如果没有记录，返回默认值
    if (!limits) {
      return NextResponse.json({
        daily_analysis_count: 0,
        daily_analysis_limit: 3,
        total_chat_count: 0,
        total_chat_limit: isVip ? null : 10,
        is_vip: isVip,
        region: isChinaDeployment() ? 'CN' : 'INTL',
      });
    }

    return NextResponse.json({
      ...limits,
      total_chat_limit: isVip ? null : limits.total_chat_limit,
      is_vip: isVip,
      region: isChinaDeployment() ? 'CN' : 'INTL',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
