# Payment System Implementation

This document describes the complete payment system implementation for PersonaLink, including Stripe integration, USDT payments, and Alipay support.

## 🏗️ Architecture Overview

The payment system consists of the following components:

### Frontend Components
- `components/payment/CreditRecharge.tsx` - Main payment interface
- `components/payment/PaymentStatus.tsx` - Payment status display
- `app/payment/success/page.tsx` - Payment success page
- `app/payment/cancel/page.tsx` - Payment cancel page

### Backend API Routes
- `app/api/payments/create-intent/route.ts` - Create payment intents
- `app/api/payments/webhook/route.ts` - Stripe webhook handler
- `app/api/payments/verify/route.ts` - Payment verification
- `app/api/payments/status/[paymentId]/route.ts` - Payment status check
- `app/api/payments/history/route.ts` - Payment history
- `app/api/user/billing/route.ts` - User billing information

### Utility Libraries
- `lib/payments.ts` - Payment utility functions

## 💳 Supported Payment Methods

### 1. Stripe (Credit/Debit Cards)
- **Status**: ✅ Fully implemented
- **Features**: 
  - Secure checkout sessions
  - Webhook processing
  - Automatic credit addition
  - Transaction recording

### 2. USDT (Cryptocurrency)
- **Status**: ✅ Basic implementation
- **Features**:
  - TRC20 network support
  - Manual payment address generation
  - Payment verification needed

### 3. Alipay
- **Status**: ✅ Basic implementation
- **Features**:
  - QR code generation
  - Payment verification needed

## 🚀 Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local`:

```env
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Set up webhook endpoints:
   - URL: `https://your-domain.com/api/payments/webhook`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`

### 3. Database Setup

The payment system uses the following database tables:

```sql
-- Payments table (already exists)
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'CNY')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'alipay', 'usdt')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table (already exists)
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'CNY',
  description TEXT,
  status TEXT DEFAULT 'completed',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔄 Payment Flow

### 1. Payment Initiation
1. User selects a credit package
2. User chooses payment method
3. Frontend calls `/api/payments/create-intent`
4. Backend creates payment record and payment intent
5. User is redirected to payment provider

### 2. Payment Processing
1. User completes payment on provider's site
2. Provider sends webhook to `/api/payments/webhook`
3. Backend processes webhook and updates payment status
4. Credits are added to user's account
5. Transaction record is created

### 3. Payment Completion
1. User is redirected to success/cancel page
2. Frontend verifies payment status
3. User can view updated credit balance

## 🛠️ API Endpoints

### Create Payment Intent
```http
POST /api/payments/create-intent
Content-Type: application/json

{
  "packageId": "starter",
  "paymentMethod": "stripe",
  "amount": 9.99,
  "credits": 50
}
```

### Payment Webhook
```http
POST /api/payments/webhook
Content-Type: application/json
Stripe-Signature: whsec_...

{
  "type": "checkout.session.completed",
  "data": { ... }
}
```

### Verify Payment
```http
POST /api/payments/verify
Content-Type: application/json

{
  "sessionId": "cs_test_..."
}
```

### Get Payment Status
```http
GET /api/payments/status/{paymentId}
```

### Get Payment History
```http
GET /api/payments/history?limit=10&offset=0&status=completed
```

### Get User Billing
```http
GET /api/user/billing?limit=10&offset=0
```

## 💰 Credit Packages

The system includes four credit packages:

| Package | Credits | Price (CNY) | Features |
|---------|---------|-------------|----------|
| Starter | 50 | ¥9.99 | Basic matching, Standard support |
| Popular | 150 | ¥24.99 | Priority matching, Priority support, Advanced filtering |
| Premium | 300 | ¥44.99 | Super matching, Dedicated support, Unlimited filtering, Analytics |
| Ultimate | 500 | ¥69.99 | VIP matching, 24/7 support, All features, Exclusive events |

## 🔒 Security Features

1. **Authentication**: All payment endpoints require user authentication
2. **Webhook Verification**: Stripe webhooks are verified using signatures
3. **Input Validation**: All payment amounts and credit amounts are validated
4. **Database Constraints**: Payment amounts must be positive
5. **Status Tracking**: Comprehensive payment status tracking

## 🧪 Testing

### Test Credit Cards (Stripe Test Mode)
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

### Test Webhook Events
Use Stripe CLI to test webhooks locally:
```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

## 🚨 Error Handling

The system handles various error scenarios:

1. **Payment Creation Failures**: Database errors, invalid amounts
2. **Webhook Processing Failures**: Invalid signatures, missing metadata
3. **Payment Verification Failures**: Network errors, invalid session IDs
4. **Credit Addition Failures**: Database constraints, user not found

## 📊 Monitoring

### Payment Metrics to Track
- Payment success rate
- Average payment processing time
- Failed payment reasons
- Revenue by payment method
- Credit package popularity

### Logging
All payment operations are logged with appropriate error handling and user context.

## 🔧 Customization

### Adding New Payment Methods
1. Update `PAYMENT_METHODS` in `lib/payments.ts`
2. Add handler in `create-intent/route.ts`
3. Update database schema if needed
4. Add webhook processing if required

### Modifying Credit Packages
1. Update `CREDIT_PACKAGES` in `lib/payments.ts`
2. Update frontend display in `CreditRecharge.tsx`
3. Test payment flow with new packages

### Custom Validation
1. Modify validation functions in `lib/payments.ts`
2. Update API endpoints to use new validation
3. Add appropriate error messages

## 🆘 Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**
   - Check webhook URL configuration
   - Verify webhook secret
   - Check server logs for errors

2. **Payment Status Not Updating**
   - Verify webhook processing
   - Check database connection
   - Review payment record metadata

3. **Credits Not Added**
   - Check webhook event processing
   - Verify user profile update
   - Review transaction records

### Debug Mode
Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG=payments:*
```

## 📞 Support

For payment-related issues:
- Check Stripe Dashboard for payment details
- Review server logs for error messages
- Verify webhook configuration
- Test with Stripe test mode first

## 🔄 Future Enhancements

1. **Recurring Payments**: Subscription-based credit packages
2. **Refund Processing**: Automatic refund handling
3. **Multi-Currency**: Support for USD, EUR, etc.
4. **Payment Analytics**: Detailed payment reporting
5. **Fraud Detection**: Advanced fraud prevention
6. **Mobile Payments**: Apple Pay, Google Pay integration 