import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EmotionEngine } from '@amoji/emotion-core';

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const tickFor = (e: EmotionEngine, ms: number, step = 50) => {
  let last: ReturnType<EmotionEngine['tick']> | null = null;
  for (let t = 0; t < ms; t += step) last = e.tick(step);
  return last!;
};

describe('emotion engine idle behaviour', () => {
  it('does not halve expression intensity when idle (owner override 2026-11-25)', () => {
    // Same seed, same activation, same tick sequence. The ONLY difference is
    // the idle flag: the left engine keeps receiving empty input so it never
    // idles. Before 2026-11-25 idle multiplied every channel by 0.5 and used a
    // 0.4 neutral floor, so the two faces diverged ~2x.
    const active = new EmotionEngine({ idleAfterMs: 400, blendTimeMs: 120 }, 7);
    const idle = new EmotionEngine({ idleAfterMs: 400, blendTimeMs: 120 }, 7);
    active.update({ llmTags: { joy: 1 } });
    idle.update({ llmTags: { joy: 1 } });

    let activeFrame = tickFor(active, 50);
    let idleFrame = tickFor(idle, 50);
    for (let t = 0; t < 1500; t += 50) {
      active.update({}); // touch input → stays active, adds no activation
      activeFrame = active.tick(50);
      idleFrame = idle.tick(50);
    }

    expect(activeFrame.idle).toBe(false);
    expect(idleFrame.idle).toBe(true);
    expect(idleFrame.face).toEqual(activeFrame.face);
    expect(idleFrame.body).toEqual(activeFrame.body);
    expect(idleFrame.valence).toBeCloseTo(activeFrame.valence, 12);
    // and the held idle smile is still an obvious smile, not "pleasant but mild"
    expect(idleFrame.face.mouthSmile).toBeGreaterThan(0.4);
  });

  it('keeps the idle neutral dilution at the active 0.15 floor', () => {
    const src = read('../../../packages/emotion-core/src/engine.ts');
    expect(src).toContain('const floor = 0.15;');
    expect(src).toContain('const k = this.cfg.intensity;');
    expect(src).not.toContain('idle ? 0.5 : 1');
    expect(src).not.toContain('idle ? 0.4 : 0.15');
  });
});

describe('live avatar wiring', () => {
  const avatar = read('../lib/vrm/avatar.ts');
  const canvas = read('../components/CompanionCanvas.tsx');
  const v1 = avatar.slice(avatar.indexOf('class V1Avatar'), avatar.indexOf('class GenericAvatar'));

  it('V1Avatar owns an idle blink clock and runs it before vrm.update', () => {
    // The timer used to live only in GenericAvatar; every VRM takes V1Avatar,
    // so the whole roster stared. Assert the port is wired in the right order.
    expect(v1).toContain('private updateBlink(dt: number)');
    expect(v1).toContain('this.updateBlink(dt);');
    expect(v1.indexOf('this.updateBlink(dt);')).toBeLessThan(v1.indexOf('this.vrm.update(dt);'));
  });

  it('resolves expressions through the model map, not lowercase literals', () => {
    expect(v1).toContain('resolveExpressionName(this.expressionNames');
    expect(v1).toContain('detectEyeProfile(em)');
    // An external (game-scripted) blink makes the clock yield instead of stacking.
    expect(v1).toContain('this.externalBlink = true');
  });

  it('the continuous emotion block no longer zeroes the lids every frame', () => {
    // `blink: 0` here used to fight the blink timer; gameView uses
    // `blink: expr.blink ?? 0`, which is fine, but a literal 0 is not.
    expect(canvas).not.toMatch(/\bblink:\s*0\b/);
    expect(canvas).toContain('applyDominatedEyeExpressions(setEm, {');
    expect(canvas).toContain("}, avatar!.eyeProfile);");
  });

  it('softens speech ducking so the face does not flatten while talking', () => {
    expect(canvas).toContain('1 - 0.1 * sp.duck');
    expect(canvas).not.toContain('1 - 0.4 * sp.duck');
  });
});
