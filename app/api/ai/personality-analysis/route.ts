import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { target_user_id } = await request.json();
    if (!target_user_id) {
      return NextResponse.json({ error: 'target_user_id required' }, { status: 400 });
    }

    // 检查使用限额
    const { data: limitCheck } = await supabase.rpc('check_ai_usage_limit', {
      p_user_id: user.id,
      p_limit_type: 'analysis',
    });

    if (!limitCheck?.allowed) {
      return NextResponse.json({
        error: 'Daily limit reached',
        current: limitCheck?.current,
        limit: limitCheck?.limit,
      }, { status: 429 });
    }

    // 检查缓存
    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('ai_personality_cache, ai_personality_cache_expires_at')
      .eq('user_id', target_user_id)
      .single();

    if (
      targetProfile?.ai_personality_cache &&
      targetProfile?.ai_personality_cache_expires_at &&
      new Date(targetProfile.ai_personality_cache_expires_at) > new Date()
    ) {
      return NextResponse.json({
        analysis: targetProfile.ai_personality_cache,
        cached: true,
      });
    }

    // 调用Edge Function
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-personality-analysis`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ target_user_id }),
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
