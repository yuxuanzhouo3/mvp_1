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
import { requireUser } from '@/lib/auth/requireUser';
import {
  getUserNotifications,
  getUnreadCount,
  markAllAsRead,
} from '@/lib/services/notifications';

export const dynamic = 'force-dynamic';

// Helper to get user from token
async function getUser(request: NextRequest): Promise<{ id: string; email?: string } | null> {
  try {
    const user = await requireUser(request);
    return { id: user.userId, email: user.email };
  } catch {
    return null;
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
