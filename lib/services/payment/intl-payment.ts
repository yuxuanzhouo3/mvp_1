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
      const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(7)}`;

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

      return {
        success: true,
        paymentId,
        redirectUrl: session.url || undefined,
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
      const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const result = await createPayPalOrder({
        paymentId,
        amount: request.amount,
        credits: request.credits,
        userId: request.userId,
        currency: request.currency,
        description: `Purchase ${request.credits} credits`,
      });

      return {
        success: true,
        paymentId,
        redirectUrl: result.approvalUrl,
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

  async getPaymentById(_paymentId: string, _userId: string): Promise<PaymentRecord | null> {
    // 实际实现需要调用数据库服务
    return null;
  }

  async getPaymentHistory(_userId: string, _options?: {
    limit?: number;
    offset?: number;
    status?: PaymentStatus;
  }): Promise<PaymentRecord[]> {
    // 实际实现需要调用数据库服务
    return [];
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

  async requestRefund(_paymentId: string, _reason?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    // 退款逻辑需要根据支付方式分别实现
    return {
      success: false,
      error: 'Refund functionality not implemented',
    };
  }
}

