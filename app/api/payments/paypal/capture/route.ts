import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { capturePayPalOrder } from '@/lib/payment/paypal';
import { updatePaymentStatus, addCreditsToUser, createTransactionRecord } from '@/lib/payment/payments';
import { notifyPaymentSuccess } from '@/lib/services/notifications';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { orderId, paymentId } = await request.json();

    if (!orderId || !paymentId) {
      return NextResponse.json(
        { error: 'Missing orderId or paymentId' },
        { status: 400 }
      );
    }

    console.log('[PayPal Capture] Processing:', { orderId, paymentId, userId: user.id });

    // Use atomic update to prevent race condition - only update if status is 'pending'
    const serviceClient = createServiceClient();
    const { data: payment, error: updateError } = await serviceClient
      .from('payments')
      .update({ status: 'processing' })
      .eq('id', paymentId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .select('*')
      .single();

    if (updateError || !payment) {
      // Check if payment exists and is already completed
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('status, credits')
        .eq('id', paymentId)
        .eq('user_id', user.id)
        .single();

      if (existingPayment?.status === 'completed') {
        console.log('[PayPal Capture] Payment already completed:', paymentId);
        return NextResponse.json({
          success: true,
          message: 'Payment already completed',
          credits: existingPayment.credits || 0,
        });
      }

      if (existingPayment?.status === 'processing') {
        console.log('[PayPal Capture] Payment is being processed:', paymentId);
        return NextResponse.json(
          { error: 'Payment is being processed' },
          { status: 409 }
        );
      }

      console.error('[PayPal Capture] Payment not found or invalid status:', updateError);
      return NextResponse.json(
        { error: 'Payment not found or already processed' },
        { status: 404 }
      );
    }

    // Capture PayPal 订单
    const captureResult = await capturePayPalOrder(orderId);

    if (!captureResult.success) {
      console.error('[PayPal Capture] Capture failed:', captureResult);
      await updatePaymentStatus(paymentId, 'failed', {
        ...payment.metadata,
        paypal_error: 'Capture failed',
        paypal_status: captureResult.status,
      });
      return NextResponse.json(
        { error: 'Payment capture failed' },
        { status: 400 }
      );
    }

    // 更新支付状态为完成 - 积分添加由数据库触发器 trigger_on_payment_completed 自动完成
    // 触发器会调用 add_user_credits() 函数，该函数会自动创建交易记录
    const credits = payment.credits || 0;
    await updatePaymentStatus(paymentId, 'completed', {
      ...payment.metadata,
      paypal_order_id: orderId,
      paypal_capture_id: captureResult.captureId,
      paypal_payer_id: captureResult.payerId,
      paypal_status: captureResult.status,
    });

    // Check if this is a membership payment and activate membership
    const metadata = payment.metadata || {};
    if (metadata.type === 'membership' && metadata.tier_id) {
      await activateMembership(user.id, metadata.tier_id, supabase);
    }

    // 发送成功通知
    notifyPaymentSuccess(user.id, credits, paymentId, payment.amount).catch((err) => {
      console.warn('[PayPal Capture] Failed to send notification:', err);
    });

    console.log('[PayPal Capture] Success:', {
      paymentId,
      orderId,
      credits,
      userId: user.id,
      isMembership: metadata.type === 'membership',
    });

    return NextResponse.json({
      success: true,
      credits: credits,
      transactionId: paymentId,
      captureId: captureResult.captureId,
      membership: metadata.type === 'membership' ? { tier: metadata.tier_id, activated: true } : undefined,
    });
  } catch (error) {
    console.error('[PayPal Capture] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Activate membership after successful PayPal payment
 */
async function activateMembership(userId: string, tierId: string, supabase: any) {
  console.log('[PayPal Capture] Activating membership:', { userId, tierId });

  const serviceClient = createServiceClient();

  // Get tier details for monthly credits
  const { data: tier, error: tierError } = await serviceClient
    .from('membership_tiers')
    .select('*')
    .eq('id', tierId)
    .single();

  if (tierError || !tier) {
    console.error('[PayPal Capture] Failed to get tier details:', tierError);
    throw new Error('Failed to get tier details');
  }

  // Calculate membership dates (1 month from now)
  const startedAt = new Date();
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  // Check if user already has a membership record
  const { data: existingMembership } = await serviceClient
    .from('user_memberships')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existingMembership) {
    // Update existing membership
    const { error: updateError } = await serviceClient
      .from('user_memberships')
      .update({
        tier: tierId,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[PayPal Capture] Failed to update membership:', updateError);
      throw new Error(`Failed to update membership: ${updateError.message}`);
    }
  } else {
    // Create new membership record
    const { error: insertError } = await serviceClient
      .from('user_memberships')
      .insert({
        user_id: userId,
        tier: tierId,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        auto_renew: false,
      });

    if (insertError) {
      console.error('[PayPal Capture] Failed to create membership:', insertError);
      throw new Error(`Failed to create membership: ${insertError.message}`);
    }
  }

  // Add monthly credits to user
  if (tier.monthly_credits > 0) {
    await addCreditsToUser(userId, tier.monthly_credits);
    await createTransactionRecord(
      userId,
      'membership_grant',
      tier.monthly_credits,
      `${tier.name_en} membership monthly credits`
    );
  }

  console.log('[PayPal Capture] Membership activated:', {
    userId,
    tierId,
    expiresAt: expiresAt.toISOString(),
    creditsGranted: tier.monthly_credits,
  });
}
