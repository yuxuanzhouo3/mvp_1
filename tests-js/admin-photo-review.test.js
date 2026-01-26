const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(process.cwd());

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

test('admin/photo-review 页面使用 Cookie 鉴权调用审核接口', () => {
  const content = read('app/admin/photo-review/page.tsx');

  assert.equal(
    /getSupabaseClient\(/.test(content),
    false,
    'photo-review 页面不应依赖 Supabase session token'
  );

  assert.equal(
    /Authorization['"]\s*:/.test(content),
    false,
    'photo-review 页面不应手动拼 Authorization 头'
  );

  assert.ok(
    /credentials:\s*'include'/.test(content),
    'photo-review 页面应使用 credentials: include 发送 admin_session Cookie'
  );

  assert.ok(
    /action:\s*'set-primary'/.test(content),
    'photo-review 页面应支持 set-primary 操作'
  );

  assert.ok(
    /useState<\s*'pending'\s*\|\s*'approved'\s*>/.test(content),
    'photo-review 页面应包含 pending/approved 两种模式'
  );

  assert.ok(
    /viewMode === 'approved' && !photo\.is_primary/.test(content),
    '仅在 approved 模式允许设为主照片'
  );

  assert.ok(
    /viewMode === 'approved' && photo\.is_primary/.test(content),
    '仅在 approved 模式对主照片开放打分'
  );

  assert.equal(
    /viewMode === 'pending' && !photo\.is_primary/.test(content),
    false,
    'pending 模式不应出现设为主照片入口'
  );
});

test('review API 同时支持 admin_session 与 Bearer，并包含 set-primary + 市场价值同步', () => {
  const content = read('app/api/admin/photos/review/route.ts');

  assert.ok(
    /request\.cookies\.get\('admin_session'\)/.test(content),
    'review API 应读取 admin_session cookie'
  );

  assert.ok(
    /verifyAdminSessionToken\(/.test(content),
    'review API 应校验 admin_session token'
  );

  assert.ok(
    /case\s+'set-primary'/.test(content),
    'review API 应包含 set-primary action'
  );

  assert.ok(
    /recalculateAndSyncMarketValue/.test(content),
    'review API 应包含市场价值重算逻辑'
  );

  assert.ok(
    /Photo must be approved before setting as primary/.test(content),
    'set-primary 应强制要求已审核通过'
  );

  assert.ok(
    /Photo must be approved before rating/.test(content),
    'rate 应强制要求已审核通过'
  );

  assert.ok(
    /getCnServiceDbClient/.test(content) && /getIntlServiceDbClient/.test(content),
    'review API 应支持 CN/INTL 跨环境写入'
  );
});

test('pending API 的 total 统计应包含 userId/unrated 过滤', () => {
  const content = read('app/api/admin/photos/pending/route.ts');

  assert.ok(
    /const buildCountQuery = \(db: any\) =>[\s\S]*?\.eq\('audit_status', status\)/.test(content),
    'pending API 应以 buildCountQuery 方式构造 total 统计条件'
  );

  assert.ok(
    /if\s*\(unrated\)[\s\S]*?query\s*=\s*query\.is\('admin_rating', null\)\.eq\('is_primary', true\)/.test(content),
    'pending API total 统计应包含 unrated(admin_rating is null + is_primary) 条件'
  );

  assert.ok(
    /if\s*\(userId\)[\s\S]*?query\s*=\s*query\.eq\('user_id', userId\)/.test(content),
    'pending API total 统计应包含 userId 过滤条件'
  );

  assert.ok(
    /getCnServiceDbClient/.test(content) && /getIntlServiceDbClient/.test(content),
    'pending API 应支持 CN/INTL 跨环境查询'
  );
});

test('admin 路由默认中文且不污染前台语言存储', () => {
  const rootLayout = read('app/layout.tsx');
  assert.ok(
    /const pathname = headerStore\.get\('x-pathname'\)/.test(rootLayout),
    'RootLayout 应读取 x-pathname 以识别 /admin 路由'
  );
  assert.ok(
    /languageScope=\{isAdminRoute \? 'admin' : 'app'\}/.test(rootLayout),
    'RootLayout 应给 Providers 传递 admin/app 的 languageScope'
  );

  const provider = read('components/language-provider.tsx');
  assert.ok(/admin_lang/.test(provider), 'LanguageProvider 应使用 admin_lang cookie');
  assert.ok(/preferred-language-admin/.test(provider), 'LanguageProvider 应使用 admin 专用 localStorage key');
  assert.ok(/Path=\$\{cookiePath\}/.test(provider), 'LanguageProvider 应按 scope 写入不同 Path 的 cookie');
});
