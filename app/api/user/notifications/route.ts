/**
 * 用户通知 API
 * User Notifications API
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { createClient } from '@supabase/supabase-js';
import {
  getUserNotifications,
  getUnreadCount,
  markAllAsRead,
} from '@/lib/services/notifications';

// INTL 环境: 创建用于认证的 Supabase 客户端
function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Helper to get user from token
async function getUser(request: NextRequest): Promise<{ id: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];

  if (isChinaDeployment()) {
    // CN 环境: 支持 cn_ 前缀的用户 ID token
    if (token.startsWith('cn_')) {
      const userId = token.substring(3);
      if (userId) {
        return { id: userId };
      }
    }

    // 尝试从 Cloudbase 验证 token
    try {
      const db = await getServiceDbClient();
      const { data, error } = await db.auth.getUser();
      if (error || !data?.user) {
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          return {
            id: payload.sub || payload.uid,
            email: payload.email
          };
        } catch {
          return null;
        }
      }
      return {
        id: data.user.id,
        email: data.user.email
      };
    } catch {
      return null;
    }
  } else {
    // INTL 环境
    const supabase = createSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return { id: user.id, email: user.email };
  }
}

// GET - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const { notifications, total } = await getUserNotifications(user.id, {
      limit,
      offset,
      unreadOnly,
    });

    const unreadCount = await getUnreadCount(user.id);

    return NextResponse.json({
      success: true,
      notifications,
      total,
      unreadCount,
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Mark all notifications as read
export async function PUT(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await markAllAsRead(user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Mark all as read error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
