/**
 * Regression: VRM pupil vanish + body snap when poke/entry blend ends (#434).
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const canvas = fs.readFileSync(
  path.resolve(import.meta.dirname, '../components/CompanionCanvas.tsx'),
  'utf8',
);

describe('CompanionCanvas VRM eye + lean blend', () => {
  it('re-stabilizes eye draw order every frame after reveal', () => {
    expect(canvas).toMatch(/if \(!revealPending\) stabilizeEyeMaterials\(avatar\.root\)/);
    expect(canvas).toMatch(/avatar\.update\(dt \/ 1000\)[\s\S]*stabilizeEyeMaterials\(avatar\.root\)/);
  });

  it('damps poke lean only during idle A→B swap (not procedural bone ease)', () => {
    expect(canvas).toMatch(
      /pokeDamp = idleCrossfadeAdditiveScale\(now, swapBlendUntil\)/,
    );
    expect(canvas).not.toMatch(/idleBlendEndMs/);
    expect(canvas).not.toMatch(/proceduralBlendEnd/);
  });

  it('defers foot IK only on idle swap glide — not 0.7s perf/entry bone ease', () => {
    expect(canvas).toMatch(
      /idleLegGlide = idleSwapBlendActive\(now, swapBlendUntil\)/,
    );
  });

  it('lands procedural bone ease at k=1 before clearing (no shoulder snap)', () => {
    expect(canvas).toMatch(/const kRaw = u >= 1 \? 1 :/);
    expect(canvas).toMatch(/if \(u >= 1\) \{[\s\S]*const k = 1;/);
  });
});