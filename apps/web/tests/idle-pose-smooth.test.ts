import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  IDLE_PIN_CROSSFADE_S,
  IDLE_SWAP_LEG_BLEND_S,
  idleSwapBlendActive,
} from '../lib/idle-crossfade';
import {
  RETIRED_IDLE_CLIP_IDS,
  RETIRED_IDLE_NUMS,
  resolveIdleClipId,
} from '../lib/idle-catalog-review';
import { IDLE_CLIP_OPTIONS } from '../lib/idle-clips';
import { CHAT_IDLE_CURATED } from '../lib/idle-curated-rail';
import { idleByNum, playableIdles } from '../lib/idle-library';
import { IDLE_ELBOW_FLOOR_X, idleStiffClipGain } from '../lib/idle-stance-soften';

const root = path.resolve(import.meta.dirname, '..');

describe('idle pose smooth + catalog trim', () => {
  it('exposes idle arm soften constants for stiff military clips', () => {
    expect(IDLE_ELBOW_FLOOR_X).toBeGreaterThan(0.08);
    expect(IDLE_ELBOW_FLOOR_X).toBeLessThan(0.35);
    expect(idleStiffClipGain('IdleMixamoExcited')).toBeGreaterThan(1);
    const canvas = fs.readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).toContain('applyIdleClipSoftening');
    expect(canvas).toMatch(/!perfAction[\s\S]*applyIdleClipSoftening/);
  });

  it('pins longer crossfade (~0.85s) and defers foot IK during leg blend window', () => {
    expect(IDLE_PIN_CROSSFADE_S).toBeGreaterThanOrEqual(0.7);
    expect(IDLE_PIN_CROSSFADE_S).toBeLessThanOrEqual(1.0);
    expect(IDLE_SWAP_LEG_BLEND_S).toBeGreaterThanOrEqual(0.7);
    const t0 = 1000;
    expect(idleSwapBlendActive(t0 + 100, t0 + 850)).toBe(true);
    expect(idleSwapBlendActive(t0 + 900, t0 + 850)).toBe(false);
    const canvas = fs.readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).toContain('beginIdleSwapBlend');
    expect(canvas).toContain('idleLegGlide');
    expect(canvas).toContain('IDLE_PIN_CROSSFADE_S');
    expect(canvas).toContain('shortestEulerYXZSlerp');
  });

  it('does not manually blend hips/legs during idle swap (mixer-only — no shake)', async () => {
    const { IDLE_SWAP_BLEND_BONES } = await import('../lib/idle-crossfade');
    const lower = IDLE_SWAP_BLEND_BONES.filter((b) => /hip|leg|foot/i.test(b));
    expect(lower).toEqual([]);
    const canvas = fs.readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    // plantFeet still deferred while mixer owns the legs
    expect(canvas).toMatch(/!feetFree && !idleLegGlide/);
  });

  it('freezes hang/soften/shoulder writers during idle A→B glide', () => {
    const canvas = fs.readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).toMatch(/!idleLegGlide && !handDrag && !idleLegGlide|!handDrag && !idleLegGlide\) \{\s*\n\s*applyIdleClipSoftening/);
    expect(canvas).toMatch(/!gameView && !handDrag && !idleLegGlide\) \{\s*\n\s*applyIdleClipSoftening/);
    expect(canvas).toMatch(/if \(!idleLegGlide\) avatar\.clampShoulderROM/);
    expect(canvas).toMatch(/!handDrag && !idleLegGlide\) \{\s*\n\s*avatar\.easeIdleHang/);
    expect(canvas).toContain('applyCastFixes({ skipShoulders: idleLegGlide })');
    // Same-clip refresh must not hard-reset time (sudden body/arm snap).
    expect(canvas).toContain('const sameClip = !!idleAction && idleClipId === safeId');
    expect(canvas).toMatch(/if \(sameClip\) \{[\s\S]*?setEffectiveWeight\(1\)/);
  });

  it('retired nums are absent from curated rail but kept in library', () => {
    for (const n of RETIRED_IDLE_NUMS) {
      expect(IDLE_CLIP_OPTIONS.some((o) => o.libNum === n)).toBe(false);
      expect(CHAT_IDLE_CURATED.some((r) => r.legacyLibNum === n)).toBe(false);
      expect(idleByNum(n)?.retired).toBe(true);
    }
    expect(resolveIdleClipId('lib_C65')).toBe('IdleBreathCalm');
    expect(RETIRED_IDLE_CLIP_IDS.size).toBe(RETIRED_IDLE_NUMS.size);
  });

  it('smoke keeps #3 #20 #34 #41 #53 playable; IdleHug #36 retired blend-bad', () => {
    const keepNums = [3, 20, 34, 41, 53];
    for (const n of keepNums) {
      const e = idleByNum(n);
      expect(e?.playable).toBe(true);
      const rail = CHAT_IDLE_CURATED.find((r) => r.legacyLibNum === n);
      expect(rail).toBeTruthy();
      expect(IDLE_CLIP_OPTIONS.some((o) => o.libNum === n)).toBe(true);
    }
    expect(RETIRED_IDLE_NUMS.has(36)).toBe(true);
    expect(idleByNum(36)?.retired).toBe(true);
    expect(resolveIdleClipId('IdleHug')).toBe('IdleBreathCalm');
    expect(CHAT_IDLE_CURATED.some((r) => r.clipId === 'IdleHug')).toBe(false);
    expect(playableIdles().length).toBeGreaterThan(80);
    expect(IDLE_CLIP_OPTIONS.length).toBeLessThan(playableIdles().length);
  });

  it('idle A→B never syncs mismatched clip times (avoids spin-to-back blends)', () => {
    const canvas = fs.readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).not.toMatch(/action\.time = idleAction\.time % clip\.duration/);
    expect(canvas).toContain('resolveIdleClipId');
    expect(canvas).toMatch(/action\.time = Math\.min\(0\.08/);
  });

  it('Pixel #94–118: retired 96–100, 105–107 off rotation; keeps still in library', () => {
    const retiredBatch = [96, 97, 98, 99, 100, 105, 106, 107];
    for (const n of retiredBatch) {
      expect(RETIRED_IDLE_NUMS.has(n)).toBe(true);
      expect(IDLE_CLIP_OPTIONS.some((o) => o.libNum === n)).toBe(false);
      expect(playableIdles().some((e) => e.num === n)).toBe(false);
    }
    expect(resolveIdleClipId('lib_C60')).toBe('IdleBreathCalm');
    expect(resolveIdleClipId('lib_C124')).toBe('IdleBreathCalm');

    const keepNums = [
      94, 95, 101, 102, 103, 104, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118,
    ];
    for (const n of keepNums) {
      const e = idleByNum(n);
      expect(e?.retired).not.toBe(true);
      expect(e?.playable).toBe(true);
    }
    const onRail = keepNums.filter((n) => CHAT_IDLE_CURATED.some((r) => r.legacyLibNum === n));
    expect(onRail.length).toBeGreaterThan(10);
  });
});
