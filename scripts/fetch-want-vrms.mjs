#!/usr/bin/env node
/** Download want-list VRMs from GitHub Release into apps/web/public/models/want/ (Pages same-origin). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rosterPath = path.join(root, 'apps/web/lib/want-roster.json');
const outDir = path.join(root, 'apps/web/public/models/want');

const roster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  if (buf.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error(`not a glTF/VRM file: ${dest}`);
  }
}

let ok = 0;
for (const c of roster.characters) {
  const dest = path.join(outDir, c.modelFile);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
    ok++;
    continue;
  }
  process.stdout.write(`fetch ${c.id}… `);
  await download(c.modelUrl, dest);
  console.log('ok');
  ok++;
}
console.log(`want VRMs ready: ${ok}/${roster.characters.length} in ${outDir}`);
