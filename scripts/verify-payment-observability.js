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
  ]);

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

  console.log('verify-payment-observability: ok');
}

main();

