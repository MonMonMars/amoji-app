#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'apps/web/data/owner-picker-selection.json');
const src = process.argv[2];
if (!src) { console.error('Usage: node scripts/import-owner-picker-selection.mjs <export.json>'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(path.resolve(src), 'utf8'));
const use = new Set(data.use || []);
const del = new Set(data.delete || []);
for (const row of data.items || []) {
  const k = row.cd || row.domain || row.id;
  if (!k) continue;
  if (row.decision === 'use' || row.keep !== false) use.add(k);
  if (row.decision === 'delete' || row.keep === false) del.add(k);
}
fs.writeFileSync(out, JSON.stringify({ version: 'owner-picker-selection-v1', use: [...use], delete: [...del], keep: [] }, null, 2));
console.log('wrote', out);
