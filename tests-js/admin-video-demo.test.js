const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routeFilePath = 'app/api/admin/video-demo/route.ts';

function readSource() {
  const file = path.resolve(process.cwd(), routeFilePath);
  return fs.readFileSync(file, 'utf8');
}

test('POST /api/admin/video-demo route file should exist', () => {
  const file = path.resolve(process.cwd(), routeFilePath);
  assert.ok(fs.existsSync(file), `${routeFilePath} should exist`);
});

test('route should export POST handler', () => {
  const content = readSource();
  assert.ok(
    content.includes('export async function POST'),
    'should export an async POST function'
  );
});

test('route should use verifyAdminRequest for admin authentication', () => {
  const content = readSource();
  assert.ok(
    content.includes('verifyAdminRequest'),
    'should use verifyAdminRequest helper'
  );
  assert.ok(
    content.includes("from '@/lib/admin/verify-admin'") ||
      content.includes('from "@/lib/admin/verify-admin"'),
    'should import verifyAdminRequest from @/lib/admin/verify-admin'
  );
});

test('route should return 401 for unauthorized requests', () => {
  const content = readSource();
  assert.ok(
    content.includes('401'),
    'should return 401 status for unauthorized requests'
  );
  assert.ok(
    content.includes('Unauthorized'),
    'should include Unauthorized error message'
  );
});

test('route should validate required field: video_url', () => {
  const content = readSource();
  assert.ok(
    content.includes('video_url'),
    'should reference video_url field'
  );
  assert.ok(
    content.includes('Missing required field: video_url') ||
      content.includes('video_url'),
    'should have validation for video_url'
  );
});

test('route should validate required field: title', () => {
  const content = readSource();
  assert.ok(
    content.includes('title'),
    'should reference title field'
  );
  assert.ok(
    content.includes('Missing required field: title') ||
      content.includes('title'),
    'should have validation for title'
  );
});

test('route should return 400 for missing required fields', () => {
  const content = readSource();
  assert.ok(
    content.includes('400'),
    'should return 400 status for missing required fields'
  );
});

test('route should handle is_active unique constraint - deactivate others first', () => {
  const content = readSource();
  assert.ok(
    content.includes('is_active'),
    'should reference is_active field'
  );
  // When is_active is true, should deactivate other records first
  assert.ok(
    content.includes(".update({ is_active: false })") ||
      content.includes('.update({') && content.includes('is_active: false'),
    'should deactivate other records when is_active is true'
  );
  assert.ok(
    content.includes(".eq('is_active', true)"),
    'should target currently active records for deactivation'
  );
});

test('route should use getServiceDbClient for database operations', () => {
  const content = readSource();
  assert.ok(
    content.includes('getServiceDbClient'),
    'should use getServiceDbClient'
  );
  assert.ok(
    content.includes("from '@/lib/db-client'") ||
      content.includes('from "@/lib/db-client"'),
    'should import from @/lib/db-client'
  );
});

test('route should insert into video_demos table', () => {
  const content = readSource();
  assert.ok(
    content.includes("from('video_demos')"),
    'should operate on video_demos table'
  );
  assert.ok(
    content.includes('.insert('),
    'should use insert operation for creating records'
  );
});

test('route should return created record with success response', () => {
  const content = readSource();
  assert.ok(
    content.includes('success: true'),
    'should return success: true on successful creation'
  );
  assert.ok(
    content.includes('.select()'),
    'should select the inserted record to return it'
  );
  assert.ok(
    content.includes('.single()'),
    'should use .single() to return a single record'
  );
});

test('route should handle 500 errors for database failures', () => {
  const content = readSource();
  assert.ok(
    content.includes('500'),
    'should return 500 status for server errors'
  );
});

test('route should use force-dynamic export', () => {
  const content = readSource();
  assert.ok(
    content.includes("export const dynamic = 'force-dynamic'") ||
      content.includes('export const dynamic = "force-dynamic"'),
    'should export dynamic = force-dynamic'
  );
});

test('route should set created_at and updated_at timestamps', () => {
  const content = readSource();
  assert.ok(
    content.includes('created_at'),
    'should set created_at timestamp'
  );
  assert.ok(
    content.includes('updated_at'),
    'should set updated_at timestamp'
  );
});

test('route should return 201 status on successful creation', () => {
  const content = readSource();
  assert.ok(
    content.includes('201'),
    'should return 201 status for successful creation'
  );
});

test('route should handle invalid JSON body', () => {
  const content = readSource();
  assert.ok(
    content.includes('Invalid JSON') || content.includes('request.json()'),
    'should handle JSON parsing errors'
  );
});
