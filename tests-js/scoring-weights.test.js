const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('评分权重 getWeights 应提供分算法预设并移除占位 TODO', () => {
  const file = path.resolve(process.cwd(), 'lib/scoring.ts');
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes('const presets: Record<AlgorithmType'));
  assert.ok(!content.includes('TODO: 为其他算法定义不同的权重配置'));
});

