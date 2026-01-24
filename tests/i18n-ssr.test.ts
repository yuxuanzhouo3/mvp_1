import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('middleware 应注入 x-lang 以支持 SSR 语言同步', () => {
  const file = path.resolve(process.cwd(), 'middleware.ts');
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes('x-lang'), 'middleware.ts 未检测到 x-lang 注入逻辑');
  assert.ok(content.includes('lang'), 'middleware.ts 未检测到 lang cookie 逻辑');
});

