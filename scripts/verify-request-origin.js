const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, '.tmp', 'request-origin-test');

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const tscJs = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');

execFileSync(
  process.execPath,
  [
    tscJs,
    path.join(repoRoot, 'lib', 'http', 'request-origin.ts'),
    '--outDir',
    outDir,
    '--rootDir',
    repoRoot,
    '--module',
    'commonjs',
    '--moduleResolution',
    'node',
    '--target',
    'es2020',
    '--lib',
    'es2020,dom',
    '--esModuleInterop',
    '--skipLibCheck',
  ],
  { cwd: repoRoot, stdio: 'inherit' }
);

const compiledModulePath = path.join(outDir, 'lib', 'http', 'request-origin.js');
const { getExternalRequestOrigin } = require(compiledModulePath);

function withEnv(key, value, fn) {
  const before = process.env[key];
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    if (before === undefined) delete process.env[key];
    else process.env[key] = before;
  }
}

withEnv('NEXT_PUBLIC_APP_URL', 'https://personalink.mornscience.top', () => {
  const request = new Request('https://0.0.0.0:3000/api/test', {
    headers: {
      host: '0.0.0.0:3000',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': '0.0.0.0:3000',
    },
  });
  assert.equal(getExternalRequestOrigin(request), 'https://personalink.mornscience.top');
});

withEnv('NEXT_PUBLIC_APP_URL', 'personalink.mornscience.top', () => {
  const request = new Request('http://0.0.0.0:3000/api/test', {
    headers: {
      host: '0.0.0.0:3000',
      'x-forwarded-proto': 'http',
      'x-forwarded-host': '0.0.0.0:3000',
    },
  });
  assert.equal(getExternalRequestOrigin(request), 'https://personalink.mornscience.top');
});

withEnv('NEXT_PUBLIC_APP_URL', undefined, () => {
  const request = new Request('http://0.0.0.0:3000/api/test', {
    headers: {
      host: '0.0.0.0:3000',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'example.com',
    },
  });
  assert.equal(getExternalRequestOrigin(request), 'https://example.com');
});

console.log('verify-request-origin: OK');
