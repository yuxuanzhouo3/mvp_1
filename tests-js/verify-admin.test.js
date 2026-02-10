const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const filePath = 'lib/admin/verify-admin.ts';

function readSource() {
  const file = path.resolve(process.cwd(), filePath);
  return fs.readFileSync(file, 'utf8');
}

test('lib/admin/verify-admin.ts should exist', () => {
  const file = path.resolve(process.cwd(), filePath);
  assert.ok(fs.existsSync(file), `${filePath} should exist`);
});

test('verify-admin should export verifyAdminRequest function', () => {
  const content = readSource();
  assert.ok(
    content.includes('export async function verifyAdminRequest'),
    'should export verifyAdminRequest as an async function'
  );
});

test('verifyAdminRequest should accept NextRequest parameter', () => {
  const content = readSource();
  assert.ok(
    content.includes('request: NextRequest'),
    'should accept NextRequest parameter'
  );
});

test('verifyAdminRequest should return Promise<{ isAdmin: boolean }>', () => {
  const content = readSource();
  assert.ok(
    content.includes('Promise<{ isAdmin: boolean }>'),
    'should return Promise<{ isAdmin: boolean }>'
  );
});

test('verify-admin should check admin_session cookie', () => {
  const content = readSource();
  assert.ok(
    content.includes("admin_session"),
    'should reference admin_session cookie'
  );
  assert.ok(
    content.includes('request.cookies.get'),
    'should read cookies from request'
  );
});

test('verify-admin should use verifyAdminSessionToken for cookie validation', () => {
  const content = readSource();
  assert.ok(
    content.includes('verifyAdminSessionToken'),
    'should use verifyAdminSessionToken for session validation'
  );
  assert.ok(
    content.includes("from '@/utils/session'") || content.includes('from "@/utils/session"'),
    'should import from @/utils/session'
  );
});

test('verify-admin should check Authorization bearer token', () => {
  const content = readSource();
  assert.ok(
    content.includes("authorization"),
    'should check authorization header'
  );
  assert.ok(
    content.includes("Bearer "),
    'should check for Bearer prefix'
  );
});

test('verify-admin should query admin_roles table for bearer token auth', () => {
  const content = readSource();
  assert.ok(
    content.includes("admin_roles"),
    'should query admin_roles table'
  );
  assert.ok(
    content.includes("'role'") || content.includes('"role"'),
    'should select role column from admin_roles'
  );
});

test('verify-admin should support dual environment (CN and INTL)', () => {
  const content = readSource();
  assert.ok(
    content.includes('isChinaDeployment'),
    'should use isChinaDeployment for environment detection'
  );
});

test('verify-admin should use parseAdminSessionToken for session parsing', () => {
  const content = readSource();
  assert.ok(
    content.includes('parseAdminSessionToken'),
    'should use parseAdminSessionToken to parse session data'
  );
});

test('verify-admin should return { isAdmin: false } when no credentials provided', () => {
  const content = readSource();
  // The function should have a fallback return for no auth
  assert.ok(
    content.includes('isAdmin: false'),
    'should return isAdmin: false for unauthorized requests'
  );
  assert.ok(
    content.includes('isAdmin: true'),
    'should return isAdmin: true for authorized requests'
  );
});
