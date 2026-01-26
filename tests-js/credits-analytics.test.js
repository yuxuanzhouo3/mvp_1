const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadCreditsAnalyticsModule() {
  const file = path.resolve(process.cwd(), 'lib/admin/credits-analytics.ts');
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: true,
    },
    fileName: file,
  });

  const module = { exports: {} };
  const context = vm.createContext({
    module,
    exports: module.exports,
    require,
    __dirname: path.dirname(file),
    __filename: file,
  });

  const script = new vm.Script(transpiled.outputText, { filename: file });
  script.runInContext(context);
  return module.exports;
}

test('aggregateCreditsStats 应按正负金额分开聚合，并补齐其他扣减', () => {
  const { aggregateCreditsStats } = loadCreditsAnalyticsModule();

  const now = new Date('2026-01-20T10:00:00.000Z');
  const mkTx = (overrides) => ({
    id: overrides.id || 'tx',
    user_id: overrides.user_id,
    type: overrides.type,
    amount: overrides.amount,
    created_at: overrides.created_at || '2026-01-20T09:00:00.000Z',
    balance_before: overrides.balance_before ?? 0,
    balance_after: overrides.balance_after ?? 0,
  });

  const transactions = [
    mkTx({ id: 'p1', user_id: 'u1', type: 'credit_purchase', amount: 50 }),
    mkTx({ id: 'r1', user_id: 'u2', type: 'refund', amount: 10 }),
    mkTx({ id: 'c1', user_id: 'u1', type: 'credit_consume_like', amount: -5 }),
    mkTx({ id: 'c2', user_id: 'u2', type: 'credit_consume_message', amount: -1 }),
    mkTx({ id: 'a1', user_id: 'u2', type: 'admin_adjust', amount: -20 }),
  ];

  const profiles = [
    { user_id: 'u1', credits: 20 },
    { user_id: 'u2', credits: 0 },
    { user_id: 'u3', credits: 100 },
  ];

  const users = [
    { id: 'u1', username: 'alice', email: 'alice@example.com' },
    { id: 'u2', username: null, email: 'bob@example.com' },
  ];

  const stats = aggregateCreditsStats({ transactions, profiles, users, now });

  assert.equal(stats.overview.total_credits_issued, 60);
  assert.equal(stats.overview.total_credits_consumed, 26);
  assert.equal(stats.overview.total_current_credits, 120);
  assert.equal(stats.overview.total_users, 3);
  assert.equal(stats.overview.users_with_credits, 2);

  const issueByType = Object.fromEntries(stats.issue_stats.map((x) => [x.type, x]));
  assert.equal(issueByType.credit_purchase.total, 50);
  assert.equal(issueByType.refund.total, 10);

  const consumeByType = Object.fromEntries(stats.consume_stats.map((x) => [x.type, x]));
  assert.equal(consumeByType.credit_consume_like.total, 5);
  assert.equal(consumeByType.credit_consume_message.total, 1);
  assert.equal(consumeByType.other_consumption.total, 20);
  assert.equal(Math.round(consumeByType.other_consumption.percentage), Math.round((20 / 26) * 100));

  assert.equal(stats.top_consumers[0].user_id, 'u2');
  assert.equal(stats.top_consumers[0].username, 'bob');
  assert.equal(stats.top_consumers[0].total_consumed, 21);

  assert.equal(stats.distribution.zero, 1);
  assert.equal(stats.distribution['1-50'], 1);
  assert.equal(stats.distribution['51-100'], 1);
  assert.equal(stats.distribution['101-200'], 0);
  assert.equal(stats.distribution['201-500'], 0);
  assert.equal(stats.distribution['500+'], 0);

  assert.equal(stats.daily_stats.length, 30);
});

