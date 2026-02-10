const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routeFilePath = 'app/api/admin/video-demo/[id]/route.ts';

function readSource() {
  const file = path.resolve(process.cwd(), routeFilePath);
  return fs.readFileSync(file, 'utf8');
}

test('DELETE /api/admin/video-demo/[id] route file should exist', () => {
  const file = path.resolve(process.cwd(), routeFilePath);
  assert.ok(fs.existsSync(file), `${routeFilePath} should exist`);
});

test('route should export DELETE handler', () => {
  const content = readSource();
  assert.ok(
    content.includes('export async function DELETE'),
    'should export an async DELETE function'
  );
});

test('DELETE handler should use verifyAdminRequest for admin authentication', () => {
  const content = readSource();
  // Verify the DELETE function body contains verifyAdminRequest
  const deleteStart = content.indexOf('export async function DELETE');
  assert.ok(deleteStart !== -1, 'DELETE function should exist');
  const deleteBody = content.slice(deleteStart);
  assert.ok(
    deleteBody.includes('verifyAdminRequest'),
    'DELETE handler should use verifyAdminRequest helper'
  );
});

test('DELETE handler should return 401 for unauthorized requests', () => {
  const content = readSource();
  const deleteStart = content.indexOf('export async function DELETE');
  const deleteBody = content.slice(deleteStart);
  assert.ok(
    deleteBody.includes('401'),
    'DELETE handler should return 401 status for unauthorized requests'
  );
  assert.ok(
    deleteBody.includes('Unauthorized'),
    'DELETE handler should include Unauthorized error message'
  );
});

test('DELETE handler should accept id parameter from URL path', () => {
  const content = readSource();
  const deleteStart = content.indexOf('export async function DELETE');
  const deleteBody = content.slice(deleteStart);
  assert.ok(
    deleteBody.includes('params'),
    'DELETE handler should accept params in function signature'
  );
  assert.ok(
    deleteBody.includes('id: string'),
    'DELETE handler should type id as string'
  );
});

test('DELETE handler should check if record exists before deleting', () => {
  const content = readSource();
  const deleteStart = content.indexOf('export async function DELETE');
  const deleteBody = content.slice(deleteStart);
  assert.ok(
    deleteBody.includes("'Record not found'") || deleteBody.includes('"Record not found"'),
    'DELETE handler should return Record not found error'
  );
  assert.ok(
    deleteBody.includes('404'),
    'DELETE handler should return 404 for non-existent records'
  );
});

test('DELETE handler should use delete operation on video_demos table', () => {
  const content = readSource();
  const deleteStart = content.indexOf('export async function DELETE');
  const deleteBody = content.slice(deleteStart);
  assert.ok(
    deleteBody.includes("from('video_demos')"),
    'DELETE handler should operate on video_demos table'
  );
  assert.ok(
    deleteBody.includes('.delete()'),
    'DELETE handler should use delete operation'
  );
});

test('DELETE handler should filter by id when deleting', () => {
  const content = readSource();
  const deleteStart = content.indexOf('export async function DELETE');
  const deleteBody = content.slice(deleteStart);
  assert.ok(
    deleteBody.includes(".eq('id', id)"),
    'DELETE handler should filter by id when deleting'
  );
});

test('DELETE handler should return success: true on successful deletion', () => {
  const content = readSource();
  const deleteStart = content.indexOf('export async function DELETE');
  const deleteBody = content.slice(deleteStart);
  assert.ok(
    deleteBody.includes('success: true'),
    'DELETE handler should return success: true on successful deletion'
  );
});

test('DELETE handler should handle 500 errors for database failures', () => {
  const content = readSource();
  const deleteStart = content.indexOf('export async function DELETE');
  const deleteBody = content.slice(deleteStart);
  assert.ok(
    deleteBody.includes('500'),
    'DELETE handler should return 500 status for server errors'
  );
});

test('DELETE handler should use getServiceDbClient for database operations', () => {
  const content = readSource();
  const deleteStart = content.indexOf('export async function DELETE');
  const deleteBody = content.slice(deleteStart);
  assert.ok(
    deleteBody.includes('getServiceDbClient'),
    'DELETE handler should use getServiceDbClient'
  );
});

test('DELETE handler should not return data in response body (only success flag)', () => {
  const content = readSource();
  const deleteStart = content.indexOf('export async function DELETE');
  const deleteBody = content.slice(deleteStart);
  // The successful response should be { success: true } without data
  assert.ok(
    deleteBody.includes('{ success: true }'),
    'DELETE handler should return only { success: true } without data'
  );
});
