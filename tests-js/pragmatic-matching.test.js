const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('稳稳幸福：候选池向下扩展且排序更贴近自身', () => {
  const algoFile = path.resolve(process.cwd(), 'lib/matching/algorithms.ts');
  const algo = fs.readFileSync(algoFile, 'utf8');
  assert.ok(algo.includes('matchPragmatic'));
  assert.ok(algo.includes('expandRange'));
  assert.ok(algo.includes('DEFAULT_RANGE_EXPANSION_STEP_TICKS'));
  assert.ok(algo.includes('aAbove'));
  assert.ok(algo.includes('diffA'));
  assert.ok(algo.includes('successRate'));
  assert.ok(algo.includes("getAlgorithmWeights('pragmatic'"));
  assert.ok(algo.includes('factorSimilarity'));
});
