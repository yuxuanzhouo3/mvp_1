const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Tick 量化：核心工具与区间计算应集中到 score-range', () => {
  const scoreRangeFile = path.resolve(process.cwd(), 'lib/matching/score-range.ts');
  const scoreRange = fs.readFileSync(scoreRangeFile, 'utf8');
  assert.ok(scoreRange.includes('SCORE_TICK'));
  assert.ok(scoreRange.includes('rangeFromDiffTicks'));
  assert.ok(scoreRange.includes('rangeFromRatio'));
});

test('Tick 量化：匹配区间与动态扩展应使用统一口径', () => {
  const utilsFile = path.resolve(process.cwd(), 'lib/matching/utils.ts');
  const utils = fs.readFileSync(utilsFile, 'utf8');
  assert.ok(utils.includes('rangeFromDiffTicks'));
  assert.ok(utils.includes('rangeFromRatio'));
  assert.ok(utils.includes('clampScoreToTick'));

  const configFile = path.resolve(process.cwd(), 'lib/config/matching-config.ts');
  const config = fs.readFileSync(configFile, 'utf8');
  assert.ok(config.includes('RANGE_EXPANSION_STEP_TICKS'));
  assert.ok(config.includes('rangeFromRatio'));
  assert.ok(config.includes('rangeFromDiffTicks'));

  const dynamicFile = path.resolve(process.cwd(), 'lib/matching/dynamic-matching.ts');
  const dynamic = fs.readFileSync(dynamicFile, 'utf8');
  assert.ok(dynamic.includes('expandRange'));
  assert.ok(dynamic.includes('RANGE_EXPANSION_STEP_TICKS'));
});
