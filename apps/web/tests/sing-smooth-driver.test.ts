/**
 * Owner 2026-11-26: "same to the song, the song move is like stop motion, not
 * smooth."
 *
 * The sing body is driven by the same rAF clock as dance — `mixer.update(dt)`
 * each frame — and `Sing.vrma` is 24 fps LINEAR, so neither the driver nor the
 * asset steps on its own. What stepped was the *restart*: a running loop could
 * be re-entered through `playPerf()` (armed retry / a second `playing` event /
 * a re-triggered move), and every re-entry called `action.reset()`, snapping a
 * 14 s sing loop back to frame 0 mid-song.
 *
 * These assertions keep both halves honest: the clip must stay dense, and the
 * player must never restart a loop that is already on stage.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANVAS = fs.readFileSync(path.join(ROOT, 'components/CompanionCanvas.tsx'), 'utf8');

interface Gtlf {
  animations?: {
    samplers: { input: number; interpolation?: string }[];
    channels: unknown[];
  }[];
  accessors: { count: number; max?: number[] }[];
}

const readClip = (file: string): Gtlf =>
  JSON.parse(fs.readFileSync(path.join(ROOT, 'public/models/anims', file), 'utf8')) as Gtlf;

describe('the sing clip is dense enough to read as continuous', () => {
  it('Sing.vrma is authored at a real frame rate, not sparse poses', () => {
    const anim = readClip('Sing.vrma').animations?.[0];
    expect(anim, 'Sing.vrma must contain an animation').toBeTruthy();
    const acc = readClip('Sing.vrma').accessors;
    const duration = acc[anim!.samplers[0]!.input]!.max?.[0] ?? 0;
    const keys = acc[anim!.samplers[0]!.input]!.count;
    expect(duration).toBeGreaterThan(1);
    // 24 fps authored; allow a small floor so a re-export keeps headroom.
    expect(keys / duration).toBeGreaterThanOrEqual(20);
  });

  it('does not interpolate in STEP (literal stop motion)', () => {
    const anim = readClip('Sing.vrma').animations![0]!;
    for (const s of anim.samplers) {
      expect(s.interpolation ?? 'LINEAR').not.toBe('STEP');
    }
  });
});

describe('the sing body never restarts mid-song', () => {
  it('playPerf keeps the clock of a loop already on stage', () => {
    // The guard must compare the resolved clip and return before reset().
    const guard = CANVAS.slice(
      CANVAS.indexOf("if (!clip) return false;"),
      CANVAS.indexOf('perfClipId = clipName;', CANVAS.indexOf("if (!clip) return false;")),
    );
    expect(guard).toContain('perfAction.isRunning()');
    expect(guard).toContain('loopsOnStage');
    expect(guard).toContain('return true;');
    // No executable reset in the guard (the prose may name it).
    expect(guard).not.toMatch(/\n\s*action\.reset\(\);|\n\s*action\.reset\(\)/);
  });

  it('the sing/dance retry resumes instead of re-entering playPerf', () => {
    expect(CANVAS).toMatch(/mv\.kind === 'sing' \|\| mv\.kind === 'dance'/);
    expect(CANVAS).toContain('perfAction.setEffectiveWeight(1)');
    expect(CANVAS).toContain('perfAction.paused = false');
  });

  it('still advances the mixer with the real frame delta', () => {
    expect(CANVAS).toContain('mixer?.update(dt / 1000)');
  });
});
