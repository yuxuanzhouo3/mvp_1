import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    // For now, return mock matches since we don't have a matches table yet
    const mockMatches = [
      {
        id: '1',
        matched_user: {
          id: 'user1',
          full_name: 'Alice Johnson',
          avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
        },
        compatibility_score: 95,
        matched_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },
      {
        id: '2',
        matched_user: {
          id: 'user2',
          full_name: 'Bob Smith',
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
        },
        compatibility_score: 87,
        matched_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
      },
      {
        id: '3',
        matched_user: {
          id: 'user3',
          full_name: 'Carol Davis',
          avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
        },
        compatibility_score: 92,
        matched_at: new Date(Date.now() - 259200000).toISOString() // 3 days ago
      }
    ].slice(0, limit);

    return NextResponse.json({ matches: mockMatches });
  } catch (error) {
    console.error('Matches API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 