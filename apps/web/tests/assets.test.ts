import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARACTERS, WANT_CAST_RELEASE } from '../lib/prefs';

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

describe('asset governance', () => {
  it('no banned assets anywhere under models/ (marin copyright ban)', () => {
    for (const f of ALL) expect(path.basename(f)).not.toMatch(/marin/i);
  });

  it('every .vrm on disk is manifested', () => {
    for (const f of VRMS) expect(MANIFEST).toContain(path.basename(f));
  });

  it('manifest documents the want-list release; cast VRMs stream from GitHub', () => {
    expect(MANIFEST).toContain(WANT_CAST_RELEASE);
    expect(MANIFEST).toContain('seed-san.vrm');
    for (const c of CHARACTERS) {
      expect(c.model).toMatch(/^https:\/\/github\.com\/MonMonMars\/amoji-app\/releases\/download\//);
      expect(MANIFEST).toContain(c.id);
    }
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
