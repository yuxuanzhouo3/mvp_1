import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
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

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount: amount,
        currency: 'CNY',
        payment_method: paymentMethod,
        status: 'pending',
        description: `Purchase ${credits} credits - ${packageId} package`,
        metadata: {
          packageId,
          credits,
          paymentMethod
        }
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    // Handle different payment methods
    switch (paymentMethod) {
      case 'stripe':
        return await handleStripePayment(payment, amount, credits);
      
      case 'usdt':
        return await handleUSDTPayment(payment, amount);
      
      case 'alipay':
        return await handleAlipayPayment(payment, amount);
      
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

async function handleUSDTPayment(payment: any, amount: number) {
  try {
    // Generate USDT payment address (in production, this would be your actual USDT wallet)
    const paymentAddress = 'TRC20_WALLET_ADDRESS_HERE'; // Replace with actual address
    
    // Update payment record with USDT details
    const supabase = createClient();
    await supabase
      .from('payments')
      .update({
        metadata: {
          ...payment.metadata,
          usdt_address: paymentAddress,
          usdt_amount: amount,
        }
      })
      .eq('id', payment.id);

    return NextResponse.json({
      paymentAddress,
      amount: amount,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error('USDT payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create USDT payment' },
      { status: 500 }
    );
  }
}

async function handleAlipayPayment(payment: any, amount: number) {
  try {
    // Generate Alipay QR code URL (in production, integrate with Alipay API)
    const qrCodeUrl = `https://api.alipay.com/qrcode?amount=${amount}&order_id=${payment.id}`;
    
    // Update payment record with Alipay details
    const supabase = createClient();
    await supabase
      .from('payments')
      .update({
        metadata: {
          ...payment.metadata,
          alipay_qr_url: qrCodeUrl,
        }
      })
      .eq('id', payment.id);

    return NextResponse.json({
      qrCodeUrl,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error('Alipay payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create Alipay payment' },
      { status: 500 }
    );
  }
} 