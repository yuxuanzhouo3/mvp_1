/**
 * 检查用户名可用性 API
 * Check Username Availability API
 * 
 * 支持双环境:
 * - CN 环境: 腾讯云 Cloudbase
 * - INTL 环境: Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceDbClient } from '@/lib/db-client';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const userId = searchParams.get('userId'); // Current user ID to exclude

    if (!username) {
      return NextResponse.json(
        { available: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    const db = await getServiceDbClient();

    // Check if username exists (excluding current user)
    let query = db
      .from('users')
      .select('id')
      .eq('username', username);

    if (userId) {
      query = query.neq('id', userId);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      console.error('Username check error:', error);
      return NextResponse.json(
        { available: false, error: 'Failed to check username' },
        { status: 500 }
      );
    }

    // Check if any results were returned
    const exists = data && data.length > 0;

    return NextResponse.json({
      available: !exists,
      username
    });

  } catch (error) {
    console.error('Username check error:', error);
    return NextResponse.json(
      { available: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
