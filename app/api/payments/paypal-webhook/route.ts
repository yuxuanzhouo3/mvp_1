import { NextRequest, NextResponse } from 'next/server';
import { verifyPayPalWebhook, type PayPalWebhookEvent } from '@/lib/payment/paypal';
import {
  updatePaymentStatus,
  addCreditsToUser,
  createTransactionRecord
} from '@/lib/payment/payments';
import { notifyPaymentSuccess, notifyPaymentFailed } from '@/lib/services/notifications';
import { createClient } from '@/lib/supabase/server';

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

  const supabase = createClient();

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

  // 更新支付状态
  await updatePaymentStatus(paymentId, 'completed', {
    ...payment.metadata,
    paypal_capture_id: resource.id,
    webhook_processed: true,
  });

  // 添加积分
  const credits = payment.metadata?.credits || 0;
  if (credits > 0 && payment.user_id) {
    await addCreditsToUser(payment.user_id, credits);

    // 创建交易记录
    await createTransactionRecord(
      payment.user_id,
      'credit_purchase',
      credits,
      `Purchased ${credits} credits via PayPal (Webhook)`,
      {
        payment_id: paymentId,
        paypal_capture_id: resource.id,
        payment_method: 'paypal',
        source: 'webhook',
      }
    );

    // 发送通知
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

  const supabase = createClient();

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

  const supabase = createClient();

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

  // 更新支付状态
  await updatePaymentStatus(paymentId, 'completed', {
    ...payment.metadata,
    paypal_order_id: resource.id,
    webhook_processed: true,
  });

  // 添加积分
  const credits = payment.metadata?.credits || 0;
  if (credits > 0 && payment.user_id) {
    await addCreditsToUser(payment.user_id, credits);

    await createTransactionRecord(
      payment.user_id,
      'credit_purchase',
      credits,
      `Purchased ${credits} credits via PayPal (Order Webhook)`,
      {
        payment_id: paymentId,
        paypal_order_id: resource.id,
        payment_method: 'paypal',
        source: 'webhook',
      }
    );

    notifyPaymentSuccess(payment.user_id, credits, paymentId, payment.amount).catch(console.warn);
  }

  console.log('[PayPal Webhook] Order completed processed:', paymentId);
}
