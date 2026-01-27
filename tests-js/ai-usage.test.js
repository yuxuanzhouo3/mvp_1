const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('/api/ai/assistant 应进行使用限额检查并记录 ai_usage_logs', () => {
  const file = path.resolve(process.cwd(), 'app/api/ai/assistant/route.ts');
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes('checkAiUsageLimit'));
  assert.ok(content.includes('insertAiUsageLog'));
  assert.ok(content.includes('deductAiUsage'));
  assert.ok(!content.includes('TODO: 记录 AI 使用量到数据库用于限额控制'));
});
