import type { PaymentMethod } from '@/lib/services/payment/types';
import { getPaymentService } from '@/lib/services/payment';
import { isChinaDeployment } from '@/lib/config/deployment.config';

type DeploymentRegion = 'INTL' | 'CN';

type PaymentReceiver = {
  id: string;
  type: 'alipay' | 'wechat';
  name: string;
  account: string;
  isActive: boolean;
};

type PaymentSettings = {
  minAmount: number;
  maxAmount: number;
  paymentTimeout: number;
  autoRefundAfter: number;
  currenciesByRegion: Record<DeploymentRegion, string[]>;
  defaultCurrencyByRegion: Record<DeploymentRegion, string>;
};

export const PAYMENT_CONFIG = {
  paymentReceivers: [
    {
      id: 'alipay-main',
      type: 'alipay' as const,
      name: '支付宝收款',
      account: process.env.ALIPAY_RECEIVER_ACCOUNT || 'your-alipay-account@example.com',
      isActive: true,
    },
  ] satisfies PaymentReceiver[],

  settings: {
    minAmount: 1,
    maxAmount: 10000,
    paymentTimeout: 30,
    autoRefundAfter: 24,
    currenciesByRegion: {
      INTL: ['USD', 'EUR'],
      CN: ['CNY'],
    },
    defaultCurrencyByRegion: {
      INTL: 'USD',
      CN: 'CNY',
    },
  } satisfies PaymentSettings,

  webhooks: {
    stripe: '/api/payments/webhook',
    paypal: '/api/payments/paypal-webhook',
  },

  apiKeys: {
    stripe: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
      mode: process.env.PAYPAL_MODE || 'sandbox',
    },
    alipay: {
      appId: process.env.ALIPAY_APP_ID || '',
      privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
      publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    },
  },
};

export function getDeploymentRegion(): DeploymentRegion {
  return isChinaDeployment() ? 'CN' : 'INTL';
}

function resolveServiceMethods(): PaymentMethod[] {
  const paymentService = getPaymentService();
  return paymentService
    .getAvailablePaymentMethods()
    .filter((method) => method.available)
    .map((method) => method.id);
}

export function getAvailablePaymentMethodsForRegion(): string[] {
  const methods = resolveServiceMethods();
  const normalized = new Set<string>();

  methods.forEach((method) => {
    if (method.startsWith('wechat')) {
      normalized.add('wechat');
      return;
    }

    if (method.startsWith('alipay')) {
      normalized.add('alipay');
      return;
    }

    normalized.add(method);
  });

  return Array.from(normalized);
}

export function isPaymentMethodAvailable(method: string): boolean {
  return getAvailablePaymentMethodsForRegion().includes(method);
}

export function getActivePaymentReceivers() {
  return PAYMENT_CONFIG.paymentReceivers.filter(receiver => receiver.isActive);
}

export function getPaymentReceiverByType(type: 'alipay' | 'wechat') {
  return PAYMENT_CONFIG.paymentReceivers.find(receiver => receiver.type === type && receiver.isActive);
}

export function getDefaultCurrency(): string {
  const region = getDeploymentRegion();

  const serviceMethods = getPaymentService()
    .getAvailablePaymentMethods()
    .filter((method) => method.available);

  if (serviceMethods.length > 0) {
    const preferredMethod =
      serviceMethods.find((method) => method.id === 'stripe') ||
      serviceMethods.find((method) => method.id === 'paypal') ||
      serviceMethods.find((method) => method.id.startsWith('wechat')) ||
      serviceMethods.find((method) => method.id.startsWith('alipay')) ||
      serviceMethods[0];

    if (preferredMethod?.currencies?.length) {
      return preferredMethod.currencies[0];
    }
  }

  return PAYMENT_CONFIG.settings.defaultCurrencyByRegion[region];
}

export function getSupportedCurrencies(): string[] {
  const region = getDeploymentRegion();
  const serviceMethods = getPaymentService()
    .getAvailablePaymentMethods()
    .filter((method) => method.available);

  if (!serviceMethods.length) {
    return PAYMENT_CONFIG.settings.currenciesByRegion[region];
  }

  const currencies = new Set<string>();
  serviceMethods.forEach((method) => {
    method.currencies.forEach((currency) => currencies.add(currency));
  });

  return Array.from(currencies);
}

export function validatePaymentAmount(amount: number): boolean {
  return amount >= PAYMENT_CONFIG.settings.minAmount && amount <= PAYMENT_CONFIG.settings.maxAmount;
}

export function validatePaymentAccount(account: string): boolean {
  return account.length > 0 && account.trim() !== '';
}

