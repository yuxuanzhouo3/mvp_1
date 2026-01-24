const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('生产环境不应禁用 Next Image 优化', () => {
  const file = path.resolve(process.cwd(), 'next.config.js');
  const content = fs.readFileSync(file, 'utf8');

  const hasAlwaysUnoptimized = /unoptimized\s*:\s*true/.test(content);
  const hasProdUnoptimized = /unoptimized\s*:\s*process\.env\.NODE_ENV\s*===\s*['"]production['"]/.test(content);

  assert.equal(hasAlwaysUnoptimized || hasProdUnoptimized, false);
});

