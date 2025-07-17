import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { 
  createPaymentRecord, 
  validatePaymentAmount, 
  validateCreditAmount,
  getPackageById 
} from '@/lib/payments';
import { createUSDTPaymentRequest, createAlipayPaymentRequest } from '@/lib/payment-receivers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

interface CreateIntentRequest {
  packageId: string;
  paymentMethod: 'stripe' | 'usdt' | 'alipay';
  amount: number;
  credits: number;
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

    const body: CreateIntentRequest = await request.json();
    const { packageId, paymentMethod, amount, credits } = body;

    // Validate request
    if (!packageId || !paymentMethod || !amount || !credits) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate amounts
    if (!validatePaymentAmount(amount)) {
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      );
    }

    if (!validateCreditAmount(credits)) {
      return NextResponse.json(
        { error: 'Invalid credit amount' },
        { status: 400 }
      );
    }

    // Verify package exists
    const packageData = getPackageById(packageId);
    if (!packageData) {
      return NextResponse.json(
        { error: 'Invalid package ID' },
        { status: 400 }
      );
    }

    // Create payment record in database
    const payment = await createPaymentRecord(
      user.id,
      amount,
      paymentMethod,
      packageId,
      credits
    );

    // Handle different payment methods
    switch (paymentMethod) {
      case 'stripe':
        return await handleStripePayment(payment, amount, credits);
      
      case 'usdt':
        return await handleUSDTPayment(payment, amount, user.id);
      
      case 'alipay':
        return await handleAlipayPayment(payment, amount, user.id);
      
      default:
        return NextResponse.json(
          { error: 'Unsupported payment method' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleStripePayment(payment: any, amount: number, credits: number) {
  try {
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cny',
            product_data: {
              name: `${credits} Credits Package`,
              description: `Purchase ${credits} credits for PersonaLink`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
      metadata: {
        payment_id: payment.id,
        user_id: payment.user_id,
        credits: credits.toString(),
      },
    });

    // Update payment record with Stripe session ID
    const supabase = createClient();
    await supabase
      .from('payments')
      .update({
        stripe_payment_intent_id: session.id,
        metadata: {
          ...payment.metadata,
          stripe_session_id: session.id,
        }
      })
      .eq('id', payment.id);

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Stripe payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create Stripe session' },
      { status: 500 }
    );
  }
}

async function handleUSDTPayment(payment: any, amount: number, userId: string) {
  try {
    // Create USDT payment request with real wallet address
    const usdtPayment = await createUSDTPaymentRequest(payment.id, amount, userId);
    
    return NextResponse.json({
      paymentAddress: usdtPayment.address,
      amount: usdtPayment.amount,
      network: usdtPayment.network,
      paymentId: usdtPayment.paymentId,
      instructions: `Please send exactly ${amount} USDT to the address above using ${usdtPayment.network} network. Include the payment ID in the memo if possible.`,
    });
  } catch (error) {
    console.error('USDT payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create USDT payment' },
      { status: 500 }
    );
  }
}

async function handleAlipayPayment(payment: any, amount: number, userId: string) {
  try {
    // Create Alipay payment request with real account
    const alipayPayment = await createAlipayPaymentRequest(payment.id, amount, userId);
    
    return NextResponse.json({
      qrCodeUrl: alipayPayment.qrCode,
      amount: alipayPayment.amount,
      account: alipayPayment.account,
      paymentId: alipayPayment.paymentId,
      instructions: `Please scan the QR code with Alipay to pay ${amount} CNY. Make sure to include the payment ID in the note.`,
    });
  } catch (error) {
    console.error('Alipay payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create Alipay payment' },
      { status: 500 }
    );
  }
} 