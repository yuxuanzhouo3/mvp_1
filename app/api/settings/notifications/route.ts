import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateNotificationSettings,
  defaultNotificationSettings,
  mergeWithDefaults,
  type NotificationSettings,
} from '@/lib/validations/settings';

// Create Supabase clients
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Helper to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { user: null, error: 'No authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  const anonClient = createAnonClient();
  const { data: { user }, error } = await anonClient.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: 'Invalid token' };
  }

  return { user, error: null };
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

    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient
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

    const serviceClient = createServiceClient();

    // Get current settings
    const { data: currentData } = await serviceClient
      .from('user_profiles')
      .select('notification_settings')
      .eq('user_id', user.id)
      .single();

    // Merge with current settings (partial update)
    const currentSettings = currentData?.notification_settings || defaultNotificationSettings;
    const updatedSettings = { ...currentSettings, ...validation.data };

    // Update in database
    const { data, error } = await serviceClient
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
