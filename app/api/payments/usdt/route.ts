import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const USDT_CONTRACT = process.env.USDT_TRC20_CONTRACT!;
const RECEIVER_ADDRESS = process.env.USDT_RECEIVER_ADDRESS!;
const TRON_API_URL = process.env.TRON_API_URL!;
const TRON_API_KEY = process.env.TRON_API_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { amount, userId } = await request.json();

    if (!amount || !userId) {
      return NextResponse.json(
        { error: 'Amount and userId are required' },
        { status: 400 }
      );
    }

    // Calculate credits (1 USDT = 10 credits)
    const creditsPurchased = Math.floor(amount * 10);

    // Generate unique deposit address or use main address
    const depositAddress = RECEIVER_ADDRESS;

    // Store pending transaction
    const { data: transaction, error: dbError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount,
        currency: 'usdt',
        payment_method: 'usdt_trc20',
        status: 'pending',
        credits_purchased: creditsPurchased,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to create transaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      depositAddress,
      amount,
      transactionId: transaction.id,
      creditsPurchased,
    });
  } catch (error) {
    console.error('USDT payment error:', error);
    return NextResponse.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Get transaction details
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Check if payment has been received
    const paymentStatus = await checkUSDTPayment(transaction.amount);

    if (paymentStatus.received) {
      // Update transaction status
      await supabase
        .from('transactions')
        .update({ status: 'succeeded' })
        .eq('id', transactionId);

      // Add credits to user
      await supabase
        .from('profiles')
        .update({
          credits: supabase.rpc('increment_credits', {
            user_id: transaction.user_id,
            credits_to_add: transaction.credits_purchased,
          }),
        })
        .eq('id', transaction.user_id);
    }

    return NextResponse.json({
      status: paymentStatus.received ? 'succeeded' : 'pending',
      received: paymentStatus.received,
      amount: transaction.amount,
    });
  } catch (error) {
    console.error('USDT status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}

async function checkUSDTPayment(expectedAmount: number): Promise<{ received: boolean }> {
  try {
    // Query TronGrid API for recent transactions
    const response = await fetch(
      `${TRON_API_URL}/v1/accounts/${RECEIVER_ADDRESS}/transactions/trc20?only_confirmed=true&limit=10`,
      {
        headers: {
          'TRON-PRO-API-KEY': TRON_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }

    const data = await response.json();
    const recentTransactions = data.data || [];

    // Check for recent USDT transactions matching the expected amount
    const matchingTransaction = recentTransactions.find((tx: any) => {
      return (
        tx.contract_address.toLowerCase() === USDT_CONTRACT.toLowerCase() &&
        parseFloat(tx.value) / Math.pow(10, 6) >= expectedAmount && // USDT has 6 decimals
        tx.to === RECEIVER_ADDRESS &&
        Date.now() - tx.block_timestamp < 30 * 60 * 1000 // Within last 30 minutes
      );
    });

    return { received: !!matchingTransaction };
  } catch (error) {
    console.error('Error checking USDT payment:', error);
    return { received: false };
  }
} 