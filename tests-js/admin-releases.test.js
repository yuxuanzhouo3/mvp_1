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
  expectRoute('app/api/admin/releases/route.ts', ['export async function GET', 'proxyFetch', '"cache-control": "no-store"']);
  expectRoute('app/api/admin/releases/activate/route.ts', ['export async function POST']);
  expectRoute('app/api/admin/releases/delete/route.ts', ['export async function POST']);
  expectRoute('app/api/admin/releases/upload/route.ts', ['export async function POST', 'Readable.fromWeb', 'fileNameParam', 'bufferUploadThresholdBytes']);
  expectRoute('app/api/admin/releases/prepare-upload/route.ts', ['export async function POST', 'createSignedUploadUrl']);
  expectRoute('app/api/admin/releases/register/route.ts', ['export async function POST', '.from("releases")']);
  expectRoute('app/api/admin/releases/signed-download/route.ts', ['export async function POST', 'createSignedUrl']);
});

test('Admin 版本管理上传不应依赖 x-file-name header', () => {
  const page = path.resolve(process.cwd(), 'app/admin/releases/page.tsx');
  const pageContent = fs.readFileSync(page, 'utf8');
  assert.ok(!pageContent.includes('"x-file-name"'), 'admin/releases 页面不应设置 x-file-name header');
  assert.ok(pageContent.includes('XMLHttpRequest'), 'CN 上传应使用 XMLHttpRequest 以展示上传进度');

  const uploadRoute = path.resolve(process.cwd(), 'app/api/admin/releases/upload/route.ts');
  const uploadContent = fs.readFileSync(uploadRoute, 'utf8');
  assert.ok(uploadContent.includes('fileNameParam'), 'upload 路由应支持 query 参数 fileName');
  assert.ok(uploadContent.includes('platform/version/fileName required'), 'upload 路由错误信息应提示 fileName');
  assert.ok(uploadContent.includes('bufferUploadThresholdBytes'), 'upload 路由应对小文件使用 Buffer 上传');
  assert.ok(uploadContent.includes('request.arrayBuffer()'), 'upload 路由应在小文件路径使用 arrayBuffer');
  assert.ok(uploadContent.includes('Cloudbase 未配置'), 'upload 路由缺配置时应返回明确报错');
});

test('/api/releases 路由应存在并返回 downloads', () => {
  expectRoute('app/api/releases/route.ts', ['export async function GET', 'downloads']);
  const file = path.resolve(process.cwd(), 'app/api/releases/route.ts');
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(!content.includes('isChinaDeployment'), 'app/api/releases/route.ts 不应依赖 isChinaDeployment 门禁 CN 读取');
});
