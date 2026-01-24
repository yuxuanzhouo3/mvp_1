import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('生产环境不应禁用 Next Image 优化', () => {
  const file = path.resolve(process.cwd(), 'next.config.js');
  const content = fs.readFileSync(file, 'utf8');

  assert.equal(
    /unoptimized\s*:\s*true/.test(content) || /unoptimized\s*:\s*process\.env\.NODE_ENV\s*===\s*['"]production['"]/.test(content),
    false,
    'next.config.js 检测到 images.unoptimized 在生产环境被禁用'
  );
});

