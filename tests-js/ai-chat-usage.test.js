const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('/api/ai/chat/message 应更新 ai_chat_sessions.token_usage 并写入 usage log', () => {
  const file = path.resolve(process.cwd(), 'app/api/ai/chat/message/route.ts');
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes(".from('ai_chat_sessions')"));
  assert.ok(content.includes('token_usage'));
  assert.ok(content.includes('insertAiUsageLog'));
  assert.ok(!content.includes("from('ai_chat_messages')"));
});

