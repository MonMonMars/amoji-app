import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARACTERS, WANT_CAST_RELEASE } from '../lib/prefs';
import { REQUIRED_CREDITS } from '../lib/credits';

const here = path.dirname(fileURLToPath(import.meta.url));
const MODELS = path.resolve(here, '../public/models');
const MANIFEST = fs.readFileSync(path.join(MODELS, 'ASSET_MANIFEST.md'), 'utf8');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const ALL = walk(MODELS);
const VRMS = ALL.filter((f) => f.endsWith('.vrm'));

/**
 * The binaries this repo actually ships in git: `models/*.vrm` plus
 * `cast/*.vrm`. `want/` is gitignored — those are downloaded from the release at
 * build time and may legitimately linger in a local tree after a roster change,
 * so disk coverage is only enforced for in-repo paths.
 */
const IN_REPO = VRMS.filter((f) => !f.includes(`${path.sep}want${path.sep}`));

describe('asset governance', () => {
  it('no banned assets anywhere under models/ (marin copyright ban)', () => {
    for (const f of ALL) expect(path.basename(f)).not.toMatch(/marin/i);
  });

  it('every in-repo .vrm on disk is manifested', () => {
    // Matches the manifest's own contract: "every binary in this directory (top
    // level or under cast/) must have an entry".
    for (const f of IN_REPO) expect(MANIFEST).toContain(path.basename(f));
  });

  it('no tracked cast binary is left unlisted after the licensing purge', () => {
    // The 2026-11-08 purge removed every non-CC0 cast file; whatever is still
    // here must be named in the CC0 table.
    const cast = IN_REPO.filter((f) => f.includes(`${path.sep}cast${path.sep}`));
    expect(cast.length).toBeGreaterThan(0);
    for (const f of cast) {
      const name = path.basename(f);
      expect(MANIFEST, name).toContain(`cast/${name}`);
    }
  });

  it('manifest documents the want-list release; cast VRMs stream from GitHub', () => {
    expect(MANIFEST).toContain(WANT_CAST_RELEASE);
    expect(MANIFEST).toContain('seed-san.vrm');
    for (const c of CHARACTERS) {
      expect(c.model).toMatch(/^want\/[a-z0-9-]+\.vrm$/);
      expect(MANIFEST).toContain(c.id);
    }
  });

  it('the manifest roster count matches the shipped roster', () => {
    // A stale "(46 characters)" is how the manifest drifted out of agreement
    // with the app when characters were removed.
    expect(MANIFEST).toContain(`(${CHARACTERS.length} characters)`);
    expect(MANIFEST).toContain(`**${CHARACTERS.length} characters**`);
    // Count the live-roster table rows rather than trusting the prose.
    const start = MANIFEST.indexOf('## Live cast');
    const end = MANIFEST.indexOf('Base URL for every row');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const rows = MANIFEST.slice(start, end).match(/^\| a\d/gm) ?? [];
    expect(rows.length).toBe(CHARACTERS.length);
  });

  it('every id the credits page names is a character that still ships', () => {
    const ids = new Set(CHARACTERS.map((c) => c.id));
    for (const entry of REQUIRED_CREDITS) expect(ids.has(entry.id), entry.id).toBe(true);
  });

  it('seed-san fallback binary is structurally valid when present', () => {
    const seed = path.join(MODELS, 'seed-san.vrm');
    if (!fs.existsSync(seed)) {
      console.log('seed-san.vrm not on disk in this checkout — skip structural check');
      return;
    }
    const buf = fs.readFileSync(seed);
    expect(buf.toString('ascii', 0, 4)).toBe('glTF');
  });
});
