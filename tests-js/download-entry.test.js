const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('global-header 下载下拉入口不应包含占位 TODO', () => {
  const file = path.resolve(process.cwd(), 'components/ui/global-header.tsx');
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes('openDownload('));
  assert.ok(!content.includes('TODO: Add download link'));
});

