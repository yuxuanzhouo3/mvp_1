import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取使用限额
    const { data: limits } = await supabase
      .from('ai_usage_limits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // 检查VIP状态
    const { data: membership } = await supabase
      .from('user_memberships')
      .select('status, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single();

    const isVip = !!membership;

    // 如果没有记录，返回默认值
    if (!limits) {
      return NextResponse.json({
        daily_analysis_count: 0,
        daily_analysis_limit: 3,
        total_chat_count: 0,
        total_chat_limit: isVip ? null : 10,
        is_vip: isVip,
      });
    }

    return NextResponse.json({
      ...limits,
      total_chat_limit: isVip ? null : limits.total_chat_limit,
      is_vip: isVip,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
