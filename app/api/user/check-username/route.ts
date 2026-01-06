import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

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

    // Check if username exists (excluding current user)
    let query = supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username);

    if (userId) {
      query = query.neq('id', userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Username check error:', error);
      return NextResponse.json(
        { available: false, error: 'Failed to check username' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      available: !data,
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
