import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { processStripeWebhook } from '@/lib/payment/payments';

// 延迟初始化 Stripe，避免在构建时因缺少环境变量而失败
function getStripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia' as any,
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let eventType = 'unknown';
  let eventId = 'unknown';

  try {
    const stripe = getStripeClient();
    if (!stripe) {
      console.error('[Stripe Webhook] Stripe is not configured');
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const testWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST;

    if (!webhookSecret) {
      console.error('[Stripe Webhook] Webhook secret is not configured');
      return NextResponse.json(
        { error: 'Webhook secret is not configured' },
        { status: 500 }
      );
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Stripe Webhook] Missing stripe signature');
      return NextResponse.json(
        { error: 'Missing stripe signature' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    // Try primary webhook secret first, then fall back to test secret
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (primaryErr) {
      // If primary fails and test secret is available, try that
      if (testWebhookSecret) {
        try {
          event = stripe.webhooks.constructEvent(body, signature, testWebhookSecret);
          console.log('[Stripe Webhook] Verified using test webhook secret');
        } catch (testErr) {
          console.error('[Stripe Webhook] Signature verification failed with both secrets:', {
            primaryError: primaryErr instanceof Error ? primaryErr.message : primaryErr,
            testError: testErr instanceof Error ? testErr.message : testErr,
          });
          return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 400 }
          );
        }
      } else {
        console.error('[Stripe Webhook] Signature verification failed:', primaryErr);
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        );
      }
    }

    eventType = event.type;
    eventId = event.id;

    console.log('[Stripe Webhook] Event received:', {
      eventId,
      eventType,
      livemode: event.livemode,
    });

    // Handle the event using utility function
    await processStripeWebhook(event);

    const duration = Date.now() - startTime;
    console.log('[Stripe Webhook] Event processed successfully:', {
      eventId,
      eventType,
      durationMs: duration,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Stripe Webhook] Handler failed:', {
      eventId,
      eventType,
      durationMs: duration,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return 200 to prevent Stripe from retrying for non-recoverable errors
    // Only return 500 for transient errors that should be retried
    const isTransientError = error instanceof Error &&
      (error.message.includes('timeout') ||
       error.message.includes('connection') ||
       error.message.includes('ECONNREFUSED'));

    if (isTransientError) {
      return NextResponse.json(
        { error: 'Webhook handler failed - will retry' },
        { status: 500 }
      );
    }

    // For non-transient errors, acknowledge receipt to prevent retry loops
    return NextResponse.json({
      received: true,
      warning: 'Event processing encountered an error'
    });
  }
}
