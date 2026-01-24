/**
 * 搜索偏好设置 API
 * Search Preferences Settings API
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient, isChinaDeployment } from '@/lib/db-client';
import { requireUser } from '@/lib/auth/requireUser';
import {
  validateSearchPreferences,
  defaultSearchPreferences,
  mergeWithDefaults,
  type SearchPreferences,
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
 * GET /api/settings/preferences
 * Get current user's search preferences
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
      .select('search_preferences')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If profile doesn't exist, return defaults
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          preferences: defaultSearchPreferences,
        });
      }
      console.error('Database error fetching search preferences:', error);
      return NextResponse.json({
        error: 'Failed to fetch search preferences',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }

    const searchPreferences = mergeWithDefaults<SearchPreferences>(
      data?.search_preferences,
      defaultSearchPreferences
    );

    return NextResponse.json({ preferences: searchPreferences });
  } catch (error) {
    console.error('Error fetching search preferences:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }, { status: 500 });
  }
}

/**
 * PATCH /api/settings/preferences
 * Update current user's search preferences (partial update)
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validation = validateSearchPreferences(body);
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
      .select('search_preferences')
      .eq('user_id', user.id)
      .single();

    // Merge with current settings (partial update)
    const currentSettings = currentData?.search_preferences || defaultSearchPreferences;
    const updatedSettings = { ...currentSettings, ...validation.data };

    // Additional validation: ensure age_range_min <= age_range_max
    if (updatedSettings.age_range_min > updatedSettings.age_range_max) {
      return NextResponse.json(
        { error: 'Minimum age cannot be greater than maximum age' },
        { status: 400 }
      );
    }

    // Additional validation: ensure height_range_min <= height_range_max
    if (updatedSettings.height_range_min > updatedSettings.height_range_max) {
      return NextResponse.json(
        { error: 'Minimum height cannot be greater than maximum height' },
        { status: 400 }
      );
    }

    // Update in database
    const { data, error } = await db
      .from('user_profiles')
      .update({
        search_preferences: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select('search_preferences')
      .single();

    if (error) {
      console.error('Error updating search preferences:', error);
      return NextResponse.json({ error: 'Failed to update search preferences' }, { status: 500 });
    }

    return NextResponse.json({
      preferences: data.search_preferences,
      message: 'Search preferences updated successfully',
    });
  } catch (error) {
    console.error('Error updating search preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
