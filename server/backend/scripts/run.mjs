import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const probe = spawnSync(process.execPath, ['--experimental-sqlite', '-e', '0'], { encoding: 'utf8' });
const nodeOptions = probe.status === 0
  ? [process.env.NODE_OPTIONS, '--experimental-sqlite'].filter(Boolean).join(' ')
  : process.env.NODE_OPTIONS;
const vitest = require.resolve('vitest/vitest.mjs');
const res = spawnSync(process.execPath, [vitest, 'run'], {
  stdio: 'inherit',
  env: { ...process.env, ...(nodeOptions ? { NODE_OPTIONS: nodeOptions } : {}) },
});
process.exit(res.status ?? 1);
