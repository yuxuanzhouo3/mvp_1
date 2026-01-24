const fs = require('node:fs');
const path = require('node:path');

const target = path.resolve(process.cwd(), '.next');

try {
  fs.rmSync(target, { recursive: true, force: true });
  process.stdout.write(`Removed ${target}\n`);
} catch (err) {
  process.stderr.write(`Failed to remove ${target}: ${err?.message || err}\n`);
  process.exitCode = 1;
}

