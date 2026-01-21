const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function mustInclude(name, content, needles) {
  const missing = needles.filter((n) => !content.includes(n));
  if (missing.length) {
    throw new Error(`${name} missing: ${missing.join(', ')}`);
  }
}

function mustNotInclude(name, content, needles) {
  const found = needles.filter((n) => content.includes(n));
  if (found.length) {
    throw new Error(`${name} must not include: ${found.join(', ')}`);
  }
}

function main() {
  const paymentEvents = read('lib/observability/payment-events.ts');
  mustInclude('payment-events.ts', paymentEvents, [
    'export function buildPaymentRequestContext',
    'export async function recordPaymentEvent',
    'export async function listPaymentEvents',
    "category: 'Payment'",
    "from('payment_events')",
  ]);

  const finalize = read('lib/payment/cn-payment-finalize.ts');
  mustInclude('cn-payment-finalize.ts', finalize, [
    "from('payments')",
    'recordPaymentEvent(',
    'AMOUNT_CHECK_FAILED',
    'CREDITS_GRANTED',
    'MEMBERSHIP_UPSERTED',
  ]);

  const wechatCb = read('app/api/payments/wechat-callback/route.ts');
  mustInclude('wechat-callback route', wechatCb, [
    'buildPaymentRequestContext',
    'recordPaymentEvent',
    "provider: 'wechat'",
    'getWeChatPlatformPublicKeyPem',
  ]);
  mustNotInclude('wechat-callback route', wechatCb, ['WECHAT_PAY_PUBLIC_KEY']);

  const alipayCb = read('app/api/payments/alipay-callback/route.ts');
  mustInclude('alipay-callback route', alipayCb, [
    'buildPaymentRequestContext',
    'recordPaymentEvent',
    "provider: 'alipay'",
  ]);

  const auditRoute = read('app/api/admin/payments/audit/route.ts');
  mustInclude('admin payments audit route', auditRoute, [
    'listPaymentEvents',
    "from('admin_roles')",
    "dynamic = 'force-dynamic'",
  ]);

  const verifyManual = read('app/api/payments/verify-manual/route.ts');
  mustInclude('verify-manual route', verifyManual, ['finalizeCnPayment']);
  mustNotInclude('verify-manual route', verifyManual, [".from('user_profiles')\n        .update"]);

  const verifyRoute = read('app/api/payments/verify/route.ts');
  mustInclude('verify route', verifyRoute, ['finalizeCnPayment']);
  mustNotInclude('verify route', verifyRoute, [".from('user_profiles')\n        .update"]);

  const statusRoute = read('app/api/payments/status/[paymentId]/route.ts');
  mustInclude('payments status route', statusRoute, ['queryWeChatOrderStatus', 'finalizeCnPayment']);

  console.log('verify-payment-observability: ok');
}

main();
