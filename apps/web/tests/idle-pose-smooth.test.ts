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
import { idleByNum, playableIdles } from '../lib/idle-library';

const root = path.resolve(import.meta.dirname, '..');

describe('idle pose smooth + catalog trim', () => {
  it('pins crossfade in ~300-500ms and defers foot IK during leg blend window', () => {
    expect(IDLE_PIN_CROSSFADE_S).toBeGreaterThanOrEqual(0.3);
    expect(IDLE_PIN_CROSSFADE_S).toBeLessThanOrEqual(0.55);
    expect(IDLE_SWAP_LEG_BLEND_S).toBeGreaterThanOrEqual(0.3);
    const t0 = 1000;
    expect(idleSwapBlendActive(t0 + 100, t0 + 450)).toBe(true);
    expect(idleSwapBlendActive(t0 + 500, t0 + 450)).toBe(false);
    const canvas = fs.readFileSync(path.join(root, 'components/CompanionCanvas.tsx'), 'utf8');
    expect(canvas).toContain('beginIdleSwapBlend');
    expect(canvas).toContain('idleLegGlide');
    expect(canvas).toContain('IDLE_PIN_CROSSFADE_S');
  });

  it('retired nums are absent from picker but kept # still registered for smoke keeps', () => {
    for (const n of RETIRED_IDLE_NUMS) {
      expect(IDLE_CLIP_OPTIONS.some((o) => o.num === n)).toBe(false);
      expect(idleByNum(n)?.retired).toBe(true);
    }
    expect(resolveIdleClipId('lib_C65')).toBe('IdleBreathCalm');
    expect(RETIRED_IDLE_CLIP_IDS.size).toBe(RETIRED_IDLE_NUMS.size);
  });

  it('smoke keeps #3 #20 #34 #36 #41 #53 still on rails', () => {
    const keepNums = [3, 20, 34, 36, 41, 53];
    for (const n of keepNums) {
      const e = idleByNum(n);
      expect(e?.playable).toBe(true);
      expect(IDLE_CLIP_OPTIONS.some((o) => o.num === n)).toBe(true);
    }
    const playableCount = playableIdles().length;
    expect(playableCount).toBeGreaterThan(80);
  });
});
