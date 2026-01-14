import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id, message } = await request.json();
    if (!session_id || !message) {
      return NextResponse.json({ error: 'session_id and message required' }, { status: 400 });
    }

    // 验证会话所有权
    const { data: chatSession } = await supabase
      .from('ai_chat_sessions')
      .select('user_id, ended_at')
      .eq('id', session_id)
      .single();

    if (!chatSession || chatSession.user_id !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (chatSession.ended_at) {
      return NextResponse.json({ error: 'Session has ended' }, { status: 400 });
    }

    // 调用Edge Function
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat-simulation/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ session_id, message }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(result, { status: response.status });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
