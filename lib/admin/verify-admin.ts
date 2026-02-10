/**
 * 管理员认证辅助函数
 * Admin Request Verification Helper
 *
 * 提取管理员 API 路由中共享的认证逻辑：
 * 1. 检查 admin_session cookie（基于 session token 的认证）
 * 2. 检查 Authorization header bearer token（基于 admin_roles 表的认证）
 *
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest } from 'next/server';
import {
  getServiceDbClient,
  isChinaDeployment,
} from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import {
  getSupabaseUrl,
  isPlaceholderSupabaseUrl,
} from '@/lib/config/supabase-env';
import {
  parseAdminSessionToken,
  verifyAdminSessionToken,
} from '@/utils/session';

/**
 * 创建 Supabase Admin 客户端（INTL 环境用于验证 bearer token）
 */
function createSupabaseAdmin() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || isPlaceholderSupabaseUrl(url)) {
    throw new Error(
      'Supabase admin configuration missing. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * 通过 bearer token 验证用户是否为管理员
 * 查询 admin_roles 表确认用户角色
 */
async function verifyAdminByToken(
  token: string
): Promise<{ isAdmin: boolean; userId?: string }> {
  try {
    let userId: string | undefined;

    if (isChinaDeployment()) {
      // CN 环境：尝试从 token payload 解析 userId
      try {
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString()
        );
        userId = payload.sub || payload.uid;
      } catch {
        // 回退：通过 db client 获取用户信息
        const db = await getServiceDbClient();
        const { data, error } = await db.auth.getUser();
        if (error || !data?.user) return { isAdmin: false };
        userId = data.user.id;
      }
    } else {
      // INTL 环境：通过 Supabase Admin 客户端验证 token
      const supabase = createSupabaseAdmin();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);
      if (error || !user) return { isAdmin: false };
      userId = user.id;
    }

    if (!userId) return { isAdmin: false };

    // 查询 admin_roles 表确认管理员角色
    const db = await getServiceDbClient();
    const { data: adminRoles } = await db
      .from('admin_roles')
      .select('role')
      .eq('user_id', userId)
      .limit(1);

    return adminRoles && adminRoles.length > 0
      ? { isAdmin: true, userId }
      : { isAdmin: false };
  } catch {
    return { isAdmin: false };
  }
}

/**
 * 验证管理员请求
 *
 * 认证优先级：
 * 1. admin_session cookie - 使用 verifyAdminSessionToken 验证
 * 2. Authorization: Bearer <token> - 通过 admin_roles 表验证
 *
 * @param request - Next.js 请求对象
 * @returns { isAdmin: boolean } - 是否为有效的管理员请求
 */
export async function verifyAdminRequest(
  request: NextRequest
): Promise<{ isAdmin: boolean }> {
  // 1. 检查 admin_session cookie
  const adminSessionToken = request.cookies.get('admin_session')?.value;
  if (adminSessionToken) {
    const isSessionValid = verifyAdminSessionToken(adminSessionToken);
    if (isSessionValid) {
      // 进一步验证 session 可解析
      const session = parseAdminSessionToken(adminSessionToken);
      if (session) {
        return { isAdmin: true };
      }
    }
  }

  // 2. 检查 Authorization header bearer token
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) {
      const { isAdmin } = await verifyAdminByToken(token);
      return { isAdmin };
    }
  }

  // 无有效认证
  return { isAdmin: false };
}
