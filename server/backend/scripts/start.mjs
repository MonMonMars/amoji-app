import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function accepts(flag) {
  const res = spawnSync(process.execPath, [flag, '-e', '0'], { encoding: 'utf8' });
  return res.status === 0;
}

const flags = [];
if (accepts('--experimental-sqlite')) flags.push('--experimental-sqlite');
if (accepts('--experimental-strip-types')) flags.push('--experimental-strip-types');
const res = spawnSync(process.execPath, [...flags, 'src/index.ts'], {
  stdio: 'inherit',
  cwd: fileURLToPath(new URL('..', import.meta.url)),
});
process.exit(res.status ?? 1);
