import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user matches count
    const { count: totalMatches } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    // Get total messages count
    const { count: totalMessages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    // Get active chats count (chats with messages in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: activeChats } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .gte('created_at', sevenDaysAgo.toISOString());

    // Calculate profile completion percentage
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, bio, location, interests, avatar_url')
      .eq('id', user.id)
      .single();

    let profileCompletion = 0;
    if (profile) {
      const fields = ['full_name', 'bio', 'location', 'interests', 'avatar_url'];
      const completedFields = fields.filter(field => {
        const value = profile[field as keyof typeof profile];
        return value && (Array.isArray(value) ? value.length > 0 : value.toString().length > 0);
      });
      profileCompletion = Math.round((completedFields.length / fields.length) * 100);
    }

    // Get weekly matches
    const { count: weeklyMatches } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .gte('created_at', sevenDaysAgo.toISOString());

    // Calculate average response time (mock data for now)
    const averageResponseTime = 2.3; // hours

    // Get top interests (mock data for now)
    const topInterests = ['技术', '音乐', '旅行', '美食', '运动'];

    // Get recent activity (mock data for now)
    const recentActivity = [
      {
        type: 'match',
        description: '与 张三 匹配成功',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        type: 'message',
        description: '发送了 5 条消息',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      },
      {
        type: 'profile',
        description: '更新了个人资料',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const stats = {
      totalMatches: totalMatches || 0,
      totalMessages: totalMessages || 0,
      activeChats: activeChats || 0,
      profileCompletion,
      weeklyMatches: weeklyMatches || 0,
      averageResponseTime,
      topInterests,
      recentActivity,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 