const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(process.cwd());

const SKIP_DIRS = new Set([
  '.next',
  'node_modules',
  '.git',
  'coverage',
  'dist',
  'build',
  '.turbo',
  '.vercel',
  '.trae',
  'docs',
  'tests',
  'tests-js',
]);

const TEXT_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md']);

function walkFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walkFiles(fullPath, files);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!TEXT_EXTS.has(ext)) continue;
    files.push(fullPath);
  }
  return files;
}

test('仓库中不应出现 cn_<userId> 伪 token 用法', () => {
  const files = walkFiles(ROOT);

  const patterns = [
    { name: 'Bearer cn_', re: /Bearer\s+cn_/g },
    { name: 'template cn_${', re: /`cn_\$\{/g },
    { name: 'concat cn_${', re: /cn_\$\{/g },
    { name: 'cn_ access_token template', re: /access_token:\s*`cn_/g },
  ];

  const hits = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const p of patterns) {
      if (p.re.test(content)) {
        hits.push({ file: path.relative(ROOT, file), pattern: p.name });
      }
      p.re.lastIndex = 0;
    }
  }

  assert.equal(
    hits.length,
    0,
    `发现 cn_<userId> 相关伪 token 痕迹:\n${hits.map(h => `- ${h.file} (${h.pattern})`).join('\n')}`
  );
});
