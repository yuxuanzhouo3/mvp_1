/**
 * 通知设置 API
 * Notification Settings API
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';
import {
  validateNotificationSettings,
  defaultNotificationSettings,
  mergeWithDefaults,
  type NotificationSettings,
} from '@/lib/validations/settings';

// Helper to get authenticated user
async function getAuthenticatedUser(request: NextRequest): Promise<{ user: { id: string; email?: string } | null; error: string | null }> {
  try {
    const user = await requireUser(request);
    return { user: { id: user.userId, email: user.email }, error: null };
  } catch {
    return { user: null, error: 'Unauthorized' };
  }
}

/**
 * GET /api/settings/notifications
 * Get current user's notification settings
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const db = await getServiceDbClient();

    const { data, error } = await db
      .from('user_profiles')
      .select('notification_settings')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If profile doesn't exist, return defaults
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          notifications: defaultNotificationSettings,
        });
      }
      console.error('Database error fetching notification settings:', error);
      return NextResponse.json({
        error: 'Failed to fetch notification settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }

    const notificationSettings = mergeWithDefaults<NotificationSettings>(
      data?.notification_settings,
      defaultNotificationSettings
    );

    return NextResponse.json({ notifications: notificationSettings });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}

/**
 * PATCH /api/settings/notifications
 * Update current user's notification settings (partial update)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validation = validateNotificationSettings(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const db = await getServiceDbClient();

    // Get current settings
    const { data: currentData } = await db
      .from('user_profiles')
      .select('notification_settings')
      .eq('user_id', user.id)
      .single();

    // Merge with current settings (partial update)
    const currentSettings = currentData?.notification_settings || defaultNotificationSettings;
    const updatedSettings = { ...currentSettings, ...validation.data };

    // Update in database
    const { data, error } = await db
      .from('user_profiles')
      .update({
        notification_settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select('notification_settings')
      .single();

    if (error) {
      console.error('Error updating notification settings:', error);
      return NextResponse.json({ error: 'Failed to update notification settings' }, { status: 500 });
    }

    return NextResponse.json({
      notifications: data.notification_settings,
      message: 'Notification settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
