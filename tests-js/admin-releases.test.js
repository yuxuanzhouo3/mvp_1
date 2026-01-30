const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function expectRoute(filePath, expectedSnippets) {
  const file = path.resolve(process.cwd(), filePath);
  const content = fs.readFileSync(file, 'utf8');
  for (const snippet of expectedSnippets) {
    assert.ok(content.includes(snippet), `${filePath} missing: ${snippet}`);
  }
}

test('Admin 版本管理相关路由应存在', () => {
  expectRoute('app/api/admin/releases/route.ts', ['export async function GET', 'proxyFetch']);
  expectRoute('app/api/admin/releases/activate/route.ts', ['export async function POST']);
  expectRoute('app/api/admin/releases/delete/route.ts', ['export async function POST']);
  expectRoute('app/api/admin/releases/upload/route.ts', ['export async function POST', 'arrayBuffer']);
  expectRoute('app/api/admin/releases/prepare-upload/route.ts', ['export async function POST', 'createSignedUploadUrl']);
  expectRoute('app/api/admin/releases/register/route.ts', ['export async function POST', '.from("releases")']);
  expectRoute('app/api/admin/releases/signed-download/route.ts', ['export async function POST', 'createSignedUrl']);
});

test('/api/releases 路由应存在并返回 downloads', () => {
  expectRoute('app/api/releases/route.ts', ['export async function GET', 'downloads']);
  const file = path.resolve(process.cwd(), 'app/api/releases/route.ts');
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(!content.includes('isChinaDeployment'), 'app/api/releases/route.ts 不应依赖 isChinaDeployment 门禁 CN 读取');
});
