/**
 * Rewind API - 撤销上一次 Pass 操作
 * POST /api/matching/rewind - 撤销操作 (2积分)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { checkAndConsumeCredits, CREDIT_COSTS } from '@/lib/credits/credits';

// Rewind time limit: 5 minutes
const REWIND_TIME_LIMIT_MS = 5 * 60 * 1000;

/**
 * POST /api/matching/rewind
 * Rewind the last pass action
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'AUTH_REQUIRED', errorCode: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Parse request body (optional swipeId to specify which swipe to rewind)
    let swipeId: string | undefined;
    try {
      const body = await request.json();
      swipeId = body.swipeId;
    } catch {
      // Body is optional
    }

    // Find the most recent pass action
    let query = supabase
      .from('swipes')
      .select('*')
      .eq('actor_id', user.id)
      .eq('action', 'pass')
      .order('created_at', { ascending: false })
      .limit(1);

    if (swipeId) {
      query = supabase
        .from('swipes')
        .select('*')
        .eq('id', swipeId)
        .eq('actor_id', user.id)
        .eq('action', 'pass')
        .limit(1);
    }

    const { data: swipeToRewind, error: swipeError } = await query.single();

    if (swipeError || !swipeToRewind) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_REWINDABLE_SWIPE',
          errorCode: 'NO_REWINDABLE_SWIPE',
          message: 'No pass action found to rewind',
        },
        { status: 404 }
      );
    }

    // Check if the swipe is within the rewind time limit
    const swipeTime = new Date(swipeToRewind.created_at).getTime();
    const currentTime = Date.now();

    if (currentTime - swipeTime > REWIND_TIME_LIMIT_MS) {
      return NextResponse.json(
        {
          success: false,
          error: 'REWIND_TIME_EXPIRED',
          errorCode: 'REWIND_TIME_EXPIRED',
          message: 'Rewind time limit (5 minutes) has expired',
        },
        { status: 400 }
      );
    }

    // Check and consume credits (2 credits for rewind)
    const creditsResult = await checkAndConsumeCredits(user.id, 'rewind', swipeToRewind.id);

    if (!creditsResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: creditsResult.error || 'INSUFFICIENT_CREDITS',
          errorCode: creditsResult.errorCode || 'INSUFFICIENT_CREDITS',
          requiredCredits: CREDIT_COSTS.REWIND,
        },
        { status: 402 } // Payment Required
      );
    }

    // Delete the swipe record
    const { error: deleteError } = await supabase
      .from('swipes')
      .delete()
      .eq('id', swipeToRewind.id);

    if (deleteError) {
      console.error('Error deleting swipe:', deleteError);
      return NextResponse.json(
        {
          success: false,
          error: 'REWIND_FAILED',
          errorCode: 'REWIND_FAILED',
          message: 'Failed to rewind the action',
        },
        { status: 500 }
      );
    }

    // If there was a recommendation associated, update its status back to pending
    if (swipeToRewind.recommendation_id) {
      await supabase
        .from('recommendations')
        .update({
          is_viewed: false,
          status: 'pending',
        })
        .eq('id', swipeToRewind.recommendation_id);
    }

    // Get target user info for response
    const { data: targetUser } = await supabase
      .from('v_user_full_profile')
      .select('id, username, avatar_url, gender, age, city_name')
      .eq('id', swipeToRewind.target_id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        rewindedSwipe: {
          id: swipeToRewind.id,
          targetUserId: swipeToRewind.target_id,
          action: swipeToRewind.action,
          rewindedAt: new Date().toISOString(),
        },
        targetUser: targetUser || { id: swipeToRewind.target_id },
        creditsConsumed: CREDIT_COSTS.REWIND,
        newBalance: creditsResult.newBalance,
      },
      messageCode: 'REWIND_SUCCESS',
    });
  } catch (error) {
    console.error('Rewind API error:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
