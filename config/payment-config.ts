// Payment Configuration
// Update these with your actual wallet addresses and payment receiver information

export const PAYMENT_CONFIG = {
  // USDT Wallet Addresses
  usdtWallets: [
    {
      id: 'trc20-main',
      address: 'TQn9Y2khDD95J42FQtQTdwVVRKqyqjqjqj', // REPLACE WITH YOUR ACTUAL TRC20 ADDRESS
      network: 'TRC20' as const,
      label: 'Main USDT Wallet (TRC20)',
      isActive: true,
    },
    {
      id: 'erc20-main',
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b8', // REPLACE WITH YOUR ACTUAL ERC20 ADDRESS
      network: 'ERC20' as const,
      label: 'Main USDT Wallet (ERC20)',
      isActive: true,
    },
    // Add more wallets as needed
    // {
    //   id: 'bep20-main',
    //   address: '0x...', // Your BEP20 address
    //   network: 'BEP20' as const,
    //   label: 'Main USDT Wallet (BEP20)',
    //   isActive: true,
    // },
  ],

  // Payment Receivers
  paymentReceivers: [
    {
      id: 'alipay-main',
      type: 'alipay' as const,
      name: '支付宝收款',
      account: 'your-alipay-account@example.com', // REPLACE WITH YOUR ACTUAL ALIPAY ACCOUNT
      isActive: true,
    },
    {
      id: 'wechat-main',
      type: 'wechat' as const,
      name: '微信收款',
      account: 'your-wechat-id', // REPLACE WITH YOUR ACTUAL WECHAT ID
      isActive: true,
    },
    // Add more payment receivers as needed
  ],

  // Payment Settings
  settings: {
    // Minimum payment amount (in CNY)
    minAmount: 1,
    
    // Maximum payment amount (in CNY)
    maxAmount: 10000,
    
    // Payment timeout (in minutes)
    paymentTimeout: 30,
    
    // Auto-refund failed payments after (in hours)
    autoRefundAfter: 24,
    
    // Supported currencies
    supportedCurrencies: ['CNY', 'USD', 'EUR'],
    
    // Default currency
    defaultCurrency: 'CNY',
  },

  // Webhook URLs (for production)
  webhooks: {
    stripe: 'https://your-domain.com/api/payments/webhook',
    alipay: 'https://your-domain.com/api/payments/alipay-webhook',
  },

  // API Keys (store these in environment variables)
  apiKeys: {
    stripe: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    alipay: {
      appId: process.env.ALIPAY_APP_ID || '',
      privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
      publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    },
  },
};

// Helper function to get active wallets
export function getActiveUSDTWallets() {
  return PAYMENT_CONFIG.usdtWallets.filter(wallet => wallet.isActive);
}

// Helper function to get active payment receivers
export function getActivePaymentReceivers() {
  return PAYMENT_CONFIG.paymentReceivers.filter(receiver => receiver.isActive);
}

// Helper function to get wallet by network
export function getWalletByNetwork(network: 'TRC20' | 'ERC20' | 'BEP20') {
  return PAYMENT_CONFIG.usdtWallets.find(wallet => wallet.network === network && wallet.isActive);
}

// Helper function to get payment receiver by type
export function getPaymentReceiverByType(type: 'alipay' | 'wechat') {
  return PAYMENT_CONFIG.paymentReceivers.find(receiver => receiver.type === type && receiver.isActive);
}

// Validation functions
export function validatePaymentAmount(amount: number): boolean {
  return amount >= PAYMENT_CONFIG.settings.minAmount && amount <= PAYMENT_CONFIG.settings.maxAmount;
}

export function validateWalletAddress(address: string): boolean {
  // Basic validation - you can add more sophisticated validation
  return address.length > 0 && address.trim() !== '';
}

export function validatePaymentAccount(account: string): boolean {
  // Basic validation - you can add more sophisticated validation
  return account.length > 0 && account.trim() !== '';
} 