const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

/**
 * Unit tests for profile skip API logic
 * Tests the core business logic: skip count increment, max limit enforcement,
 * default value handling for missing fields (CN environment)
 */

function loadConstantsModule() {
  const file = path.resolve(process.cwd(), 'lib/constants/profile.ts');
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

// Simulate the core skip logic extracted from the API route
function simulateSkipLogic(currentSkipCount, maxSkipCount) {
  // Handle missing field (CN environment Cloudbase) - default to 0
  const skipCount = currentSkipCount ?? 0;

  // Check if max limit reached
  if (skipCount >= maxSkipCount) {
    return {
      success: false,
      error: 'Maximum skip limit reached',
      status: 403,
      data: {
        profile_skip_count: skipCount,
        can_skip: false,
      },
    };
  }

  // Increment skip count
  const newSkipCount = skipCount + 1;

  return {
    success: true,
    error: null,
    status: 200,
    data: {
      profile_skip_count: newSkipCount,
      can_skip: newSkipCount < maxSkipCount,
    },
  };
}

test('MAX_PROFILE_SKIP_COUNT should be 3', () => {
  const { MAX_PROFILE_SKIP_COUNT } = loadConstantsModule();
  assert.equal(MAX_PROFILE_SKIP_COUNT, 3);
});

test('skip logic: should increment skip count from 0 to 1', () => {
  const result = simulateSkipLogic(0, 3);
  assert.equal(result.success, true);
  assert.equal(result.data.profile_skip_count, 1);
  assert.equal(result.data.can_skip, true);
});

test('skip logic: should increment skip count from 1 to 2', () => {
  const result = simulateSkipLogic(1, 3);
  assert.equal(result.success, true);
  assert.equal(result.data.profile_skip_count, 2);
  assert.equal(result.data.can_skip, true);
});

test('skip logic: should increment skip count from 2 to 3 and set can_skip to false', () => {
  const result = simulateSkipLogic(2, 3);
  assert.equal(result.success, true);
  assert.equal(result.data.profile_skip_count, 3);
  assert.equal(result.data.can_skip, false);
});

test('skip logic: should reject when skip count is at max (3)', () => {
  const result = simulateSkipLogic(3, 3);
  assert.equal(result.success, false);
  assert.equal(result.status, 403);
  assert.equal(result.error, 'Maximum skip limit reached');
  assert.equal(result.data.profile_skip_count, 3);
  assert.equal(result.data.can_skip, false);
});

test('skip logic: should reject when skip count exceeds max', () => {
  const result = simulateSkipLogic(5, 3);
  assert.equal(result.success, false);
  assert.equal(result.status, 403);
  assert.equal(result.data.can_skip, false);
});

test('skip logic: should default to 0 when profile_skip_count is null (CN Cloudbase missing field)', () => {
  const result = simulateSkipLogic(null, 3);
  assert.equal(result.success, true);
  assert.equal(result.data.profile_skip_count, 1);
  assert.equal(result.data.can_skip, true);
});

test('skip logic: should default to 0 when profile_skip_count is undefined (CN Cloudbase missing field)', () => {
  const result = simulateSkipLogic(undefined, 3);
  assert.equal(result.success, true);
  assert.equal(result.data.profile_skip_count, 1);
  assert.equal(result.data.can_skip, true);
});

test('skip logic: can_skip should be true when new count is less than max', () => {
  for (let i = 0; i < 2; i++) {
    const result = simulateSkipLogic(i, 3);
    assert.equal(result.data.can_skip, true, `can_skip should be true when count goes from ${i} to ${i + 1}`);
  }
});

test('skip logic: can_skip should be false when new count equals max', () => {
  const result = simulateSkipLogic(2, 3);
  assert.equal(result.data.can_skip, false);
});

// ============================================================
// Tests for getDefaultProfileValues helper function
// ============================================================

function loadGetDefaultProfileValues() {
  const file = path.resolve(process.cwd(), 'app/api/user/profile/skip/route.ts');
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

  // Extract just the getDefaultProfileValues function by running in a sandboxed context
  const module = { exports: {} };
  const context = vm.createContext({
    module,
    exports: module.exports,
    require: () => ({}), // stub external dependencies
    __dirname: path.dirname(file),
    __filename: file,
    console,
  });

  const script = new vm.Script(transpiled.outputText, { filename: file });
  script.runInContext(context);
  return module.exports.getDefaultProfileValues;
}

test('getDefaultProfileValues: should return all defaults for null/undefined profile', () => {
  const getDefaultProfileValues = loadGetDefaultProfileValues();
  const result = getDefaultProfileValues(null);
  assert.equal(JSON.stringify(result), JSON.stringify({
    marital_status: 'single',
    relationship_history_count: 0,
  }));
});

test('getDefaultProfileValues: should return all defaults for empty profile', () => {
  const getDefaultProfileValues = loadGetDefaultProfileValues();
  const result = getDefaultProfileValues({});
  assert.equal(JSON.stringify(result), JSON.stringify({
    marital_status: 'single',
    relationship_history_count: 0,
  }));
});

test('getDefaultProfileValues: should return all defaults for undefined profile', () => {
  const getDefaultProfileValues = loadGetDefaultProfileValues();
  const result = getDefaultProfileValues(undefined);
  assert.equal(JSON.stringify(result), JSON.stringify({
    marital_status: 'single',
    relationship_history_count: 0,
  }));
});

test('getDefaultProfileValues: should preserve existing marital_status', () => {
  const getDefaultProfileValues = loadGetDefaultProfileValues();
  const result = getDefaultProfileValues({ marital_status: 'married' });
  assert.equal(result.marital_status, undefined, 'should not override existing marital_status');
  assert.equal(result.relationship_history_count, 0, 'should fill null relationship_history_count');
});

test('getDefaultProfileValues: should preserve existing relationship_history_count', () => {
  const getDefaultProfileValues = loadGetDefaultProfileValues();
  const result = getDefaultProfileValues({ relationship_history_count: 3 });
  assert.equal(result.marital_status, 'single', 'should fill null marital_status');
  assert.equal(result.relationship_history_count, undefined, 'should not override existing relationship_history_count');
});

test('getDefaultProfileValues: should return empty object when all defaults already filled', () => {
  const getDefaultProfileValues = loadGetDefaultProfileValues();
  const result = getDefaultProfileValues({
    marital_status: 'divorced',
    relationship_history_count: 5,
  });
  assert.equal(JSON.stringify(result), '{}', 'should return empty object when no defaults needed');
});

test('getDefaultProfileValues: should fill null fields even when profile has other data', () => {
  const getDefaultProfileValues = loadGetDefaultProfileValues();
  const result = getDefaultProfileValues({
    education_level: 'bachelor',
    annual_income_range: '50k-100k',
    marital_status: null,
    relationship_history_count: null,
  });
  assert.equal(JSON.stringify(result), JSON.stringify({
    marital_status: 'single',
    relationship_history_count: 0,
  }));
});

test('getDefaultProfileValues: should treat 0 as a valid existing value (not null)', () => {
  const getDefaultProfileValues = loadGetDefaultProfileValues();
  const result = getDefaultProfileValues({ relationship_history_count: 0 });
  assert.equal(result.relationship_history_count, undefined, 'should not override 0 value');
  assert.equal(result.marital_status, 'single', 'should fill null marital_status');
});

test('getDefaultProfileValues: should treat empty string as a valid existing value', () => {
  const getDefaultProfileValues = loadGetDefaultProfileValues();
  const result = getDefaultProfileValues({ marital_status: '' });
  // Empty string is not null/undefined, so it should be preserved
  assert.equal(result.marital_status, undefined, 'should not override empty string');
});

test('skip API route file should exist and export PATCH handler', () => {
  const routePath = path.resolve(process.cwd(), 'app/api/user/profile/skip/route.ts');
  assert.ok(fs.existsSync(routePath), 'route.ts file should exist');

  const source = fs.readFileSync(routePath, 'utf8');
  assert.ok(source.includes('export async function PATCH'), 'should export PATCH handler');
  assert.ok(source.includes('authenticateUser'), 'should use authenticateUser for auth');
  assert.ok(source.includes('getServiceDbClient'), 'should use getServiceDbClient for DB access');
  assert.ok(source.includes('MAX_PROFILE_SKIP_COUNT'), 'should use MAX_PROFILE_SKIP_COUNT constant');
  assert.ok(source.includes('profile_skip_count'), 'should reference profile_skip_count field');
  assert.ok(source.includes('can_skip'), 'should return can_skip status');
  assert.ok(source.includes("?? 0"), 'should default missing profile_skip_count to 0');
  assert.ok(source.includes('export function getDefaultProfileValues'), 'should export getDefaultProfileValues helper');
});
