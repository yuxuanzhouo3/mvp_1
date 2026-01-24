import { createClient } from '@/lib/supabase/server';

// Payment Receiver Configuration
export interface PaymentReceiver {
  id: string;
  type: 'alipay' | 'wechat';
  name: string;
  account: string;
  qrCode?: string;
  isActive: boolean;
}

import { PAYMENT_CONFIG, getActivePaymentReceivers } from '@/config/payment-config';

// Payment receivers configuration from configuration
export const PAYMENT_RECEIVERS: PaymentReceiver[] = getActivePaymentReceivers();

export async function getPaymentReceiver(type: 'alipay' | 'wechat'): Promise<PaymentReceiver | null> {
  const receiver = PAYMENT_RECEIVERS.find(r => r.type === type && r.isActive);
  return receiver || null;
}

export async function createAlipayPaymentRequest(
  paymentId: string,
  amount: number,
  userId: string
): Promise<{ qrCode: string; amount: number; account: string; paymentId: string }> {
  const receiver = await getPaymentReceiver('alipay');
  
  if (!receiver) {
    throw new Error('Alipay receiver not available');
  }

  // Generate QR code for Alipay payment
  // In production, you would integrate with Alipay API
  const qrCodeData = {
    amount: amount,
    account: receiver.account,
    paymentId: paymentId,
    timestamp: Date.now(),
  };

  // Create QR code URL (you can use a QR code generation service)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify(qrCodeData))}`;

  const supabase = createClient();
  
  // Update payment record with Alipay details
  await supabase
    .from('payments')
    .update({
      status: 'pending',
      metadata: {
        alipay_account: receiver.account,
        alipay_amount: amount,
        alipay_qr_code: qrCodeUrl,
        payment_id: paymentId,
        user_id: userId,
        created_at: new Date().toISOString(),
      }
    })
    .eq('id', paymentId);

  return {
    qrCode: qrCodeUrl,
    amount: amount,
    account: receiver.account,
    paymentId: paymentId,
  };
}

export async function verifyAlipayPayment(
  paymentId: string,
  transactionId: string,
  amount: number
): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Get payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      console.error('Payment not found:', paymentId);
      return false;
    }

    // Verify payment details
    const expectedAmount = payment.metadata?.alipay_amount;

    if (amount !== expectedAmount) {
      console.error('Amount mismatch:', { expected: expectedAmount, received: amount });
      return false;
    }

    // Update payment status
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        metadata: {
          ...payment.metadata,
          alipay_transaction_id: transactionId,
          verified_at: new Date().toISOString(),
        }
      })
      .eq('id', paymentId);

    return true;
  } catch (error) {
    console.error('Alipay payment verification error:', error);
    return false;
  }
}
