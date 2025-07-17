import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe signature' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, supabase);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, supabase);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, supabase);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, supabase: any) {
  try {
    const paymentId = session.metadata?.payment_id;
    const userId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits || '0');

    if (!paymentId || !userId || !credits) {
      console.error('Missing metadata in checkout session:', session.metadata);
      return;
    }

    // Update payment status
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        stripe_charge_id: session.payment_intent as string,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (paymentError) {
      console.error('Failed to update payment status:', paymentError);
      return;
    }

    // Add credits to user's profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        credits: supabase.sql`credits + ${credits}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Failed to update user credits:', profileError);
      return;
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'credit_purchase',
        amount: credits,
        currency: 'CNY',
        description: `Purchased ${credits} credits via Stripe`,
        status: 'completed',
        metadata: {
          payment_id: paymentId,
          stripe_session_id: session.id,
          payment_method: 'stripe',
        }
      });

    if (transactionError) {
      console.error('Failed to create transaction record:', transactionError);
    }

    console.log(`Successfully processed payment for user ${userId}: ${credits} credits added`);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  try {
    // Find payment record by Stripe payment intent ID
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found for intent:', paymentIntent.id);
      return;
    }

    // Update payment status if not already completed
    if (payment.status !== 'completed') {
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          stripe_charge_id: paymentIntent.latest_charge as string,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error('Failed to update payment status:', updateError);
      }
    }
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  try {
    // Find and update payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (paymentError) {
      console.error('Failed to update failed payment:', paymentError);
    }
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
} 