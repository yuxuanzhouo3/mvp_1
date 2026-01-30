const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Admin 算法名称管理：路由/页面/API/迁移应存在', () => {
  const sidebarFile = path.resolve(process.cwd(), 'app/admin/components/AdminSidebar.tsx');
  const sidebar = fs.readFileSync(sidebarFile, 'utf8');
  assert.ok(sidebar.includes('/admin/algorithm-names'));
  assert.ok(sidebar.includes('算法名称'));

  const adminPageFile = path.resolve(process.cwd(), 'app/admin/algorithm-names/page.tsx');
  const adminPage = fs.readFileSync(adminPageFile, 'utf8');
  assert.ok(adminPage.includes('AdminAlgorithmNamesPage'));
  assert.ok(adminPage.includes('/api/admin/algorithm-names'));

  const adminApiFile = path.resolve(process.cwd(), 'app/api/admin/algorithm-names/route.ts');
  const adminApi = fs.readFileSync(adminApiFile, 'utf8');
  assert.ok(adminApi.includes('export async function GET'));
  assert.ok(adminApi.includes('export async function POST'));
  assert.ok(adminApi.includes('x-admin-proxy-hop'));
  assert.ok(adminApi.includes('x-admin-proxy-secret'));

  const publicApiFile = path.resolve(process.cwd(), 'app/api/algorithm-names/route.ts');
  const publicApi = fs.readFileSync(publicApiFile, 'utf8');
  assert.ok(publicApi.includes('export async function GET'));
  assert.ok(publicApi.includes('algorithm_name_overrides'));

  const migrationFile = path.resolve(
    process.cwd(),
    'supabase/migrations/20260129_algorithm_name_overrides.sql'
  );
  const migration = fs.readFileSync(migrationFile, 'utf8');
  assert.ok(migration.includes('CREATE TABLE IF NOT EXISTS public.algorithm_name_overrides'));
  assert.ok(migration.includes('algo_type_enum'));

  const utilFile = path.resolve(process.cwd(), 'lib/matching/algorithm-display-name.ts');
  const util = fs.readFileSync(utilFile, 'utf8');
  assert.ok(util.includes('getAlgorithmDisplayNamesForRequest'));
});

test('算法展示名：前台关键组件不应硬编码四算法名称', () => {
  const matchScoreDetailsFile = path.resolve(process.cwd(), 'components/matching/MatchScoreDetails.tsx');
  const matchScoreDetails = fs.readFileSync(matchScoreDetailsFile, 'utf8');
  assert.ok(!matchScoreDetails.includes('金玉良缘'));
  assert.ok(!matchScoreDetails.includes('勇敢追爱'));
  assert.ok(!matchScoreDetails.includes('稳稳幸福'));
  assert.ok(!matchScoreDetails.includes('心动盲盒'));
  assert.ok(!matchScoreDetails.includes('Compatible Match'));
  assert.ok(!matchScoreDetails.includes('Romantic Pursuit'));
  assert.ok(!matchScoreDetails.includes('Pragmatic Match'));
});

test('算法展示名：/matching 详情弹窗应支持后台覆写', () => {
  const matchingPageFile = path.resolve(process.cwd(), 'app/matching/page.tsx');
  const matchingPage = fs.readFileSync(matchingPageFile, 'utf8');
  assert.ok(matchingPage.includes('algorithmNameOverrides={algorithmNameOverrides}'));
});

test('算法展示名：匹配详情短句不应包含固定算法名', () => {
  const zhFile = path.resolve(process.cwd(), 'lib/i18n/translations/zh.ts');
  const zh = fs.readFileSync(zhFile, 'utf8');
  assert.ok(!zh.includes("romantic: '勇敢追爱"));
  assert.ok(!zh.includes("pragmatic: '稳稳幸福"));

  const enFile = path.resolve(process.cwd(), 'lib/i18n/translations/en.ts');
  const en = fs.readFileSync(enFile, 'utf8');
  assert.ok(!en.includes("serendipity: 'Serendipity brought you together"));
});
