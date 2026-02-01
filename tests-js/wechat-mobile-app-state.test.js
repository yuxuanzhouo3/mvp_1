const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function requireFromTypeScript(tsFilePath) {
  const source = fs.readFileSync(tsFilePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: true,
    },
    fileName: tsFilePath,
  }).outputText;

  const m = new Module(tsFilePath, module);
  m.filename = tsFilePath;
  m.paths = Module._nodeModulePaths(path.dirname(tsFilePath));
  m._compile(output, tsFilePath);
  return m.exports;
}

const ROOT = path.resolve(process.cwd());
const wechatOAuthPath = path.join(ROOT, 'lib', 'services', 'auth', 'wechat-oauth.ts');

test('wechat mobile_app: 读取移动应用配置', () => {
  process.env.WECHAT_MOBILE_APP = 'mobile_app_id';
  process.env.WECHAT_MOBILE_APP_SECRET = 'mobile_app_secret';
  process.env.WECHAT_APP_ID = 'open_app_id';
  process.env.WECHAT_APP_SECRET = 'open_app_secret';
  process.env.WECHAT_OAUTH_STATE_SECRET = 'state_secret';

  const { getWeChatOAuthCredentials } = requireFromTypeScript(wechatOAuthPath);
  const creds = getWeChatOAuthCredentials('mobile_app');
  assert.equal(creds.appId, 'mobile_app_id');
  assert.equal(creds.appSecret, 'mobile_app_secret');
});

test('wechat signed state: 生成与验签', () => {
  process.env.WECHAT_OAUTH_STATE_SECRET = 'state_secret_2';
  const { createWeChatSignedState, parseWeChatSignedState } = requireFromTypeScript(wechatOAuthPath);

  const state = createWeChatSignedState({
    nonce: 'nonce_1',
    redirectPath: '/dashboard',
    loginType: 'mobile_app',
    ttlSeconds: 600,
  });
  const payload = parseWeChatSignedState(state);
  assert.ok(payload);
  assert.equal(payload.n, 'nonce_1');
  assert.equal(payload.r, '/dashboard');
  assert.equal(payload.t, 'mobile_app');
});

test('wechat signed state: 过期应失败', () => {
  process.env.WECHAT_OAUTH_STATE_SECRET = 'state_secret_3';
  const { createWeChatSignedState, parseWeChatSignedState } = requireFromTypeScript(wechatOAuthPath);

  const realNow = Date.now;
  try {
    Date.now = () => 1_700_000_000_000;
    const state = createWeChatSignedState({
      nonce: 'nonce_2',
      redirectPath: '/dashboard',
      loginType: 'mobile_app',
      ttlSeconds: 1,
    });

    Date.now = () => 1_700_000_070_000;
    const payload = parseWeChatSignedState(state);
    assert.equal(payload, null);
  } finally {
    Date.now = realNow;
  }
});

test('wechat signed state: 篡改应失败', () => {
  process.env.WECHAT_OAUTH_STATE_SECRET = 'state_secret_4';
  const { createWeChatSignedState, parseWeChatSignedState } = requireFromTypeScript(wechatOAuthPath);

  const state = createWeChatSignedState({
    nonce: 'nonce_3',
    redirectPath: '/dashboard',
    loginType: 'mobile_app',
    ttlSeconds: 600,
  });

  const [payloadB64, sigB64] = state.split('.');
  const tamperedPayloadB64 = payloadB64.slice(0, -1) + (payloadB64.slice(-1) === 'A' ? 'B' : 'A');
  const tampered = `${tamperedPayloadB64}.${sigB64}`;
  const payload = parseWeChatSignedState(tampered);
  assert.equal(payload, null);
});

test('wechat signed state: secret 可回退到 WECHAT_MOBILE_APP_SECRET', () => {
  delete process.env.WECHAT_OAUTH_STATE_SECRET;
  delete process.env.ADMIN_SESSION_SECRET;
  process.env.WECHAT_MOBILE_APP_SECRET = 'mobile_fallback_secret';

  const { createWeChatSignedState, parseWeChatSignedState } = requireFromTypeScript(wechatOAuthPath);
  const state = createWeChatSignedState({
    nonce: 'nonce_4',
    redirectPath: '/dashboard',
    loginType: 'mobile_app',
    ttlSeconds: 600,
  });
  const payload = parseWeChatSignedState(state);
  assert.ok(payload);
  assert.equal(payload.t, 'mobile_app');
});
