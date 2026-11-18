#!/usr/bin/env node
/** Mirror CLASSIC_FAIRY_TALES into public JSON — uses tsx. */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runner = path.join(webRoot, 'scripts/write-classic-fairy-tales-json.ts');
execFileSync('npx', ['--yes', 'tsx', '--tsconfig', path.join(webRoot, 'tsconfig.json'), runner], {
  cwd: webRoot,
  stdio: 'inherit',
});