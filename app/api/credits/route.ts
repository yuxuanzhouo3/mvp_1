import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCreditsBalance, CREDIT_COSTS } from '@/lib/credits/credits';

/**
 * GET /api/credits
 * Get user's current credits balance
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get credits balance
    const balance = await getCreditsBalance(user.id);

    return NextResponse.json({
      success: true,
      data: {
        balance,
        costs: {
          match: CREDIT_COSTS.MATCH,
          message: CREDIT_COSTS.MESSAGE,
        },
      },
    });
  } catch (error) {
    console.error('Credits API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
