/**
 * 用户离开聊天室 API
 * 专门用于 sendBeacon，因为 sendBeacon 不支持自定义 headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { clearUserActiveRoom } from '@/lib/services/user-presence';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 清除用户的活跃聊天室
    await clearUserActiveRoom(user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Presence leave API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
