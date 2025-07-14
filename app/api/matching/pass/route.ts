import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { targetUserId } = await request.json();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create a pass record
    const { data: pass, error: passError } = await supabase
      .from('passes')
      .insert({
        user_id: user.id,
        target_user_id: targetUserId
      })
      .select()
      .single();

    if (passError) {
      console.error('Error creating pass:', passError);
      return NextResponse.json(
        { error: 'Failed to create pass' },
        { status: 500 }
      );
    }

    return NextResponse.json({ pass });
  } catch (error) {
    console.error('Error in matching pass API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 