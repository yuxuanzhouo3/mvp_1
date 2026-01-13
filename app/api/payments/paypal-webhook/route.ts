import { NextRequest, NextResponse } from 'next/server';
import { verifyPayPalWebhook, type PayPalWebhookEvent } from '@/lib/payment/paypal';
import { updatePaymentStatus } from '@/lib/payment/payments';
import { notifyPaymentSuccess, notifyPaymentFailed } from '@/lib/services/notifications';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  console.log('[PayPal Webhook] ===== Received webhook request =====');

  try {
    const body = await request.text();

    // 获取 PayPal 签名头
    const headers = {
      'paypal-auth-algo': request.headers.get('paypal-auth-algo') || '',
      'paypal-cert-url': request.headers.get('paypal-cert-url') || '',
      'paypal-transmission-id': request.headers.get('paypal-transmission-id') || '',
      'paypal-transmission-sig': request.headers.get('paypal-transmission-sig') || '',
      'paypal-transmission-time': request.headers.get('paypal-transmission-time') || '',
    };

    console.log('[PayPal Webhook] Headers:', {
      hasAuthAlgo: !!headers['paypal-auth-algo'],
      hasTransmissionId: !!headers['paypal-transmission-id'],
    });

    // 验证 Webhook 签名（生产环境必须验证）
    if (process.env.PAYPAL_MODE === 'live') {
      const isValid = await verifyPayPalWebhook(headers, body);
      if (!isValid) {
        console.error('[PayPal Webhook] Invalid signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        );
      }
      console.log('[PayPal Webhook] Signature verified');
    } else {
      console.log('[PayPal Webhook] Skipping signature verification (sandbox mode)');
    }

    const event: PayPalWebhookEvent = JSON.parse(body);

    console.log('[PayPal Webhook] Event:', {
      id: event.id,
      type: event.event_type,
      resourceType: event.resource_type,
    });

    // 处理不同类型的事件
    switch (event.event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        // 订单已批准，等待 capture（通常由前端处理）
        console.log('[PayPal Webhook] Order approved:', event.resource.id);
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        await handleCaptureCompleted(event);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.DECLINED':
        await handleCaptureFailed(event);
        break;

      case 'CHECKOUT.ORDER.COMPLETED':
        await handleOrderCompleted(event);
        break;

      default:
        console.log('[PayPal Webhook] Unhandled event type:', event.event_type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[PayPal Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * 处理支付捕获完成事件
 */
async function handleCaptureCompleted(event: PayPalWebhookEvent) {
  const resource = event.resource;
  const paymentId = resource.custom_id || resource.supplementary_data?.payment_id;

  if (!paymentId) {
    console.warn('[PayPal Webhook] No payment ID in capture event');
    return;
  }

  console.log('[PayPal Webhook] Processing capture completed:', {
    captureId: resource.id,
    paymentId,
    amount: resource.amount?.value,
  });

  const supabase = createServiceClient();

  // 查找支付记录
  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (error || !payment) {
    console.error('[PayPal Webhook] Payment not found:', paymentId);
    return;
  }

  // 检查是否已处理（幂等性）
  if (payment.status === 'completed') {
    console.log('[PayPal Webhook] Payment already completed:', paymentId);
    return;
  }

  // 更新支付状态 - 积分添加由数据库触发器 trigger_on_payment_completed 自动完成
  // 触发器会调用 add_user_credits() 函数，该函数会自动创建交易记录
  await updatePaymentStatus(paymentId, 'completed', {
    ...payment.metadata,
    paypal_capture_id: resource.id,
    webhook_processed: true,
  });

  // Check if this is a membership payment and activate membership
  const metadata = payment.metadata || {};
  if (metadata.type === 'membership' && metadata.tier_id && payment.user_id) {
    await activateMembership(payment.user_id, metadata.tier_id);
  }

  // 发送通知
  const credits = payment.credits || 0;
  if (credits > 0 && payment.user_id) {
    notifyPaymentSuccess(payment.user_id, credits, paymentId, payment.amount).catch(console.warn);
  }

  console.log('[PayPal Webhook] Capture completed processed:', paymentId);
}

/**
 * 处理支付捕获失败事件
 */
async function handleCaptureFailed(event: PayPalWebhookEvent) {
  const resource = event.resource;
  const paymentId = resource.custom_id || resource.supplementary_data?.payment_id;

  if (!paymentId) {
    console.warn('[PayPal Webhook] No payment ID in failed capture event');
    return;
  }

  console.log('[PayPal Webhook] Processing capture failed:', {
    captureId: resource.id,
    paymentId,
    eventType: event.event_type,
  });

  const supabase = createServiceClient();

  // 查找支付记录
  const { data: payment } = await supabase
    .from('payments')
    .select('user_id')
    .eq('id', paymentId)
    .single();

  // 更新支付状态为失败
  await updatePaymentStatus(paymentId, 'failed', {
    paypal_capture_id: resource.id,
    failure_reason: event.event_type,
  });

  // 发送失败通知
  if (payment?.user_id) {
    notifyPaymentFailed(payment.user_id, paymentId, 'PayPal payment was declined').catch(console.warn);
  }

  console.log('[PayPal Webhook] Capture failed processed:', paymentId);
}

/**
 * 处理订单完成事件（作为 capture 的备用）
 */
async function handleOrderCompleted(event: PayPalWebhookEvent) {
  const resource = event.resource;
  const purchaseUnit = (resource as any).purchase_units?.[0];
  const paymentId = purchaseUnit?.reference_id || purchaseUnit?.custom_id;

  if (!paymentId) {
    console.warn('[PayPal Webhook] No payment ID in order completed event');
    return;
  }

  console.log('[PayPal Webhook] Processing order completed:', {
    orderId: resource.id,
    paymentId,
  });

  const supabase = createServiceClient();

  // 查找支付记录
  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (error || !payment) {
    console.error('[PayPal Webhook] Payment not found for order:', paymentId);
    return;
  }

  // 如果已完成，跳过
  if (payment.status === 'completed') {
    console.log('[PayPal Webhook] Payment already completed:', paymentId);
    return;
  }

  // 更新支付状态 - 积分添加由数据库触发器 trigger_on_payment_completed 自动完成
  // 触发器会调用 add_user_credits() 函数，该函数会自动创建交易记录
  await updatePaymentStatus(paymentId, 'completed', {
    ...payment.metadata,
    paypal_order_id: resource.id,
    webhook_processed: true,
  });

  // Check if this is a membership payment and activate membership
  const metadata = payment.metadata || {};
  if (metadata.type === 'membership' && metadata.tier_id && payment.user_id) {
    await activateMembership(payment.user_id, metadata.tier_id);
  }

  // 发送通知
  const credits = payment.credits || 0;
  if (credits > 0 && payment.user_id) {
    notifyPaymentSuccess(payment.user_id, credits, paymentId, payment.amount).catch(console.warn);
  }

  console.log('[PayPal Webhook] Order completed processed:', paymentId);
}

/**
 * Activate membership after successful PayPal payment
 */
async function activateMembership(userId: string, tierId: string) {
  console.log('[PayPal Webhook] Activating membership:', { userId, tierId });

  const serviceClient = createServiceClient();

  // Get tier details for monthly credits
  const { data: tier, error: tierError } = await serviceClient
    .from('membership_tiers')
    .select('*')
    .eq('id', tierId)
    .single();

  if (tierError || !tier) {
    console.error('[PayPal Webhook] Failed to get tier details:', tierError);
    return;
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
      console.error('[PayPal Webhook] Failed to update membership:', updateError);
      return;
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
      console.error('[PayPal Webhook] Failed to create membership:', insertError);
      return;
    }
  }

  // NOTE: Credits are automatically added by database trigger (on_payment_completed)
  // when payment status changes to 'completed'. Do NOT manually add credits here
  // to avoid double-crediting the user.

  console.log('[PayPal Webhook] Membership activated:', {
    userId,
    tierId,
    expiresAt: expiresAt.toISOString(),
    creditsGranted: tier.monthly_credits,
  });
}
