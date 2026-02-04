const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('算法权重：校验与回退逻辑应存在', () => {
  const weightsFile = path.resolve(process.cwd(), 'lib/matching/algorithm-weights.ts');
  const weights = fs.readFileSync(weightsFile, 'utf8');
  assert.ok(weights.includes('isValidWeights'));
  assert.ok(weights.includes('mergeAlgorithmWeights'));
  assert.ok(weights.includes('loadAlgorithmWeightsFromDb'));
});

test('算法权重：匹配计算应支持外部权重输入', () => {
  const utilsFile = path.resolve(process.cwd(), 'lib/matching/utils.ts');
  const utils = fs.readFileSync(utilsFile, 'utf8');
  assert.ok(utils.includes('getAlgorithmWeights'));
  assert.ok(utils.includes('weightsMap'));
  assert.ok(utils.includes('calculateFactorSimilarity'));

  const algoFile = path.resolve(process.cwd(), 'lib/matching/algorithms.ts');
  const algo = fs.readFileSync(algoFile, 'utf8');
  assert.ok(algo.includes('weightsMap'));
  assert.ok(algo.includes('calculateAcceptance'));
  assert.ok(algo.includes(\"getAlgorithmWeights('serendipity'\"));
  assert.ok(algo.includes(\"getAlgorithmWeights('pragmatic'\"));
});
