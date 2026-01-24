import { createServiceClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { notifyPaymentSuccess, notifyPaymentFailed } from '@/lib/services/notifications';
import { isPayPalAvailable } from './paypal';
import { getDefaultCurrency } from '@/config/payment-config';

// 注意: Stripe 客户端不在模块级别初始化，避免构建时因缺少环境变量而失败
// processStripeWebhook 函数接收的是已解析的 Stripe.Event，不需要 Stripe 客户端

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  processingTime: string;
  isAvailable: boolean;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  originalPrice?: number;
  popular?: boolean;
  bestValue?: boolean;
  features: string[];
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: '入门包',
    credits: 50,
    price: 9.99,
    features: ['50 积分', '基础匹配', '标准客服'],
  },
  {
    id: 'popular',
    name: '热门包',
    credits: 150,
    price: 24.99,
    originalPrice: 29.99,
    popular: true,
    features: ['150 积分', '优先匹配', '优先客服', '高级筛选'],
  },
  {
    id: 'premium',
    name: '高级包',
    credits: 300,
    price: 44.99,
    originalPrice: 59.99,
    bestValue: true,
    features: ['300 积分', '超级匹配', '专属客服', '无限筛选', '数据分析'],
  },
  {
    id: 'ultimate',
    name: '终极包',
    credits: 500,
    price: 69.99,
    originalPrice: 99.99,
    features: ['500 积分', 'VIP 匹配', '24/7 客服', '所有功能', '专属活动'],
  },
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'stripe',
    name: '信用卡/借记卡',
    description: 'Visa, Mastercard, American Express',
    processingTime: '即时到账',
    isAvailable: !!process.env.STRIPE_SECRET_KEY,
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'PayPal, Credit/Debit Card',
    processingTime: '即时到账',
    isAvailable: isPayPalAvailable(),
  },
  {
    id: 'alipay',
    name: '支付宝',
    description: '支付宝扫码支付',
    processingTime: '即时到账',
    isAvailable: process.env.NEXT_PUBLIC_DEPLOYMENT_REGION === 'CN',
  },
];

export async function createPaymentRecord(
  userId: string,
  amount: number,
  paymentMethod: string,
  packageId: string,
  credits: number,
  idempotencyKey?: string
) {
  const supabase = createServiceClient();
  const currency = getDefaultCurrency(); // Get currency based on deployment region (USD for INTL, CNY for CN)

  const insertData: any = {
    user_id: userId,
    amount: amount,
    currency: currency,
    credits: credits,
    payment_method: paymentMethod,
    status: 'pending',
    metadata: {
      packageId,
      description: `Purchase ${credits} credits - ${packageId} package`,
    },
  };

  if (idempotencyKey) {
    insertData.idempotency_key = idempotencyKey;
  }

  const query = idempotencyKey
    ? supabase.from('payments').upsert(insertData, { onConflict: 'user_id,idempotency_key' }).select().single()
    : supabase.from('payments').insert(insertData).select().single();

  const { data: payment, error } = await query;

  if (error) {
    throw new Error(`Failed to create payment record: ${error.message}`);
  }

  return payment;
}

export async function updatePaymentStatus(
  paymentId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded',
  additionalData?: Record<string, any>
) {
  const supabase = createServiceClient();

  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (additionalData) {
    updateData.metadata = additionalData;
  }

  const { error } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', paymentId);

  if (error) {
    throw new Error(`Failed to update payment status: ${error.message}`);
  }
}

export async function addCreditsToUser(userId: string, credits: number) {
  const supabase = createServiceClient();

  // First get current credits
  const { data: profile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('credits')
    .eq('user_id', userId)
    .single();

  // 如果用户没有 profile 记录，尝试创建一个
  if (fetchError && fetchError.code === 'PGRST116') {
    console.log('[addCreditsToUser] User profile not found, creating one:', userId);
    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        credits: credits,
        credits_updated_at: new Date().toISOString(),
      });

    if (insertError) {
      throw new Error(`Failed to create user profile: ${insertError.message}`);
    }
    return;
  }

  if (fetchError) {
    throw new Error(`Failed to fetch user profile: ${fetchError.message}`);
  }

  const currentCredits = profile?.credits || 0;
  const newCredits = currentCredits + credits;

  const { error } = await supabase
    .from('user_profiles')
    .update({
      credits: newCredits,
      credits_updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to add credits to user: ${error.message}`);
  }
}

export async function createTransactionRecord(
  userId: string,
  type: string,
  amount: number,
  description: string,
  paymentId?: string
) {
  const supabase = createServiceClient();

  // Get current balance
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('credits')
    .eq('user_id', userId)
    .single();

  const currentBalance = profile?.credits || 0;

  const { error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type,
      amount,
      balance_before: type === 'credit_purchase' ? currentBalance - amount : currentBalance + Math.abs(amount),
      balance_after: currentBalance,
      reference_type: paymentId ? 'payment' : undefined,
      reference_id: paymentId,
      description,
    });

  if (error) {
    throw new Error(`Failed to create transaction record: ${error.message}`);
  }
}

export async function getPaymentById(paymentId: string, userId: string) {
  const supabase = createServiceClient();

  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .eq('user_id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to get payment: ${error.message}`);
  }

  return payment;
}

export async function getUserPaymentHistory(
  userId: string,
  limit: number = 10,
  offset: number = 0,
  status?: string
) {
  const supabase = createServiceClient();

  let query = supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: payments, error } = await query;

  if (error) {
    throw new Error(`Failed to get payment history: ${error.message}`);
  }

  return payments || [];
}

export function validatePaymentAmount(amount: number): boolean {
  return amount > 0 && amount <= 10000; // Max 10,000 CNY
}

export function validateCreditAmount(credits: number): boolean {
  return credits > 0 && credits <= 10000; // Max 10,000 credits
}

export function getPackageById(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
}

export function getAvailablePaymentMethods(): PaymentMethod[] {
  return PAYMENT_METHODS.filter(method => method.isAvailable);
}

export async function processStripeWebhook(event: Stripe.Event) {
  const supabase = createServiceClient();

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      // Check if this is a membership subscription or credit purchase
      if (session.metadata?.type === 'membership') {
        await handleMembershipCheckoutCompleted(session, supabase);
      } else {
        await handleStripeCheckoutCompleted(session, supabase);
      }
      break;

    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handleStripePaymentSucceeded(paymentIntent, supabase);
      break;

    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object as Stripe.PaymentIntent;
      await handleStripePaymentFailed(failedIntent, supabase);
      break;
  }
}

async function handleStripeCheckoutCompleted(session: Stripe.Checkout.Session, supabase: any) {
  const paymentId = session.metadata?.payment_id;
  const userId = session.metadata?.user_id;
  const credits = parseInt(session.metadata?.credits || '0');

  if (!paymentId || !userId || !credits) {
    throw new Error('Missing metadata in checkout session');
  }

  console.log('[Stripe Webhook] Processing checkout.session.completed:', {
    paymentId,
    userId,
    credits,
    sessionId: session.id,
  });

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id,user_id,amount,currency,status,credits,metadata,stripe_checkout_session_id')
    .eq('id', paymentId)
    .single();

  if (paymentError || !payment) {
    throw new Error(`Payment not found for checkout completion: ${paymentError?.message || paymentId}`);
  }

  if (payment.user_id !== userId) {
    throw new Error('Payment user mismatch for checkout completion');
  }

  if (payment.status === 'completed') {
    console.log('[Stripe Webhook] Payment already completed:', paymentId);
    return;
  }

  if (payment.stripe_checkout_session_id && payment.stripe_checkout_session_id !== session.id) {
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
        metadata: {
          ...(payment.metadata || {}),
          stripe_amount_mismatch: true,
          stripe_session_id: session.id,
          stripe_expected_session_id: payment.stripe_checkout_session_id,
        },
      })
      .eq('id', paymentId);
    throw new Error('Stripe session mismatch for payment');
  }

  const sessionCurrency = (session.currency || '').toLowerCase();
  const paymentCurrency = (payment.currency || '').toLowerCase();
  const expectedMinor = Math.round(Number(payment.amount) * 100);
  const receivedMinor = session.amount_total ?? null;

  if (sessionCurrency && paymentCurrency && sessionCurrency !== paymentCurrency) {
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
        metadata: {
          ...(payment.metadata || {}),
          stripe_currency_mismatch: true,
          stripe_session_id: session.id,
          stripe_session_currency: sessionCurrency,
          expected_currency: paymentCurrency,
        },
      })
      .eq('id', paymentId);
    throw new Error('Stripe currency mismatch for payment');
  }

  if (typeof receivedMinor === 'number' && receivedMinor !== expectedMinor) {
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
        metadata: {
          ...(payment.metadata || {}),
          stripe_amount_mismatch: true,
          stripe_session_id: session.id,
          stripe_amount_total: receivedMinor,
          expected_amount_minor: expectedMinor,
        },
      })
      .eq('id', paymentId);
    throw new Error('Stripe amount mismatch for payment');
  }

  // 更新支付状态和 payment_intent_id
  const updateData: any = {
    status: 'completed',
    updated_at: new Date().toISOString(),
    metadata: {
      ...(payment.metadata || {}),
      stripe_session_id: session.id,
      stripe_charge_id: session.payment_intent,
    },
  };

  // 存储真正的 payment_intent_id 以便后续 webhook 事件查询
  if (session.payment_intent) {
    updateData.stripe_payment_intent_id = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent.id;
  }

  const { error: updateError } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', paymentId);

  if (updateError) {
    console.error('[Stripe Webhook] Failed to update payment status:', updateError);
    throw new Error(`Failed to update payment status: ${updateError.message}`);
  }

  console.log('[Stripe Webhook] Payment status updated to completed');

  // NOTE: Credits are automatically added by database trigger (on_payment_completed)
  // when payment status changes to 'completed'. Do NOT manually add credits here
  // to avoid double-crediting the user.
  console.log('[Stripe Webhook] Credits will be added by database trigger:', { userId, credits });

  // Send payment success notification
  const amount = (session.amount_total || 0) / 100;
  notifyPaymentSuccess(userId, credits, paymentId, amount).catch((err) => {
    console.warn('[Payment] Failed to send success notification:', err);
  });
}

async function handleStripePaymentSucceeded(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (payment && payment.status !== 'completed') {
    await updatePaymentStatus(payment.id, 'completed', {
      stripe_charge_id: paymentIntent.latest_charge,
    });
  }
}

async function handleStripePaymentFailed(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (payment) {
    await updatePaymentStatus(payment.id, 'failed');

    // Send payment failed notification
    const failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
    notifyPaymentFailed(payment.user_id, payment.id, failureReason).catch((err) => {
      console.warn('[Payment] Failed to send failure notification:', err);
    });
  }
}

async function handleMembershipCheckoutCompleted(session: Stripe.Checkout.Session, supabase: any) {
  const userId = session.metadata?.user_id;
  const tierId = session.metadata?.tier_id;

  if (!userId || !tierId) {
    console.error('[Stripe Webhook] Missing metadata in membership checkout session');
    throw new Error('Missing metadata in membership checkout session');
  }

  console.log('[Stripe Webhook] Processing membership checkout.session.completed:', {
    userId,
    tierId,
    sessionId: session.id,
  });

  // Update payment record status to completed
  const { data: payment } = await supabase
    .from('payments')
    .select('id,user_id,amount,currency,status,metadata')
    .eq('stripe_checkout_session_id', session.id)
    .single();

  if (payment) {
    if (payment.user_id && payment.user_id !== userId) {
      throw new Error('Membership payment user mismatch');
    }

    if (payment.status === 'completed') {
      console.log('[Stripe Webhook] Membership payment already completed:', payment.id);
    } else {
      const sessionCurrency = (session.currency || '').toLowerCase();
      const paymentCurrency = (payment.currency || '').toLowerCase();
      const expectedMinor = Math.round(Number(payment.amount) * 100);
      const receivedMinor = session.amount_total ?? null;

      if (sessionCurrency && paymentCurrency && sessionCurrency !== paymentCurrency) {
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
            metadata: {
              ...(payment.metadata || {}),
              stripe_currency_mismatch: true,
              stripe_session_id: session.id,
              stripe_session_currency: sessionCurrency,
              expected_currency: paymentCurrency,
            },
          })
          .eq('id', payment.id);
        throw new Error('Stripe currency mismatch for membership payment');
      }

      if (typeof receivedMinor === 'number' && receivedMinor !== expectedMinor) {
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
            metadata: {
              ...(payment.metadata || {}),
              stripe_amount_mismatch: true,
              stripe_session_id: session.id,
              stripe_amount_total: receivedMinor,
              expected_amount_minor: expectedMinor,
            },
          })
          .eq('id', payment.id);
        throw new Error('Stripe amount mismatch for membership payment');
      }
    }

    await supabase
      .from('payments')
      .update({
        status: 'completed',
        stripe_payment_intent_id: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);
    console.log('[Stripe Webhook] Payment status updated to completed:', payment.id);
  }

  // Get tier details for monthly credits
  const { data: tier, error: tierError } = await supabase
    .from('membership_tiers')
    .select('*')
    .eq('id', tierId)
    .single();

  if (tierError || !tier) {
    console.error('[Stripe Webhook] Failed to get tier details:', tierError);
    throw new Error('Failed to get tier details');
  }

  // Calculate membership dates (1 month from now)
  const startedAt = new Date();
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  // Check if user already has a membership record
  const { data: existingMembership } = await supabase
    .from('user_memberships')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existingMembership) {
    // Update existing membership
    const { error: updateError } = await supabase
      .from('user_memberships')
      .update({
        tier: tierId,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription || null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[Stripe Webhook] Failed to update membership:', updateError);
      throw new Error(`Failed to update membership: ${updateError.message}`);
    }
  } else {
    // Create new membership record
    const { error: insertError } = await supabase
      .from('user_memberships')
      .insert({
        user_id: userId,
        tier: tierId,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        auto_renew: !!session.subscription,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription || null,
      });

    if (insertError) {
      console.error('[Stripe Webhook] Failed to create membership:', insertError);
      throw new Error(`Failed to create membership: ${insertError.message}`);
    }
  }

  // Add monthly credits to user
  if (tier.monthly_credits > 0) {
    await addCreditsToUser(userId, tier.monthly_credits);

    // Create transaction record
    await createTransactionRecord(
      userId,
      'membership_grant',
      tier.monthly_credits,
      `${tier.name_en} membership monthly credits`
    );
  }

  console.log('[Stripe Webhook] Membership activated successfully:', {
    userId,
    tierId,
    expiresAt: expiresAt.toISOString(),
    creditsGranted: tier.monthly_credits,
  });

  // Send notification
  notifyPaymentSuccess(userId, tier.monthly_credits, session.id, (session.amount_total || 0) / 100).catch((err) => {
    console.warn('[Payment] Failed to send membership success notification:', err);
  });
}
