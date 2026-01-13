/**
 * PayPal 支付服务层 - 国际版
 * 使用 PayPal Orders API v2
 */

// PayPal API 基础 URL
const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// 缓存 Access Token
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * 获取 PayPal Access Token
 */
export async function getPayPalAccessToken(): Promise<string> {
  // 检查缓存的 token 是否有效（提前 5 分钟过期）
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedAccessToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[PayPal] Failed to get access token:', error);
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);

  return cachedAccessToken as string;
}

/**
 * PayPal 订单创建选项
 */
interface CreateOrderOptions {
  paymentId: string;
  amount: number;
  credits: number;
  userId: string;
  currency?: string;
  description?: string;
}

/**
 * 创建 PayPal 订单
 */
export async function createPayPalOrder(options: CreateOrderOptions): Promise<{
  orderId: string;
  approvalUrl: string;
}> {
  const {
    paymentId,
    amount,
    credits,
    userId,
    currency = 'USD',
    description = `Purchase ${credits} credits`,
  } = options;

  const accessToken = await getPayPalAccessToken();

  const orderData = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: paymentId,
        description: description,
        custom_id: paymentId, // 用于 Webhook 关联
        amount: {
          currency_code: currency,
          value: amount.toFixed(2),
        },
        supplementary_data: {
          user_id: userId,
          credits: credits.toString(),
          payment_id: paymentId,
        },
      },
    ],
    application_context: {
      brand_name: process.env.NEXT_PUBLIC_APP_NAME || 'PersonaLink',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?provider=paypal&paymentId=${paymentId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel?provider=paypal&paymentId=${paymentId}`,
    },
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': paymentId, // 幂等键
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[PayPal] Failed to create order:', error);
    throw new Error('Failed to create PayPal order');
  }

  const order = await response.json();

  const approvalUrl = order.links?.find(
    (link: { rel: string; href: string }) => link.rel === 'approve'
  )?.href;

  if (!approvalUrl) {
    throw new Error('PayPal approval URL not found');
  }

  console.log('[PayPal] Order created:', {
    orderId: order.id,
    paymentId,
    amount,
    credits,
  });

  return {
    orderId: order.id,
    approvalUrl,
  };
}

/**
 * Capture PayPal 订单（确认支付）
 */
export async function capturePayPalOrder(orderId: string): Promise<{
  success: boolean;
  captureId: string;
  payerId: string;
  status: string;
  amount: string;
  currency: string;
  customId: string;
}> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[PayPal] Failed to capture order:', error);
    return {
      success: false,
      captureId: '',
      payerId: '',
      status: 'FAILED',
      amount: '0',
      currency: 'USD',
      customId: '',
    };
  }

  const capture = await response.json();
  const captureDetails = capture.purchase_units?.[0]?.payments?.captures?.[0];

  console.log('[PayPal] Order captured:', {
    orderId,
    status: capture.status,
    captureId: captureDetails?.id,
  });

  return {
    success: capture.status === 'COMPLETED',
    captureId: captureDetails?.id || '',
    payerId: capture.payer?.payer_id || '',
    status: capture.status,
    amount: captureDetails?.amount?.value || '0',
    currency: captureDetails?.amount?.currency_code || 'USD',
    customId: capture.purchase_units?.[0]?.reference_id || '',
  };
}

/**
 * 获取 PayPal 订单详情
 */
export async function getPayPalOrder(orderId: string): Promise<{
  id: string;
  status: string;
  customId: string;
  amount: string;
  currency: string;
}> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[PayPal] Failed to get order:', error);
    throw new Error('Failed to get PayPal order');
  }

  const order = await response.json();
  const purchaseUnit = order.purchase_units?.[0];

  return {
    id: order.id,
    status: order.status,
    customId: purchaseUnit?.reference_id || purchaseUnit?.custom_id || '',
    amount: purchaseUnit?.amount?.value || '0',
    currency: purchaseUnit?.amount?.currency_code || 'USD',
  };
}

/**
 * PayPal Webhook 事件类型
 */
export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  resource: {
    id: string;
    custom_id?: string;
    amount?: {
      value: string;
      currency_code: string;
    };
    supplementary_data?: {
      user_id?: string;
      credits?: string;
      payment_id?: string;
    };
    [key: string]: any;
  };
  create_time: string;
}

/**
 * 验证 PayPal Webhook 签名
 */
export async function verifyPayPalWebhook(
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) {
    console.warn('[PayPal] Webhook ID not configured, skipping signature verification');
    return true; // 开发环境可能不验证
  }

  const accessToken = await getPayPalAccessToken();

  const verificationData = {
    auth_algo: headers['paypal-auth-algo'],
    cert_url: headers['paypal-cert-url'],
    transmission_id: headers['paypal-transmission-id'],
    transmission_sig: headers['paypal-transmission-sig'],
    transmission_time: headers['paypal-transmission-time'],
    webhook_id: webhookId,
    webhook_event: JSON.parse(body),
  };

  const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(verificationData),
  });

  if (!response.ok) {
    console.error('[PayPal] Webhook verification request failed');
    return false;
  }

  const result = await response.json();
  return result.verification_status === 'SUCCESS';
}

/**
 * 检查 PayPal 是否可用
 */
export function isPayPalAvailable(): boolean {
  return !!(
    process.env.PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_CLIENT_SECRET &&
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  );
}

/**
 * 取消 PayPal 订阅
 */
export async function cancelPayPalSubscription(subscriptionId: string): Promise<{
  success: boolean;
  message?: string;
}> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason: 'User requested cancellation',
    }),
  });

  if (!response.ok && response.status !== 204) {
    const error = await response.text();
    console.error('[PayPal] Failed to cancel subscription:', error);
    throw new Error('Failed to cancel PayPal subscription');
  }

  console.log('[PayPal] Subscription cancelled:', subscriptionId);

  return {
    success: true,
    message: 'Subscription cancelled successfully',
  };
}

/**
 * CNY 转 USD 汇率（实际应用中应从 API 获取实时汇率）
 */
const CNY_TO_USD_RATE = 0.14;

/**
 * 将 CNY 金额转换为 USD
 */
export function convertCNYtoUSD(cnyAmount: number): number {
  return Math.round(cnyAmount * CNY_TO_USD_RATE * 100) / 100;
}
