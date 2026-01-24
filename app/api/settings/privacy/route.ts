/**
 * 隐私设置 API
 * Privacy Settings API
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';
import {
  validatePrivacySettings,
  defaultPrivacySettings,
  mergeWithDefaults,
  type PrivacySettings,
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
 * GET /api/settings/privacy
 * Get current user's privacy settings
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
      .select('privacy_settings')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If profile doesn't exist, return defaults
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          privacy: defaultPrivacySettings,
        });
      }
      console.error('Database error fetching privacy settings:', error);
      return NextResponse.json({
        error: 'Failed to fetch privacy settings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }

    const privacySettings = mergeWithDefaults<PrivacySettings>(
      data?.privacy_settings,
      defaultPrivacySettings
    );

    return NextResponse.json({ privacy: privacySettings });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}

/**
 * PATCH /api/settings/privacy
 * Update current user's privacy settings (partial update)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validation = validatePrivacySettings(body);
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
      .select('privacy_settings')
      .eq('user_id', user.id)
      .single();

    // Merge with current settings (partial update)
    const currentSettings = currentData?.privacy_settings || defaultPrivacySettings;
    const updatedSettings = { ...currentSettings, ...validation.data };

    // Update in database
    const { data, error } = await db
      .from('user_profiles')
      .update({
        privacy_settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select('privacy_settings')
      .single();

    if (error) {
      console.error('Error updating privacy settings:', error);
      return NextResponse.json({ error: 'Failed to update privacy settings' }, { status: 500 });
    }

    return NextResponse.json({
      privacy: data.privacy_settings,
      message: 'Privacy settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
