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
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Charge);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { userId, creditsPurchased } = paymentIntent.metadata;

  // Update transaction status
  await supabase
    .from('transactions')
    .update({ status: 'succeeded' })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // Add credits to user
  if (userId && creditsPurchased) {
    await supabase
      .from('profiles')
      .update({
        credits: supabase.rpc('increment_credits', {
          user_id: userId,
          credits_to_add: parseInt(creditsPurchased),
        }),
      })
      .eq('id', userId);
  }

  console.log(`Payment succeeded for user ${userId}: ${creditsPurchased} credits`);
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  // Update transaction status
  await supabase
    .from('transactions')
    .update({ status: 'failed' })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  console.log(`Payment failed for payment intent: ${paymentIntent.id}`);
}

async function handleRefund(charge: Stripe.Charge) {
  // Find the transaction and update status
  const { data: transaction } = await supabase
    .from('transactions')
    .select('user_id, credits_purchased')
    .eq('stripe_payment_intent_id', charge.payment_intent)
    .single();

  if (transaction) {
    // Deduct credits from user
    await supabase
      .from('profiles')
      .update({
        credits: supabase.rpc('decrement_credits', {
          user_id: transaction.user_id,
          credits_to_deduct: transaction.credits_purchased,
        }),
      })
      .eq('id', transaction.user_id);

    // Update transaction status
    await supabase
      .from('transactions')
      .update({ status: 'refunded' })
      .eq('stripe_payment_intent_id', charge.payment_intent);
  }

  console.log(`Refund processed for payment intent: ${charge.payment_intent}`);
} 