import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bamratexknmqvdbalzen.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbXJhdGV4a25tcXZkYmFsemVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTM4NzEsImV4cCI6MjA2ODA4OTg3MX0.yYa98ioJLLouUgHWITGb7U_VjNCTUuM-5NcraM7f3zA';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing API Database Operations...');

    // 1. 测试基本连接
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (connectionError) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: connectionError.message
      }, { status: 500 });
    }

    // 2. 测试表结构
    const tables = [
      'profiles',
      'user_settings', 
      'match_preferences',
      'matches',
      'chat_rooms',
      'messages',
      'payments',
      'user_balance',
      'transactions',
      'user_interests',
      'user_photos'
    ];

    const tableStatus = [];
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        tableStatus.push({
          table,
          status: error ? 'error' : 'ok',
          error: error?.message || null
        });
      } catch (err) {
        tableStatus.push({
          table,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    // 3. 测试查询性能
    const startTime = Date.now();
    const { data: profiles, error: queryError } = await supabase
      .from('profiles')
      .select('id, username, age, location')
      .limit(10);
    const queryTime = Date.now() - startTime;

    // 4. 测试 RLS
    const { data: allProfiles, error: rlsError } = await supabase
      .from('profiles')
      .select('*');

    const rlsWorking = rlsError && rlsError.message.includes('policy');

    return NextResponse.json({
      status: 'success',
      tests: {
        connection: {
          status: 'ok',
          message: 'Database connection successful'
        },
        tables: tableStatus,
        performance: {
          queryTime: `${queryTime}ms`,
          profilesFound: profiles?.length || 0
        },
        rls: {
          working: rlsWorking,
          message: rlsWorking ? 'RLS is properly configured' : 'RLS might need configuration'
        }
      }
    });

  } catch (error) {
    console.error('API test error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'create_profile':
        // 创建测试用户资料
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.id,
            username: data.username,
            email: data.email,
            bio: data.bio,
            age: data.age,
            gender: data.gender,
            location: data.location
          })
          .select()
          .single();

        if (profileError) {
          return NextResponse.json({
            status: 'error',
            message: 'Failed to create profile',
            error: profileError.message
          }, { status: 400 });
        }

        return NextResponse.json({
          status: 'success',
          message: 'Profile created successfully',
          data: profile
        });

      case 'create_match':
        // 创建测试匹配
        const { data: match, error: matchError } = await supabase
          .from('matches')
          .insert({
            user1_id: data.user1_id,
            user2_id: data.user2_id,
            status: data.status || 'pending'
          })
          .select()
          .single();

        if (matchError) {
          return NextResponse.json({
            status: 'error',
            message: 'Failed to create match',
            error: matchError.message
          }, { status: 400 });
        }

        return NextResponse.json({
          status: 'success',
          message: 'Match created successfully',
          data: match
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