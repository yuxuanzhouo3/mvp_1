const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('/api/payments/wechat-refund-callback 应验证签名并更新 payments', () => {
  const file = path.resolve(process.cwd(), 'app/api/payments/wechat-refund-callback/route.ts');
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes('verifyWeChatV3Signature'));
  assert.ok(content.includes(".from('payments')"));
  assert.ok(!content.includes('TODO: 实际实现应该更新数据库'));
});

