#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(web, 'scripts', '_story-pixel-list-snippet.ts');
const run = `import { storyCatalogRows } from '../lib/story-catalog.ts';
console.log(JSON.stringify(storyCatalogRows(), null, 2));`;
fs.writeFileSync(out, run);
const json = execFileSync(
  'npx',
  ['--yes', 'tsx', '--tsconfig', path.join(web, 'tsconfig.json'), out],
  { cwd: web, encoding: 'utf8' },
);
fs.unlinkSync(out);
const rows = JSON.parse(json);
const lines = rows.map(
  (r) => `${r.ownerCode}\t${r.titleEn}\ten/yue/zh/ja\t${r.length}\t${r.slug}`,
);
const artifact = path.join('/opt/cursor/artifacts', 'st-story-codes-pixel.txt');
fs.mkdirSync(path.dirname(artifact), { recursive: true });
fs.writeFileSync(artifact, `${lines.join('\n')}\n`);
console.log('wrote', artifact, rows.length, 'rows');