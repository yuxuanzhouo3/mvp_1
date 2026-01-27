import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseUrl, isPlaceholderSupabaseUrl } from '@/lib/config/supabase-env';

export async function GET() {
  try {
    console.log('🔍 Testing database connection...');

    // Check if we're in mock mode
    const url = getSupabaseUrl();
    const isMockMode = !url || url === 'https://mock.supabase.co' || isPlaceholderSupabaseUrl(url);

    if (isMockMode) {
      console.log('🎭 Mock mode: Simulating database connection');
      return NextResponse.json({
        status: 'success',
        mode: 'mock',
        message: 'Database connection simulated successfully',
        timestamp: new Date().toISOString(),
        mockData: {
          users: 1,
          user_profiles: 1,
          matches: 0,
          chat_rooms: 0,
          messages: 0
        }
      });
    }

    // Real database connection test
    const supabase = createClient();

    // Test basic connection with users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (usersError) {
      console.error('❌ Database connection failed:', usersError);
      return NextResponse.json({
        status: 'error',
        mode: 'real',
        error: usersError.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test other tables
    const { data: userProfiles } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    const { data: matches } = await supabase
      .from('matches')
      .select('count')
      .limit(1);

    const { data: chatRooms } = await supabase
      .from('chat_rooms')
      .select('count')
      .limit(1);

    const { data: messages } = await supabase
      .from('messages')
      .select('count')
      .limit(1);

    console.log('✅ Database connection successful');

    return NextResponse.json({
      status: 'success',
      mode: 'real',
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      data: {
        users: users?.length || 0,
        user_profiles: userProfiles?.length || 0,
        matches: matches?.length || 0,
        chat_rooms: chatRooms?.length || 0,
        messages: messages?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Database test failed:', error);
    return NextResponse.json({
      status: 'error',
      mode: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    const url = getSupabaseUrl();
    const isMockMode = !url || url === 'https://mock.supabase.co' || isPlaceholderSupabaseUrl(url);
    if (isMockMode) {
      return NextResponse.json({
        status: 'success',
        mode: 'mock',
        message: 'Database connection simulated successfully',
      });
    }

    // Create Supabase client
    const supabase = createClient();

    switch (action) {
      case 'test_connection':
        const { error } = await supabase.from('users').select('count').limit(1);
        return NextResponse.json({
          status: error ? 'error' : 'success',
          message: error ? error.message : 'Connection successful'
        });

      default:
        return NextResponse.json({
          status: 'error',
          message: 'Invalid action'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('API POST error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
