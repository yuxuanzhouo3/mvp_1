# Payment Setup Guide

This guide will help you set up your payment receivers to start accepting USDT and other payments.

## 🚀 Quick Setup

### Step 1: Configure Your Wallet Addresses

Edit the file `config/payment-config.ts` and replace the placeholder addresses with your actual wallet addresses:

```typescript
// In config/payment-config.ts
usdtWallets: [
  {
    id: 'trc20-main',
    address: 'YOUR_ACTUAL_TRC20_ADDRESS_HERE', // Replace this
    network: 'TRC20',
    label: 'Main USDT Wallet (TRC20)',
    isActive: true,
  },
  {
    id: 'erc20-main',
    address: 'YOUR_ACTUAL_ERC20_ADDRESS_HERE', // Replace this
    network: 'ERC20',
    label: 'Main USDT Wallet (ERC20)',
    isActive: true,
  },
],
```

### Step 2: Configure Payment Receivers

Update your payment receiver accounts:

```typescript
paymentReceivers: [
  {
    id: 'alipay-main',
    type: 'alipay',
    name: '支付宝收款',
    account: 'your-actual-alipay@example.com', // Replace with your Alipay account
    isActive: true,
  },
  {
    id: 'wechat-main',
    type: 'wechat',
    name: '微信收款',
    account: 'your-actual-wechat-id', // Replace with your WeChat ID
    isActive: true,
  },
],
```

### Step 3: Set Environment Variables

Add these to your `.env.local` file:

```env
# Stripe Configuration (for credit card payments)
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 💰 How to Get Wallet Addresses

### USDT Wallets

1. **TRC20 Network (Recommended for USDT)**:
   - Download TronLink wallet
   - Create a new wallet
   - Copy your TRC20 address
   - This is the most cost-effective for USDT transfers

2. **ERC20 Network**:
   - Use MetaMask or any Ethereum wallet
   - Copy your Ethereum address
   - Note: Higher gas fees but more widely supported

3. **BEP20 Network**:
   - Use MetaMask with BSC network
   - Copy your BSC address
   - Lower fees than ERC20

### Payment Receiver Accounts

1. **Alipay**:
   - Use your Alipay account email or phone number
   - Generate QR codes for payments

2. **WeChat Pay**:
   - Use your WeChat ID
   - Generate QR codes for payments

## 🔧 Testing Your Setup

### Test USDT Payment

1. Go to `/payment/recharge`
2. Select a package
3. Choose "USDT 支付"
4. Copy the wallet address
5. Send a small amount of USDT (e.g., 1 USDT)
6. Use the manual verification feature to confirm payment

### Test Alipay Payment

1. Go to `/payment/recharge`
2. Select a package
3. Choose "支付宝"
4. Scan the QR code with Alipay
5. Complete the payment
6. Use manual verification if needed

## 📱 Manual Payment Verification

If automatic verification doesn't work, users can manually verify payments:

1. **For USDT**:
   - Enter the transaction hash from the blockchain
   - Enter the sender's address
   - Click "验证支付"

2. **For Alipay**:
   - Enter the transaction ID from Alipay
   - Click "验证支付"

## 🔒 Security Considerations

1. **Never share your private keys**
2. **Use separate wallets for business**
3. **Regularly backup your wallet addresses**
4. **Monitor transactions regularly**
5. **Set up alerts for large payments**

## 🚨 Important Notes

### For Production

1. **Use real wallet addresses** (not test addresses)
2. **Set up proper webhooks** for automatic verification
3. **Monitor payment confirmations**
4. **Implement proper error handling**
5. **Set up payment notifications**

### For Development

1. **Use test wallets** for testing
2. **Use small amounts** for testing
3. **Test all payment methods**
4. **Verify manual payment process**

## 📊 Payment Monitoring

### Check Payment Status

- API: `GET /api/payments/status/{paymentId}`
- Dashboard: `/dashboard/billing`
- Manual verification: Available in payment monitor

### Payment History

- API: `GET /api/payments/history`
- Dashboard: `/dashboard/billing`

## 🆘 Troubleshooting

### Common Issues

1. **Payment not showing up**:
   - Check wallet address is correct
   - Verify network (TRC20 vs ERC20)
   - Wait for blockchain confirmation

2. **Manual verification fails**:
   - Check transaction hash format
   - Verify sender address
   - Ensure amount matches exactly

3. **QR code not working**:
   - Regenerate QR code
   - Check Alipay account is correct
   - Try different QR code service

### Support

If you encounter issues:
1. Check the payment logs
2. Verify wallet addresses
3. Test with small amounts first
4. Contact support if needed

## 🎯 Next Steps

After setup:

1. **Test all payment methods**
2. **Set up monitoring**
3. **Configure notifications**
4. **Train support team**
5. **Go live with small amounts**

## 📈 Scaling

As your business grows:

1. **Add more wallet addresses**
2. **Implement load balancing**
3. **Add more payment methods**
4. **Set up automated reconciliation**
5. **Implement fraud detection**

---

**Remember**: Always test thoroughly before going live with real payments! 