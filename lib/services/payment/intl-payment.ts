/**
 * INTL 环境支付服务实现 (Stripe + PayPal)
 * INTL Environment Payment Service Implementation
 */

import type {
  IPaymentService,
  PaymentRecord,
  CreatePaymentRequest,
  CreatePaymentResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  PaymentMethodConfig,
  CreditPackage,
  PaymentStatus,
  PaymentMethod,
} from './types';
import Stripe from 'stripe';
import { createPayPalOrder, capturePayPalOrder, isPayPalAvailable } from '@/lib/payment/paypal';
import { getServiceDbClient } from '@/lib/db-client';

// 积分套餐配置 (USD)
const INTL_CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 50,
    price: 9.99,
    currency: 'USD',
    features: ['50 credits', 'Basic matching', 'Standard support'],
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    credits: 150,
    price: 24.99,
    originalPrice: 29.99,
    currency: 'USD',
    popular: true,
    features: ['150 credits', 'Priority matching', 'Priority support', 'Advanced filters'],
  },
  {
    id: 'premium',
    name: 'Premium Pack',
    credits: 300,
    price: 44.99,
    originalPrice: 59.99,
    currency: 'USD',
    bestValue: true,
    features: ['300 credits', 'Super matching', 'Dedicated support', 'Unlimited filters', 'Data analytics'],
  },
  {
    id: 'ultimate',
    name: 'Ultimate Pack',
    credits: 500,
    price: 69.99,
    originalPrice: 99.99,
    currency: 'USD',
    features: ['500 credits', 'VIP matching', '24/7 support', 'All features', 'Exclusive events'],
  },
];

/**
 * INTL 支付服务 - Stripe + PayPal
 */
export class IntlPaymentService implements IPaymentService {
  private stripe: Stripe | null = null;
  private apiBaseUrl: string;

  constructor() {
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-12-18.acacia' as any,
      });
    }
    this.apiBaseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  }

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    const { method } = request;

    switch (method) {
      case 'stripe':
        return this.createStripePayment(request);
      case 'paypal':
        return this.createPayPalPayment(request);
      default:
        return {
          success: false,
          error: `Unsupported payment method: ${method}`,
          errorCode: 'UNSUPPORTED_METHOD',
        };
    }
  }

  /**
   * 创建 Stripe 支付会话
   */
  private async createStripePayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    if (!this.stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
        errorCode: 'STRIPE_NOT_CONFIGURED',
      };
    }

    try {
      // 生成支付记录 ID
      const paymentRecord = await this.createPaymentRecord(request);
      if (!paymentRecord) {
        return {
          success: false,
          error: 'Failed to create payment record',
          errorCode: 'PAYMENT_RECORD_ERROR',
        };
      }

      const paymentId = paymentRecord.id;

      // 创建 Stripe Checkout Session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: request.currency.toLowerCase(),
              product_data: {
                name: `PersonaLink - ${request.credits} Credits`,
                description: `Purchase ${request.credits} credits`,
              },
              unit_amount: Math.round(request.amount * 100), // Stripe 金额单位是分
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: request.returnUrl || `${this.apiBaseUrl}/payment/success?paymentId=${paymentId}`,
        cancel_url: request.cancelUrl || `${this.apiBaseUrl}/payment/cancel?paymentId=${paymentId}`,
        metadata: {
          payment_id: paymentId,
          user_id: request.userId,
          credits: String(request.credits),
          package_id: request.packageId,
        },
      });

      await this.updatePaymentRecord(paymentId, {
        stripe_checkout_session_id: session.id,
        metadata: {
          ...(paymentRecord.metadata || {}),
          stripe_checkout_session_id: session.id,
        },
      });

      return {
        success: true,
        paymentId,
        redirectUrl: session.url || undefined,
        checkoutUrl: session.url || undefined,
        checkoutSessionId: session.id,
      };
    } catch (error: any) {
      console.error('[Stripe] Create payment error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create Stripe payment',
        errorCode: 'STRIPE_ERROR',
      };
    }
  }

  /**
   * 创建 PayPal 订单
   */
  private async createPayPalPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    try {
      // 生成支付记录 ID
      const paymentRecord = await this.createPaymentRecord(request);
      if (!paymentRecord) {
        return {
          success: false,
          error: 'Failed to create payment record',
          errorCode: 'PAYMENT_RECORD_ERROR',
        };
      }

      const paymentId = paymentRecord.id;

      const result = await createPayPalOrder({
        paymentId,
        amount: request.amount,
        credits: request.credits,
        userId: request.userId,
        currency: request.currency,
        description: `Purchase ${request.credits} credits`,
      });

      await this.updatePaymentRecord(paymentId, {
        paypal_order_id: result.orderId,
        metadata: {
          ...(paymentRecord.metadata || {}),
          paypal_order_id: result.orderId,
          paypal_approval_url: result.approvalUrl,
        },
      });

      return {
        success: true,
        paymentId,
        redirectUrl: result.approvalUrl,
        approvalUrl: result.approvalUrl,
        orderId: result.orderId,
      };
    } catch (error: any) {
      console.error('[PayPal] Create payment error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create PayPal payment',
        errorCode: 'PAYPAL_ERROR',
      };
    }
  }

  async verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
    const { method, providerOrderId } = request;

    try {
      if (method === 'paypal' && providerOrderId) {
        // 捕获 PayPal 订单
        const result = await capturePayPalOrder(providerOrderId);
        
        return {
          success: result.success,
          status: result.success ? 'completed' : 'failed',
        };
      }

      // 对于 Stripe，支付状态通过 Webhook 更新
      return {
        success: true,
        status: 'processing',
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        error: error.message || 'Payment verification failed',
      };
    }
  }

  async handleCallback(method: PaymentMethod, payload: any, headers?: Record<string, string>): Promise<{
    success: boolean;
    paymentId?: string;
    status?: PaymentStatus;
    error?: string;
  }> {
    switch (method) {
      case 'stripe':
        return this.handleStripeWebhook(payload, headers);
      case 'paypal':
        return this.handlePayPalWebhook(payload);
      default:
        return {
          success: false,
          error: `Unsupported payment method: ${method}`,
        };
    }
  }

  /**
   * 处理 Stripe Webhook
   */
  private async handleStripeWebhook(payload: any, headers?: Record<string, string>): Promise<{
    success: boolean;
    paymentId?: string;
    status?: PaymentStatus;
    error?: string;
  }> {
    if (!this.stripe) {
      return {
        success: false,
        error: 'Stripe is not configured',
      };
    }

    try {
      const sig = headers?.['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig || !webhookSecret) {
        return {
          success: false,
          error: 'Missing Stripe signature or webhook secret',
        };
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        sig,
        webhookSecret
      );

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentId = session.metadata?.payment_id;

        return {
          success: true,
          paymentId,
          status: 'completed',
        };
      }

      return {
        success: true,
        status: 'processing',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Stripe webhook handling failed',
      };
    }
  }

  /**
   * 处理 PayPal Webhook
   */
  private async handlePayPalWebhook(payload: any): Promise<{
    success: boolean;
    paymentId?: string;
    status?: PaymentStatus;
    error?: string;
  }> {
    try {
      const eventType = payload.event_type;

      if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
        const customId = payload.resource?.custom_id || payload.resource?.invoice_id;
        
        return {
          success: true,
          paymentId: customId,
          status: 'completed',
        };
      }

      return {
        success: true,
        status: 'processing',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'PayPal webhook handling failed',
      };
    }
  }

  async getPaymentById(paymentId: string, userId: string): Promise<PaymentRecord | null> {
    try {
      const db = await getServiceDbClient();
      const { data, error } = await db
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        amount: data.amount,
        currency: data.currency,
        credits: data.credits,
        method: data.payment_method || data.method,
        status: data.status,
        providerOrderId:
          data.provider_order_id ||
          data.paypal_order_id ||
          data.stripe_payment_intent_id ||
          data.stripe_checkout_session_id,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        completedAt: data.completed_at,
      };
    } catch (error: any) {
      console.error('[INTL Payment] Get payment by ID error:', error);
      return null;
    }
  }

  async getPaymentHistory(userId: string, options?: {
    limit?: number;
    offset?: number;
    status?: PaymentStatus;
  }): Promise<PaymentRecord[]> {
    try {
      const db = await getServiceDbClient();
      let query = db
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error || !data) {
        return [];
      }

      return data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        amount: item.amount,
        currency: item.currency,
        credits: item.credits,
        method: item.payment_method || item.method,
        status: item.status,
        providerOrderId:
          item.provider_order_id ||
          item.paypal_order_id ||
          item.stripe_payment_intent_id ||
          item.stripe_checkout_session_id,
        metadata: item.metadata,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        completedAt: item.completed_at,
      }));
    } catch (error: any) {
      console.error('[INTL Payment] Get payment history error:', error);
      return [];
    }
  }

  getAvailablePaymentMethods(): PaymentMethodConfig[] {
    const methods: PaymentMethodConfig[] = [];

    // Stripe
    if (this.stripe) {
      methods.push({
        id: 'stripe',
        name: 'Credit/Debit Card',
        description: 'Visa, Mastercard, American Express',
        icon: 'credit-card',
        processingTime: 'Instant',
        available: true,
        currencies: ['USD', 'EUR'],
      });
    }

    // PayPal
    if (isPayPalAvailable()) {
      methods.push({
        id: 'paypal',
        name: 'PayPal',
        description: 'PayPal, Credit/Debit Card',
        icon: 'paypal',
        processingTime: 'Instant',
        available: true,
        currencies: ['USD', 'EUR'],
      });
    }

    return methods;
  }

  getCreditPackages(): CreditPackage[] {
    return INTL_CREDIT_PACKAGES;
  }

  async requestRefund(paymentId: string, reason?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const db = await getServiceDbClient();
      const { data: payment, error } = await db
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error || !payment) {
        return {
          success: false,
          error: 'Payment not found',
        };
      }

      if (payment.status !== 'completed') {
        return {
          success: false,
          error: 'Only completed payments can be refunded',
        };
      }

      const nowIso = new Date().toISOString();
      const paymentMethod: string = payment.payment_method || payment.method || '';
      const metadata = payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {};
      const provider = paymentMethod.includes('paypal') ? 'paypal' : 'stripe';

      let refundProviderResult: { ok: boolean; id?: string; status?: string; error?: string };

      if (provider === 'stripe') {
        if (!this.stripe) {
          return {
            success: false,
            error: 'Stripe is not configured',
          };
        }

        const paymentIntentId =
          payment.stripe_payment_intent_id ||
          metadata?.stripe_payment_intent_id ||
          undefined;

        if (!paymentIntentId) {
          return {
            success: false,
            error: 'Missing Stripe payment intent ID',
          };
        }

        try {
          const refund = await this.stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: 'requested_by_customer',
            metadata: {
              payment_id: payment.id,
              refund_reason: reason || 'User requested refund',
            },
          });

          refundProviderResult = {
            ok: true,
            id: refund.id,
            status: refund.status || undefined,
          };
        } catch (stripeError: any) {
          return {
            success: false,
            error: stripeError?.message || 'Stripe refund request failed',
          };
        }
      } else {
        const accessToken = await this.getPayPalAccessTokenSafe();
        const captureId =
          payment.paypal_capture_id ||
          metadata?.paypal_capture_id ||
          undefined;

        if (!accessToken || !captureId) {
          return {
            success: false,
            error: !accessToken
              ? 'PayPal is not configured'
              : 'Missing PayPal capture ID',
          };
        }

        const apiBase = process.env.PAYPAL_MODE === 'live'
          ? 'https://api-m.paypal.com'
          : 'https://api-m.sandbox.paypal.com';

        const response = await fetch(`${apiBase}/v2/payments/captures/${captureId}/refund`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `${payment.id}-refund-${Date.now()}`,
          },
          body: JSON.stringify({
            note_to_payer: reason || 'User requested refund',
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          return {
            success: false,
            error: `PayPal refund request failed: ${text}`,
          };
        }

        const payload = await response.json();
        refundProviderResult = {
          ok: true,
          id: payload?.id,
          status: payload?.status,
        };
      }

      const providerStatus = String(refundProviderResult.status || '').toUpperCase();
      const localRefundStatus = providerStatus === 'COMPLETED' ? 'refunded' : 'pending';
      const nextPaymentStatus = localRefundStatus === 'refunded' ? 'refunded' : 'processing';

      await db
        .from('payments')
        .update({
          status: nextPaymentStatus,
          metadata: {
            ...metadata,
            refund: {
              status: localRefundStatus,
              provider,
              provider_refund_id: refundProviderResult.id,
              provider_status: refundProviderResult.status,
              refund_reason: reason,
              requested_at: nowIso,
              updated_at: nowIso,
            },
          },
          updated_at: nowIso,
        })
        .eq('id', payment.id);

      return { success: true };
    } catch (error: any) {
      console.error('[INTL Payment] Refund error:', error);
      return {
        success: false,
        error: error.message || 'Refund request failed',
      };
    }
  }

  private async getPayPalAccessTokenSafe(): Promise<string | null> {
    try {
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return null;
      }

      const apiBase = process.env.PAYPAL_MODE === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const response = await fetch(`${apiBase}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json();
      return typeof payload?.access_token === 'string' ? payload.access_token : null;
    } catch {
      return null;
    }
  }

  private async createPaymentRecord(request: CreatePaymentRequest): Promise<PaymentRecord | null> {
    try {
      const db = await getServiceDbClient();

      const insertData = {
        user_id: request.userId,
        amount: request.amount,
        currency: request.currency,
        credits: request.credits,
        payment_method: request.method,
        status: 'pending' as PaymentStatus,
        metadata: request.metadata || {},
      };

      const { data, error } = await db
        .from('payments')
        .insert(insertData)
        .select()
        .single();

      if (error || !data) {
        console.error('[INTL Payment] Create payment record error:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        amount: data.amount,
        currency: data.currency,
        credits: data.credits,
        method: data.payment_method || data.method,
        status: data.status,
        providerOrderId:
          data.provider_order_id ||
          data.paypal_order_id ||
          data.stripe_payment_intent_id ||
          data.stripe_checkout_session_id,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        completedAt: data.completed_at,
      };
    } catch (error: any) {
      console.error('[INTL Payment] Create payment record error:', error);
      return null;
    }
  }

  private async updatePaymentRecord(paymentId: string, fields: Record<string, any>): Promise<void> {
    try {
      const db = await getServiceDbClient();
      const payload = {
        ...fields,
        updated_at: new Date().toISOString(),
      };

      const { error } = await db
        .from('payments')
        .update(payload)
        .eq('id', paymentId);

      if (error) {
        console.error('[INTL Payment] Update payment record error:', error);
      }
    } catch (error: any) {
      console.error('[INTL Payment] Update payment record error:', error);
    }
  }

}
