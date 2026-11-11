import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  IDLE_PIN_CROSSFADE_S,
  IDLE_SWAP_LEG_BLEND_S,
  idleSwapBlendActive,
} from '../lib/idle-crossfade';
import {
  PIXEL_OK_IDLE_NUMS,
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

  it('retired nums are absent from curated rail but kept in library', () => {
    for (const n of RETIRED_IDLE_NUMS) {
      expect(IDLE_CLIP_OPTIONS.some((o) => o.libNum === n)).toBe(false);
      expect(CHAT_IDLE_CURATED.some((r) => r.legacyLibNum === n)).toBe(false);
      expect(idleByNum(n)?.retired).toBe(true);
    }
    expect(resolveIdleClipId('lib_C65')).toBe('IdleRpmFStanding001');
    expect(RETIRED_IDLE_CLIP_IDS.size).toBe(RETIRED_IDLE_NUMS.size);
  });

  it('chat rail is Pixel OK only; IdleHug #36 retired', () => {
    expect(CHAT_IDLE_CURATED).toHaveLength(PIXEL_OK_IDLE_NUMS.size);
    for (const e of CHAT_IDLE_CURATED) {
      expect(PIXEL_OK_IDLE_NUMS.has(e.legacyLibNum)).toBe(true);
      expect(idleByNum(e.legacyLibNum)?.playable).toBe(true);
      expect(IDLE_CLIP_OPTIONS.some((o) => o.libNum === e.legacyLibNum)).toBe(true);
    }
    const keepNums = [3, 20, 22, 34, 41, 42, 53, 94, 95, 101, 102, 103, 108, 109, 113, 114];
    for (const n of keepNums) {
      expect(PIXEL_OK_IDLE_NUMS.has(n)).toBe(true);
      expect(CHAT_IDLE_CURATED.some((r) => r.legacyLibNum === n)).toBe(true);
    }
    expect(RETIRED_IDLE_NUMS.has(36)).toBe(true);
    expect(idleByNum(36)?.retired).toBe(true);
    expect(resolveIdleClipId('IdleHug')).toBe('IdleRpmFStanding001');
    expect(resolveIdleClipId('IdleBreathCalm')).toBe('IdleRpmFStanding001');
    expect(CHAT_IDLE_CURATED.some((r) => r.clipId === 'IdleHug')).toBe(false);
    expect(IDLE_CLIP_OPTIONS.length).toBe(16);
    expect(playableIdles().length).toBeGreaterThan(IDLE_CLIP_OPTIONS.length);
  });

  it('idle A→B never syncs mismatched clip times (avoids spin-to-back blends)', () => {
    const canvas = fs.readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).not.toMatch(/action\.time = idleAction\.time % clip\.duration/);
    expect(canvas).toContain('resolveIdleClipId');
    expect(canvas).toContain('isPixelOkIdleClip');
    expect(canvas).toMatch(/action\.time = Math\.min\(0\.08/);
  });

  it('Pixel #94–118: retired bad batch; OK keeps on rail', () => {
    const retiredBatch = [96, 97, 98, 99, 100, 105, 106, 107];
    for (const n of retiredBatch) {
      expect(RETIRED_IDLE_NUMS.has(n)).toBe(true);
      expect(IDLE_CLIP_OPTIONS.some((o) => o.libNum === n)).toBe(false);
      expect(playableIdles().some((e) => e.num === n)).toBe(false);
    }
    expect(resolveIdleClipId('lib_C60')).toBe('IdleRpmFStanding001');
    expect(resolveIdleClipId('lib_C124')).toBe('IdleRpmFStanding001');

    const okOnRail = [94, 95, 101, 102, 103, 108, 109, 113, 114];
    for (const n of okOnRail) {
      expect(PIXEL_OK_IDLE_NUMS.has(n)).toBe(true);
      expect(CHAT_IDLE_CURATED.some((r) => r.legacyLibNum === n)).toBe(true);
      expect(idleByNum(n)?.playable).toBe(true);
    }
    // MID keeps stay in library but off the OK-only rail
    for (const n of [104, 110, 111, 112, 115, 116, 117, 118]) {
      expect(PIXEL_OK_IDLE_NUMS.has(n)).toBe(false);
      expect(CHAT_IDLE_CURATED.some((r) => r.legacyLibNum === n)).toBe(false);
      expect(resolveIdleClipId(idleByNum(n)!.clipId)).toBe('IdleRpmFStanding001');
    }
  });
});
