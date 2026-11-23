/**
 * Convert owner-resources "Save notes JSON" (owner-picker-notes-v2) into
 * apps/web/data/owner-picker-selection.json for owner-picker-ship-set (#543+).
 *
 * Usage:
 *   node scripts/import-owner-picker-selection.mjs <export.json> [--out path] [--dry-run]
 *
 * Deliberately no `#!` line: apps/web/tests/import-owner-picker-selection.test.ts
 * imports this module, and vitest's module runner evaluates an externalized .mjs
 * without stripping a shebang (Node's ESM loader does), which surfaces as
 * "SyntaxError: Invalid or unexpected token" at collection time. Always invoke
 * this file through `node`, as the usage lines above do.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_SHIP = 'owner-picker-selection-v1';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultOut = path.join(root, 'apps/web/data/owner-picker-selection.json');

function decisionOf(row) {
  if (row.decision === 'use' || row.decision === 'keep' || row.decision === 'delete') return row.decision;
  if (row.keep === false) return 'delete';
  return 'keep';
}

function addKeys(set, row) {
  for (const k of [row.cd, row.domain, row.id]) {
    if (typeof k === 'string' && k.trim()) set.add(k.trim());
  }
}

/** @param {Record<string, unknown>} data */
export function buildShipSelectionFromNotesExport(data) {
  const use = new Set();
  const del = new Set();
  const keep = new Set();

  if (Array.isArray(data.useCd)) for (const k of data.useCd) if (typeof k === 'string') use.add(k);
  if (Array.isArray(data.deleteCd)) for (const k of data.deleteCd) if (typeof k === 'string') del.add(k);
  if (Array.isArray(data.keepCd)) for (const k of data.keepCd) if (typeof k === 'string') keep.add(k);

  if (Array.isArray(data.items)) {
    for (const row of data.items) {
      if (!row || typeof row !== 'object') continue;
      const d = decisionOf(row);
      const target = d === 'use' ? use : d === 'delete' ? del : keep;
      addKeys(target, row);
    }
  }

  for (const k of del) {
    use.delete(k);
    keep.delete(k);
  }

  const listenMvCodes = [...use].filter((k) => /^MV\d+$/i.test(k)).map((k) => k.toUpperCase());
  const idleRailNums = [];
  for (const k of use) {
    const m = String(k).match(/^ID-R0?(\d+)$/i) || String(k).match(/^rail-(\d+)$/i);
    if (m) idleRailNums.push(Number(m[1]));
  }
  const idleClipIds = [...use].filter((k) => /^Idle[A-Z]/i.test(k));
  const songClipIds = [...use].filter(
    (k) => /^sing-/i.test(k) || /^bed-/i.test(k) || /^DC\d+$/i.test(k),
  );

  const sortStr = (a, b) => a.localeCompare(b);
  return {
    version: SCHEMA_SHIP,
    sourceExportVersion: typeof data.version === 'string' ? data.version : undefined,
    use: [...use].sort(sortStr),
    delete: [...del].sort(sortStr),
    keep: [...keep].sort(sortStr),
    ...(listenMvCodes.length ? { listenMvCodes: listenMvCodes.sort(sortStr) } : {}),
    ...(songClipIds.length ? { songClipIds: songClipIds.sort(sortStr) } : {}),
    ...(idleRailNums.length
      ? { idleRailNums: [...new Set(idleRailNums)].sort((a, b) => a - b) }
      : {}),
    ...(idleClipIds.length ? { idleClipIds: idleClipIds.sort(sortStr) } : {}),
  };
}

function parseArgs(argv) {
  const positional = [];
  let out = defaultOut;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') dryRun = true;
    else if (a === '--out' && argv[i + 1]) {
      out = path.resolve(argv[++i]);
    } else if (!a.startsWith('-')) positional.push(a);
  }
  return { src: positional[0], out, dryRun };
}

function main() {
  const { src, out, dryRun } = parseArgs(process.argv.slice(2));
  if (!src) {
    console.error(
      'Usage: node scripts/import-owner-picker-selection.mjs <export.json> [--out path] [--dry-run]',
    );
    process.exit(1);
  }
  const raw = fs.readFileSync(path.resolve(src), 'utf8');
  const data = JSON.parse(raw);
  const ship = buildShipSelectionFromNotesExport(data);
  const text = `${JSON.stringify(ship, null, 2)}\n`;
  if (dryRun) {
    process.stdout.write(text);
    return;
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
  console.log(`wrote ${path.relative(root, out)} (${ship.use.length} use · ${ship.delete.length} delete)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}