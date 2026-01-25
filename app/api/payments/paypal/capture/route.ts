import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/requireUser';
import { capturePayPalOrder } from '@/lib/payment/paypal';
import { getServiceDbClientFromRequest } from '@/lib/db-client';

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireUser(request);
    const userId = authUser.userId;
    const body = await request.json().catch(() => null);
    const orderId = body?.orderId;
    const paymentId = body?.paymentId;

    if (!orderId || !paymentId) {
      return NextResponse.json({ success: false, error: 'Missing PayPal order information' }, { status: 400 });
    }

    const db = await getServiceDbClientFromRequest(request);
    const { data: payment, error: paymentError } = await db
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', userId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ success: false, error: 'Payment record not found' }, { status: 404 });
    }

    const storedOrderId = payment.paypal_order_id || payment.metadata?.paypal_order_id || null;
    if (storedOrderId && storedOrderId !== orderId) {
      return NextResponse.json({ success: false, error: 'PayPal order mismatch' }, { status: 400 });
    }

    if (payment.status === 'completed') {
      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        credits: payment.credits || 0,
        type: payment.metadata?.type || 'credits',
      });
    }

    const capture = await capturePayPalOrder(orderId);
    if (!capture.success) {
      return NextResponse.json({ success: false, error: 'PayPal capture failed', status: capture.status }, { status: 500 });
    }

    const nowIso = new Date().toISOString();
    const nextMetadata = {
      ...(payment.metadata || {}),
      paypal_order_id: orderId,
      paypal_capture_id: capture.captureId,
      paypal_payer_id: capture.payerId,
      paypal_status: capture.status,
      paypal_captured_at: nowIso,
    };

    const { error: updateError } = await db
      .from('payments')
      .update({
        status: 'completed',
        paypal_order_id: orderId,
        metadata: nextMetadata,
        updated_at: nowIso,
      })
      .eq('id', paymentId)
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Failed to update payment status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      paymentId,
      status: 'completed',
      amount: payment.amount,
      currency: payment.currency,
      credits: payment.credits || 0,
      type: payment.metadata?.type || 'credits',
    });
  } catch (error: any) {
    console.error('[PayPal Capture] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
