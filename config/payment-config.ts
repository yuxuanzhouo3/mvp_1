// Payment Configuration
// Region-based payment methods:
// - INTL region: Stripe + PayPal only
// - CN region: Alipay only

export const PAYMENT_CONFIG = {
  // Payment Receivers (for CN region manual payments)
  paymentReceivers: [
    {
      id: 'alipay-main',
      type: 'alipay' as const,
      name: '支付宝收款',
      account: process.env.ALIPAY_RECEIVER_ACCOUNT || 'your-alipay-account@example.com',
      isActive: true,
    },
  ],

  // Payment Settings
  settings: {
    // Minimum payment amount (in CNY for CN, USD for INTL)
    minAmount: 1,

    // Maximum payment amount
    maxAmount: 10000,

    // Payment timeout (in minutes)
    paymentTimeout: 30,

    // Auto-refund failed payments after (in hours)
    autoRefundAfter: 24,

    // Supported currencies by region
    currenciesByRegion: {
      INTL: ['USD', 'EUR'],
      CN: ['CNY'],
    },

    // Default currency by region
    defaultCurrencyByRegion: {
      INTL: 'USD',
      CN: 'CNY',
    },
  },

  // Webhook URLs (for production)
  webhooks: {
    stripe: '/api/payments/webhook',
    paypal: '/api/payments/paypal-webhook',
  },

  // API Keys (store these in environment variables)
  apiKeys: {
    stripe: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
      mode: process.env.PAYPAL_MODE || 'sandbox', // 'sandbox' or 'live'
    },
    alipay: {
      appId: process.env.ALIPAY_APP_ID || '',
      privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
      publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    },
  },
};

// Get current deployment region
export function getDeploymentRegion(): 'INTL' | 'CN' {
  return (process.env.NEXT_PUBLIC_DEPLOYMENT_REGION as 'INTL' | 'CN') || 'INTL';
}

// Get available payment methods for current region
export function getAvailablePaymentMethodsForRegion(): string[] {
  const region = getDeploymentRegion();

  if (region === 'CN') {
    return ['alipay'];
  }

  // INTL region
  const methods: string[] = [];

  if (PAYMENT_CONFIG.apiKeys.stripe.secretKey) {
    methods.push('stripe');
  }

  if (PAYMENT_CONFIG.apiKeys.paypal.clientId) {
    methods.push('paypal');
  }

  return methods;
}

// Check if a payment method is available
export function isPaymentMethodAvailable(method: string): boolean {
  return getAvailablePaymentMethodsForRegion().includes(method);
}

// Helper function to get active payment receivers
export function getActivePaymentReceivers() {
  return PAYMENT_CONFIG.paymentReceivers.filter(receiver => receiver.isActive);
}

// Helper function to get payment receiver by type
export function getPaymentReceiverByType(type: 'alipay') {
  return PAYMENT_CONFIG.paymentReceivers.find(receiver => receiver.type === type && receiver.isActive);
}

// Get default currency for current region
export function getDefaultCurrency(): string {
  const region = getDeploymentRegion();
  return PAYMENT_CONFIG.settings.defaultCurrencyByRegion[region];
}

// Get supported currencies for current region
export function getSupportedCurrencies(): string[] {
  const region = getDeploymentRegion();
  return PAYMENT_CONFIG.settings.currenciesByRegion[region];
}

// Validation functions
export function validatePaymentAmount(amount: number): boolean {
  return amount >= PAYMENT_CONFIG.settings.minAmount && amount <= PAYMENT_CONFIG.settings.maxAmount;
}

export function validatePaymentAccount(account: string): boolean {
  return account.length > 0 && account.trim() !== '';
}

// DEPRECATED: USDT functions (no longer supported)
// @deprecated - USDT payment has been removed
export function getActiveUSDTWallets() {
  console.warn('USDT payment is no longer supported');
  return [];
}

// @deprecated - USDT payment has been removed
export function getWalletByNetwork(_network: string) {
  console.warn('USDT payment is no longer supported');
  return null;
}
