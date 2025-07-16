import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Check if we're in mock mode
    const isMockMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://mock.supabase.co';
    
    if (isMockMode) {
      console.log('🎭 Mock mode: Simulating database connection');
      return NextResponse.json({
        status: 'success',
        mode: 'mock',
        message: 'Database connection simulated successfully',
        timestamp: new Date().toISOString(),
        mockData: {
          profiles: 1,
          matches: 0,
          chats: 0,
          messages: 0
        }
      });
    }

    // Real database connection test
    const supabase = createClient();
    
    // Test basic connection
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (profilesError) {
      console.error('❌ Database connection failed:', profilesError);
      return NextResponse.json({
        status: 'error',
        mode: 'real',
        error: profilesError.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test other tables
    const { data: matches } = await supabase
      .from('matches')
      .select('count')
      .limit(1);

    const { data: chats } = await supabase
      .from('chats')
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
        profiles: profiles?.length || 0,
        matches: matches?.length || 0,
        chats: chats?.length || 0,
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

    // Create Supabase client
    const supabase = createClient();

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