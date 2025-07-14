import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'usd', paymentMethod, userId } = await request.json();

    if (!amount || !userId) {
      return NextResponse.json(
        { error: 'Amount and userId are required' },
        { status: 400 }
      );
    }

    // Calculate credits based on amount (1 USD = 10 credits)
    const creditsPurchased = Math.floor(amount * 10);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      payment_method_types: ['card'],
      metadata: {
        userId,
        creditsPurchased: creditsPurchased.toString(),
      },
    });

    // Store transaction in database
    const { error: dbError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount,
        currency,
        payment_method: 'stripe',
        status: 'pending',
        stripe_payment_intent_id: paymentIntent.id,
        credits_purchased: creditsPurchased,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to store transaction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      creditsPurchased,
    });
  } catch (error) {
    console.error('Stripe payment error:', error);
    return NextResponse.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { paymentIntentId, status } = await request.json();

    if (!paymentIntentId || !status) {
      return NextResponse.json(
        { error: 'PaymentIntentId and status are required' },
        { status: 400 }
      );
    }

    // Update transaction status in database
    const { error: dbError } = await supabase
      .from('transactions')
      .update({ status })
      .eq('stripe_payment_intent_id', paymentIntentId);

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to update transaction' },
        { status: 500 }
      );
    }

    // If payment is successful, add credits to user
    if (status === 'succeeded') {
      const { data: transaction } = await supabase
        .from('transactions')
        .select('user_id, credits_purchased')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (transaction) {
        const { error: creditError } = await supabase
          .from('profiles')
          .update({
            credits: supabase.rpc('increment_credits', {
              user_id: transaction.user_id,
              credits_to_add: transaction.credits_purchased,
            }),
          })
          .eq('id', transaction.user_id);

        if (creditError) {
          console.error('Credit update error:', creditError);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment update error:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
} 