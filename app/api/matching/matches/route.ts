/**
 * Matches API - 匹配成功记录接口
 * GET /api/matching/matches - 获取匹配成功的列表
 * DELETE /api/matching/matches/:id - 解除匹配
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

/**
 * GET /api/matching/matches
 * 获取用户匹配成功的列表
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const includeUnmatched = searchParams.get('include_unmatched') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询
    let query = supabase
      .from('matches')
      .select(`
        id,
        user_1,
        user_2,
        match_score,
        algorithm_type,
        match_details,
        matched_at,
        unmatched_at
      `)
      .or(`user_1.eq.${user.id},user_2.eq.${user.id}`)
      .order('matched_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!includeUnmatched) {
      query = query.is('unmatched_at', null);
    }

    const { data: matches, error: matchesError } = await query;

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      return NextResponse.json(
        { success: false, error: '获取匹配列表失败' },
        { status: 500 }
      );
    }

    // 获取匹配对象的用户信息
    const otherUserIds = (matches || []).map(m => 
      m.user_1 === user.id ? m.user_2 : m.user_1
    );

    let otherUsers: Record<string, unknown>[] = [];
    if (otherUserIds.length > 0) {
      const { data: users } = await supabase
        .from('v_user_full_profile')
        .select(`
          id, username, avatar_url, gender, age, city_name, 
          total_score, bio, occupation, last_active_at
        `)
        .in('id', otherUserIds);
      
      otherUsers = users || [];
    }

    const userMap = new Map(otherUsers.map(u => [u.id, u]));

    // 检查是否有聊天室
    const matchIds = (matches || []).map(m => m.id);
    let chatRooms: { match_id: string; id: string; last_message_content: string | null; last_message_at: string | null }[] = [];
    
    if (matchIds.length > 0) {
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('id, match_id, last_message_content, last_message_at')
        .in('match_id', matchIds);
      
      chatRooms = rooms || [];
    }

    const chatRoomMap = new Map(chatRooms.map(r => [r.match_id, r]));

    // 组装响应数据
    const enrichedMatches = (matches || []).map(match => {
      const otherUserId = match.user_1 === user.id ? match.user_2 : match.user_1;
      const chatRoom = chatRoomMap.get(match.id);
      
      return {
        id: match.id,
        matchedUser: userMap.get(otherUserId) || { id: otherUserId },
        matchScore: match.match_score,
        algorithmType: match.algorithm_type,
        matchDetails: match.match_details,
        matchedAt: match.matched_at,
        unmatchedAt: match.unmatched_at,
        isActive: !match.unmatched_at,
        chatRoom: chatRoom ? {
          id: chatRoom.id,
          lastMessage: chatRoom.last_message_content,
          lastMessageAt: chatRoom.last_message_at
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        matches: enrichedMatches,
        total: enrichedMatches.length,
        offset,
        limit
      }
    });

  } catch (error) {
    console.error('Matches GET API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/matching/matches
 * 解除匹配
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    // 获取匹配ID
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('id');

    if (!matchId) {
      return NextResponse.json(
        { success: false, error: '缺少匹配ID' },
        { status: 400 }
      );
    }

    // 检查匹配是否存在且当前用户是参与者
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('id, user_1, user_2, unmatched_at')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json(
        { success: false, error: '匹配记录不存在' },
        { status: 404 }
      );
    }

    if (match.user_1 !== user.id && match.user_2 !== user.id) {
      return NextResponse.json(
        { success: false, error: '无权操作此匹配' },
        { status: 403 }
      );
    }

    if (match.unmatched_at) {
      return NextResponse.json(
        { success: false, error: '该匹配已解除' },
        { status: 409 }
      );
    }

    // 解除匹配
    const { error: updateError } = await supabase
      .from('matches')
      .update({ unmatched_at: new Date().toISOString() })
      .eq('id', matchId);

    if (updateError) {
      console.error('Error unmatching:', updateError);
      return NextResponse.json(
        { success: false, error: '解除匹配失败' },
        { status: 500 }
      );
    }

    // 可选：关闭相关聊天室
    await supabase
      .from('chat_rooms')
      .update({ is_active: false })
      .eq('match_id', matchId);

    return NextResponse.json({
      success: true,
      data: {
        matchId,
        unmatchedAt: new Date().toISOString(),
        message: '已解除匹配'
      }
    });

  } catch (error) {
    console.error('Matches DELETE API error:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

