import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

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
    id: 'usdt',
    name: 'USDT 支付',
    description: 'TRC20 网络',
    processingTime: '1-3 分钟',
    isAvailable: true, // Always available
  },
  {
    id: 'alipay',
    name: '支付宝',
    description: '支付宝扫码支付',
    processingTime: '即时到账',
    isAvailable: true, // Always available
  },
];

export async function createPaymentRecord(
  userId: string,
  amount: number,
  paymentMethod: string,
  packageId: string,
  credits: number
) {
  const supabase = createClient();
  
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
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
  const supabase = createClient();
  
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

export async function createTransactionRecord(
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

export async function getPaymentById(paymentId: string, userId: string) {
  const supabase = createClient();
  
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
  const supabase = createClient();
  
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
  const supabase = createClient();

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      await handleStripeCheckoutCompleted(session, supabase);
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

  await updatePaymentStatus(paymentId, 'completed', {
    stripe_session_id: session.id,
    stripe_charge_id: session.payment_intent,
  });

  await addCreditsToUser(userId, credits);

  await createTransactionRecord(
    userId,
    'credit_purchase',
    credits,
    `Purchased ${credits} credits via Stripe`,
    {
      payment_id: paymentId,
      stripe_session_id: session.id,
      payment_method: 'stripe',
    }
  );
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
  }
} 