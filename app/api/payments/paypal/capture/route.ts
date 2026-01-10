import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { capturePayPalOrder } from '@/lib/payment/paypal';
import {
  updatePaymentStatus,
  addCreditsToUser,
  createTransactionRecord,
} from '@/lib/payment/payments';
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

    // 获取支付记录
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', user.id)
      .single();

    if (paymentError || !payment) {
      console.error('[PayPal Capture] Payment not found:', paymentError);
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // 检查支付状态，防止重复处理
    if (payment.status === 'completed') {
      console.log('[PayPal Capture] Payment already completed:', paymentId);
      return NextResponse.json({
        success: true,
        message: 'Payment already completed',
        credits: payment.metadata?.credits || 0,
      });
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

    // 更新支付状态为完成
    await updatePaymentStatus(paymentId, 'completed', {
      ...payment.metadata,
      paypal_order_id: orderId,
      paypal_capture_id: captureResult.captureId,
      paypal_payer_id: captureResult.payerId,
      paypal_status: captureResult.status,
    });

    // 添加积分
    const credits = payment.metadata?.credits || 0;
    if (credits > 0) {
      await addCreditsToUser(user.id, credits);
    }

    // 创建交易记录
    await createTransactionRecord(
      user.id,
      'credit_purchase',
      credits,
      `Purchased ${credits} credits via PayPal`,
      paymentId
    );

    // 发送成功通知
    notifyPaymentSuccess(user.id, credits, paymentId, payment.amount).catch((err) => {
      console.warn('[PayPal Capture] Failed to send notification:', err);
    });

    console.log('[PayPal Capture] Success:', {
      paymentId,
      orderId,
      credits,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      credits: credits,
      transactionId: paymentId,
      captureId: captureResult.captureId,
    });
  } catch (error) {
    console.error('[PayPal Capture] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
