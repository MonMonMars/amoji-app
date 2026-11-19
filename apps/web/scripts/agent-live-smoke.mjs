/**
 * Agent-side steps 1–2 for GitHub Pages (revision + SW canary).
 * Step 3–4 (Refresh chip, clear site data) require the owner's phone or a local browser.
 * Writes JSON to AMOJI_AGENT_SMOKE_OUT or ./agent-live-smoke-report.json when cwd allows.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const revTs = fs.readFileSync(path.join(WEB_ROOT, 'lib/revision.ts'), 'utf8');
const m = revTs.match(/export const APP_REVISION = '([^']+)'/);
if (!m) {
  console.error('[agent-live-smoke] APP_REVISION not found');
  process.exit(1);
}
const expected = m[1];
const base = (process.env.AMOJI_PAGES_URL ?? 'https://monmonmars.github.io/amoji-app').replace(/\/$/, '');
const outPath =
  process.env.AMOJI_AGENT_SMOKE_OUT ??
  path.join(process.cwd(), 'agent-live-smoke-report.json');

const report = { url: base, expected, steps: {}, ok: false };

// Step 1 — live origin reachable
const indexRes = await fetch(`${base}/`, { cache: 'no-store' });
report.steps['1_open_url'] = { ok: indexRes.ok, status: indexRes.status };

// Step 2 — revision.txt + sw CACHE match repo
const revRes = await fetch(`${base}/revision.txt`, { cache: 'no-store' });
const liveRev = revRes.ok ? (await revRes.text()).trim() : '';
const swRes = await fetch(`${base}/sw.js`, { cache: 'no-store' });
const swBody = swRes.ok ? await swRes.text() : '';
const cacheM = swBody.match(/var CACHE = '([^']+)'/);
const cacheName = cacheM?.[1] ?? '';
const cacheExpected = `amoji-${expected}`;
report.steps['2_confirm_revision'] = {
  revision_txt: liveRev,
  matchesExpected: liveRev === expected,
  sw_cache: cacheName,
  sw_cache_matches: cacheName === cacheExpected,
};

report.ok =
  report.steps['1_open_url'].ok &&
  report.steps['2_confirm_revision'].matchesExpected &&
  report.steps['2_confirm_revision'].sw_cache_matches;

const liveBehindRepo = Boolean(liveRev && expected && liveRev !== expected);
report.pixel_train = {
  live_revision: liveRev || null,
  repo_revision: expected,
  live_matches_repo: liveRev === expected,
  live_behind_repo: liveBehindRepo,
  /** Owner squash merge order — do not agent-merge; see docs/AGENT_FINISH_PIXEL_HANDOFF_2026-11-18.md */
  owner_gate_pr: liveBehindRepo || liveRev === 'r2026-11-18.237' ? 528 : null,
  note:
    liveBehindRepo
      ? 'Pages lags APP_REVISION — Pixel merges #528→#543 until live catches repo.'
      : liveRev === 'r2026-11-18.237'
        ? 'Live at pre-train r237; first merge is still #528 (r248).'
        : 'Live matches repo revision.',
};

report.steps['3_refresh_chip'] = {
  agent_skipped: true,
  note: 'Update ready · Refresh only when client SW/revision lags live revision.txt (owner device).',
};
report.steps['4_clear_site_data'] = {
  agent_skipped: true,
  note: 'Clear Website Data or remove home-screen icon on the physical phone.',
};

try {
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  report.reportPath = outPath;
} catch {
  /* optional write */
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);