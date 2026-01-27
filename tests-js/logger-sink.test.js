const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('logger flushLogs 应通过 /api/logs 或 app_logs 落库', () => {
  const file = path.resolve(process.cwd(), 'lib/logger.ts');
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes("/api/logs"));
  assert.ok(content.includes("app_logs"));
  assert.ok(!content.includes('TODO: 发送到Supabase日志表或外部日志服务'));
});

test('应存在 logs API 路由与 app_logs 迁移', () => {
  const apiFile = path.resolve(process.cwd(), 'app/api/logs/route.ts');
  const migrationFile = path.resolve(process.cwd(), 'supabase/migrations/20260127_app_logs.sql');
  assert.ok(fs.existsSync(apiFile));
  assert.ok(fs.existsSync(migrationFile));
});

