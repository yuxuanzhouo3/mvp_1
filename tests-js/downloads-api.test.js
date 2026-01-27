const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('/api/downloads 路由应存在并具备 region 分发能力', () => {
  const file = path.resolve(process.cwd(), 'app/api/downloads/route.ts');
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes('export async function GET'));
  assert.ok(content.includes('createSignedUrl'));
  assert.ok(content.includes('getCloudbaseTempUrl'));
});

