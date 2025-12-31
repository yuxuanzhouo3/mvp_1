import { createClient } from '@/lib/supabase/server';

// USDT Wallet Configuration
export interface USDTWallet {
  id: string;
  address: string;
  network: 'TRC20' | 'ERC20' | 'BEP20';
  label: string;
  isActive: boolean;
}

// Payment Receiver Configuration
export interface PaymentReceiver {
  id: string;
  type: 'usdt' | 'alipay' | 'wechat';
  name: string;
  account: string;
  qrCode?: string;
  isActive: boolean;
}

import { PAYMENT_CONFIG, getActiveUSDTWallets, getActivePaymentReceivers } from '@/config/payment-config';

// Real USDT wallet addresses from configuration
export const USDT_WALLETS: USDTWallet[] = getActiveUSDTWallets();

// Payment receivers configuration from configuration
export const PAYMENT_RECEIVERS: PaymentReceiver[] = getActivePaymentReceivers();

export async function getAvailableUSDTWallet(): Promise<USDTWallet | null> {
  const activeWallets = USDT_WALLETS.filter(wallet => wallet.isActive);
  // Return the first active wallet (you can implement load balancing here)
  return activeWallets.length > 0 ? activeWallets[0] : null;
}

export async function getPaymentReceiver(type: 'alipay' | 'wechat'): Promise<PaymentReceiver | null> {
  const receiver = PAYMENT_RECEIVERS.find(r => r.type === type && r.isActive);
  return receiver || null;
}

export async function createUSDTPaymentRequest(
  paymentId: string,
  amount: number,
  userId: string
): Promise<{ address: string; amount: number; network: string; paymentId: string }> {
  const wallet = await getAvailableUSDTWallet();
  
  if (!wallet) {
    throw new Error('No available USDT wallet');
  }

  const supabase = createClient();
  
  // Update payment record with USDT details
  await supabase
    .from('payments')
    .update({
      status: 'pending',
      metadata: {
        usdt_address: wallet.address,
        usdt_network: wallet.network,
        usdt_amount: amount,
        payment_id: paymentId,
        user_id: userId,
        created_at: new Date().toISOString(),
      }
    })
    .eq('id', paymentId);

  return {
    address: wallet.address,
    amount: amount,
    network: wallet.network,
    paymentId: paymentId,
  };
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

export async function verifyUSDTPayment(
  paymentId: string,
  transactionHash: string,
  amount: number,
  fromAddress: string
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
    const expectedAmount = payment.metadata?.usdt_amount;
    const expectedAddress = payment.metadata?.usdt_address;

    if (amount !== expectedAmount) {
      console.error('Amount mismatch:', { expected: expectedAmount, received: amount });
      return false;
    }

    if (fromAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
      console.error('Address mismatch:', { expected: expectedAddress, received: fromAddress });
      return false;
    }

    // Update payment status
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        metadata: {
          ...payment.metadata,
          transaction_hash: transactionHash,
          verified_at: new Date().toISOString(),
        }
      })
      .eq('id', paymentId);

    // Add credits to user
    const credits = payment.metadata?.credits || 0;
    if (credits > 0) {
      await addCreditsToUser(payment.user_id, credits);
      
      // Create transaction record
      await createTransactionRecord(
        payment.user_id,
        'credit_purchase',
        credits,
        `Purchased ${credits} credits via USDT`,
        {
          payment_id: paymentId,
          transaction_hash: transactionHash,
          payment_method: 'usdt',
        }
      );
    }

    return true;
  } catch (error) {
    console.error('USDT payment verification error:', error);
    return false;
  }
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

    // Add credits to user
    const credits = payment.metadata?.credits || 0;
    if (credits > 0) {
      await addCreditsToUser(payment.user_id, credits);
      
      // Create transaction record
      await createTransactionRecord(
        payment.user_id,
        'credit_purchase',
        credits,
        `Purchased ${credits} credits via Alipay`,
        {
          payment_id: paymentId,
          alipay_transaction_id: transactionId,
          payment_method: 'alipay',
        }
      );
    }

    return true;
  } catch (error) {
    console.error('Alipay payment verification error:', error);
    return false;
  }
}

// Helper functions (imported from payments.ts)
async function addCreditsToUser(userId: string, credits: number) {
  const supabase = createClient();
  
  // First get current credits
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch user profile: ${fetchError.message}`);
  }

  const currentCredits = profile?.credits || 0;
  const newCredits = currentCredits + credits;

  const { error } = await supabase
    .from('profiles')
    .update({
      credits: newCredits,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to add credits to user: ${error.message}`);
  }
}

async function createTransactionRecord(
  userId: string,
  type: string,
  amount: number,
  description: string,
  metadata?: Record<string, any>
) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type,
      amount,
      currency: 'CNY',
      description,
      status: 'completed',
      metadata,
    });

  if (error) {
    throw new Error(`Failed to create transaction record: ${error.message}`);
  }
} 