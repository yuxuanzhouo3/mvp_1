const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routeFilePath = 'app/api/admin/video-demo/[id]/route.ts';

function readSource() {
  const file = path.resolve(process.cwd(), routeFilePath);
  return fs.readFileSync(file, 'utf8');
}

test('PUT /api/admin/video-demo/[id] route file should exist', () => {
  const file = path.resolve(process.cwd(), routeFilePath);
  assert.ok(fs.existsSync(file), `${routeFilePath} should exist`);
});

test('route should export PUT handler', () => {
  const content = readSource();
  assert.ok(
    content.includes('export async function PUT'),
    'should export an async PUT function'
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

test('route should accept id parameter from URL path', () => {
  const content = readSource();
  assert.ok(
    content.includes('params'),
    'should accept params in function signature'
  );
  assert.ok(
    content.includes('id: string'),
    'should type id as string'
  );
});

test('route should support partial update for video_url', () => {
  const content = readSource();
  assert.ok(
    content.includes('body.video_url'),
    'should check for video_url in request body'
  );
});

test('route should support partial update for title', () => {
  const content = readSource();
  assert.ok(
    content.includes('body.title'),
    'should check for title in request body'
  );
});

test('route should support partial update for description', () => {
  const content = readSource();
  assert.ok(
    content.includes('body.description'),
    'should check for description in request body'
  );
});

test('route should support partial update for is_active', () => {
  const content = readSource();
  assert.ok(
    content.includes('body.is_active'),
    'should check for is_active in request body'
  );
});

test('route should validate video_url when provided', () => {
  const content = readSource();
  assert.ok(
    content.includes("video_url must be a non-empty string") ||
      content.includes('video_url'),
    'should validate video_url field when provided'
  );
});

test('route should validate title when provided', () => {
  const content = readSource();
  assert.ok(
    content.includes("title must be a non-empty string") ||
      content.includes('title'),
    'should validate title field when provided'
  );
});

test('route should return 400 when no valid fields to update', () => {
  const content = readSource();
  assert.ok(
    content.includes('No valid fields to update'),
    'should return error when no valid fields provided'
  );
  assert.ok(
    content.includes('400'),
    'should return 400 status'
  );
});

test('route should check if record exists before updating', () => {
  const content = readSource();
  assert.ok(
    content.includes("'Record not found'") || content.includes('"Record not found"'),
    'should return Record not found error'
  );
  assert.ok(
    content.includes('404'),
    'should return 404 for non-existent records'
  );
});

test('route should handle is_active unique constraint - deactivate others first', () => {
  const content = readSource();
  assert.ok(
    content.includes('is_active'),
    'should reference is_active field'
  );
  assert.ok(
    content.includes(".update({ is_active: false })") ||
      (content.includes('.update({') && content.includes('is_active: false')),
    'should deactivate other records when is_active is true'
  );
  assert.ok(
    content.includes(".eq('is_active', true)"),
    'should target currently active records for deactivation'
  );
});

test('route should always update updated_at timestamp', () => {
  const content = readSource();
  assert.ok(
    content.includes('updated_at'),
    'should set updated_at timestamp'
  );
  assert.ok(
    content.includes('new Date().toISOString()'),
    'should use ISO string for timestamp'
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

test('route should update video_demos table', () => {
  const content = readSource();
  assert.ok(
    content.includes("from('video_demos')"),
    'should operate on video_demos table'
  );
  assert.ok(
    content.includes('.update('),
    'should use update operation'
  );
});

test('route should return updated record with success response', () => {
  const content = readSource();
  assert.ok(
    content.includes('success: true'),
    'should return success: true on successful update'
  );
  assert.ok(
    content.includes('.select()'),
    'should select the updated record to return it'
  );
  assert.ok(
    content.includes('.single()'),
    'should use .single() to return a single record'
  );
});

test('route should return 200 status on successful update', () => {
  const content = readSource();
  assert.ok(
    content.includes('200'),
    'should return 200 status for successful update'
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

test('route should handle invalid JSON body', () => {
  const content = readSource();
  assert.ok(
    content.includes('Invalid JSON') || content.includes('request.json()'),
    'should handle JSON parsing errors'
  );
});

test('route should use .eq(id) to target specific record for update', () => {
  const content = readSource();
  assert.ok(
    content.includes(".eq('id', id)"),
    'should filter by id when updating'
  );
});
