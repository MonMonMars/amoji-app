#!/usr/bin/env node
/**
 * Regenerate docs/owner-resources.html (+ legacy redirect stubs).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = path.join(root, 'apps/web');
const writer = path.join(root, 'scripts/owner-picker-html-writer.ts');

const outs = [
  path.join(root, 'docs/owner-resources.html'),
  path.join(root, 'docs/owner-music-picker.html'),
  path.join(root, 'docs/owner-poke-reactions.html'),
  path.join(root, 'docs/owner-idle-poses.html'),
];

execFileSync('npx', ['--yes', 'tsx', '--tsconfig', path.join(web, 'tsconfig.json'), writer], {
  cwd: root,
  stdio: 'inherit',
});

for (const f of outs) {
  if (!fs.existsSync(f)) {
    console.error('missing', f);
    process.exitCode = 1;
  }
}