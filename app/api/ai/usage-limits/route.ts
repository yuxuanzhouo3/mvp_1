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
import { createClient } from '@supabase/supabase-js';

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
