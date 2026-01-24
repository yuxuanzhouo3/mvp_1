const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('middleware 应注入 x-lang 以支持 SSR 语言同步', () => {
  const file = path.resolve(process.cwd(), 'middleware.ts');
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes('x-lang'));
  assert.ok(content.includes('lang'));
});

