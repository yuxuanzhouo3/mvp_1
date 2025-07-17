import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyUSDTPayment, verifyAlipayPayment } from '@/lib/payment-receivers';

interface VerifyManualRequest {
  paymentId: string;
  paymentMethod: 'usdt' | 'alipay';
  transactionHash?: string;
  transactionId?: string;
  amount: number;
  fromAddress?: string;
}

export async function POST(request: NextRequest) {
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

    const body: VerifyManualRequest = await request.json();
    const { paymentId, paymentMethod, transactionHash, transactionId, amount, fromAddress } = body;

    // Validate request
    if (!paymentId || !paymentMethod || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify payment belongs to user
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', user.id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    let verificationResult = false;

    // Verify based on payment method
    switch (paymentMethod) {
      case 'usdt':
        if (!transactionHash || !fromAddress) {
          return NextResponse.json(
            { error: 'Missing transaction hash or from address for USDT payment' },
            { status: 400 }
          );
        }
        verificationResult = await verifyUSDTPayment(paymentId, transactionHash, amount, fromAddress);
        break;
      
      case 'alipay':
        if (!transactionId) {
          return NextResponse.json(
            { error: 'Missing transaction ID for Alipay payment' },
            { status: 400 }
          );
        }
        verificationResult = await verifyAlipayPayment(paymentId, transactionId, amount);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Unsupported payment method' },
          { status: 400 }
        );
    }

    if (verificationResult) {
      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        paymentId: paymentId,
      });
    } else {
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Manual payment verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 