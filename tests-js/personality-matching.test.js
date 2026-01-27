const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('MBTI personality score 应基于兼容性矩阵求平均', () => {
  const file = path.resolve(process.cwd(), 'lib/mbti-compatibility.ts');
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes('MBTI_COMPATIBILITY_MATRIX[mbti]'));
  assert.ok(content.includes('Object.values'));
  assert.ok(content.includes('reduce'));
});

test('匹配因子相似度 personality 应使用 MBTI 兼容性', () => {
  const file = path.resolve(process.cwd(), 'lib/matching/utils.ts');
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes("import { calculateMBTICompatibility }"));
  assert.ok(content.includes("factor === 'personality'"));
  assert.ok(content.includes('calculateMBTICompatibility'));
});

test('匹配算法应纳入 personalityCompatibility 字段', () => {
  const file = path.resolve(process.cwd(), 'lib/matching/algorithms.ts');
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes('personalityCompatibility'));
  assert.ok(content.includes("import { calculateMBTICompatibility }"));
});

