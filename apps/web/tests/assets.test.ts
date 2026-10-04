import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARACTERS } from '../lib/prefs';

// Asset governance — mirrors the CI manifest/structural/banned checks inside
// the test suite so cast/ binaries are governed from the moment they land,
// independent of the CI workflow file (which is write-protected via MCP).
// r2026-10-04.52: manifest and prefs agree on the local cast.
// r2026-10-05.104: the four remote community VRMs stream straight from
// raw.githubusercontent.com and live outside the manifest by design.
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
const CAST = VRMS.filter((f) => f.includes(`${path.sep}cast${path.sep}`));

describe('asset governance', () => {
  it('no banned assets anywhere under models/ (marin copyright ban)', () => {
    for (const f of ALL) expect(path.basename(f)).not.toMatch(/marin/i);
  });

  it('every .vrm on disk is manifested', () => {
    for (const f of VRMS) expect(MANIFEST).toContain(path.basename(f));
  });

  it('manifest cast table and prefs agree on all local cast filenames (r2026-10-05.104)', () => {
    // local cast/ models must be manifested; remote community VRMs are
    // governed by the cast test's approved-URL allowlist instead
    for (const c of CHARACTERS) {
      if (c.model.startsWith('cast/')) expect(MANIFEST).toContain(c.model);
      else expect(c.model).toMatch(/^https:\/\/raw\.githubusercontent\.com\/test157t\//);
    }
  });

  it('cast binaries that are present are structurally valid', () => {
    for (const f of CAST) {
      const buf = fs.readFileSync(f);
      expect(buf.toString('ascii', 0, 4)).toBe('glTF');
      const jsonLen = buf.readUInt32LE(12);
      const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
      const isV1 = Boolean(json.extensions?.VRMC_vrm);
      const isV0 = Boolean(json.extensions?.VRM);
      expect(isV1 || isV0).toBe(true);
      if (isV1) {
        const exps = Object.keys(json.extensions.VRMC_vrm.expressions?.preset ?? {});
        for (const n of ['happy', 'angry', 'sad', 'surprised', 'relaxed']) expect(exps).toContain(n);
        expect('head' in (json.extensions.VRMC_vrm.humanoid?.humanBones ?? {})).toBe(true);
      } else {
        const names = (json.extensions.VRM.blendShapeMaster?.blendShapeGroups ?? []).map((g: { name: string }) =>
          String(g.name).toLowerCase(),
        );
        for (const n of ['joy', 'angry', 'sorrow', 'surprised']) expect(names).toContain(n);
        const bones = json.extensions.VRM.humanoid?.humanBones ?? [];
        const boneNames = Array.isArray(bones) ? bones.map((b: { bone: string }) => b.bone) : Object.keys(bones);
        expect(boneNames).toContain('head');
        for (const b of ['leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm']) {
          expect(boneNames).toContain(b);
        }
      }
    }
    if (CAST.length === 0) {
      console.log('cast binaries pending — characters fall back to seed-san.vrm until they land');
    }
  });
});
