const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Admin 算法配比：侧边栏/页面/API/迁移应存在', () => {
  const sidebarFile = path.resolve(process.cwd(), 'app/admin/components/AdminSidebar.tsx');
  const sidebar = fs.readFileSync(sidebarFile, 'utf8');
  assert.ok(sidebar.includes('/admin/algorithm/configuration'));
  assert.ok(sidebar.includes('算法配比'));

  const adminPageFile = path.resolve(process.cwd(), 'app/admin/algorithm/configuration/page.tsx');
  const adminPage = fs.readFileSync(adminPageFile, 'utf8');
  assert.ok(adminPage.includes('/api/admin/algorithm-weights'));

  const adminApiFile = path.resolve(process.cwd(), 'app/api/admin/algorithm-weights/route.ts');
  const adminApi = fs.readFileSync(adminApiFile, 'utf8');
  assert.ok(adminApi.includes('export async function GET'));
  assert.ok(adminApi.includes('export async function POST'));
  assert.ok(adminApi.includes('x-admin-proxy-hop'));
  assert.ok(adminApi.includes('x-admin-proxy-secret'));

  const migrationFile = path.resolve(
    process.cwd(),
    'supabase/migrations/20260203_algorithm_weight_configs.sql'
  );
  const migration = fs.readFileSync(migrationFile, 'utf8');
  assert.ok(migration.includes('algorithm_weight_configs'));
  assert.ok(migration.includes('algorithm_type'));
  assert.ok(migration.includes('evaluator_gender'));
  assert.ok(migration.includes('target_gender'));
});

test('算法配比：推荐生成应加载数据库权重', () => {
  const recFile = path.resolve(process.cwd(), 'app/api/matching/recommendations/route.ts');
  const rec = fs.readFileSync(recFile, 'utf8');
  assert.ok(rec.includes('loadAlgorithmWeightsFromDb'));
});
