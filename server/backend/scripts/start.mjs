import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The backend imports `apps/web/lib/*` (bundler-style extensionless imports) and
// its own modules use `.js` specifiers. Plain Node type stripping cannot resolve
// either, so `npm start` builds a single ESM bundle with esbuild first. On a
// production image without devDependencies it falls back to the prebuilt bundle.
const root = fileURLToPath(new URL('..', import.meta.url));
const outfile = join(root, 'dist', 'index.mjs');

function build() {
  const require = createRequire(import.meta.url);
  let cli;
  try {
    cli = join(dirname(require.resolve('esbuild/package.json')), 'bin', 'esbuild');
  } catch {
    return { available: false, ok: false };
  }
  const res = spawnSync(process.execPath, [
    cli,
    'src/index.ts',
    '--bundle',
    '--platform=node',
    '--format=esm',
    '--target=node22',
    '--outfile=dist/index.mjs',
    '--log-level=warning',
  ], { stdio: 'inherit', cwd: root });
  return { available: true, ok: res.status === 0 };
}

const built = build();
if (built.available && !built.ok) {
  console.error('[amoji] server build failed; not starting a stale bundle.');
  process.exit(1);
}
if (!existsSync(outfile)) {
  console.error('[amoji] no bundle at dist/index.mjs. Run `npm install` then `npm start` again.');
  process.exit(1);
}
console.log(`[amoji] starting ${outfile}`);
const run = spawnSync(process.execPath, [outfile], { stdio: 'inherit', cwd: root, env: process.env });
process.exit(run.status ?? 1);
