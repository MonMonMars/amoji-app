import { describe, expect, it } from 'vitest';
import { createRng } from '../src/rng';
import { createSaccadeClock } from '../src/saccade';

describe('saccade clock', () => {
  it('is deterministic for a fixed seed', () => {
    const a = createSaccadeClock({ minMs: 300, maxMs: 2600 }, createRng(42));
    const b = createSaccadeClock({ minMs: 300, maxMs: 2600 }, createRng(42));
    for (let i = 0; i < 50; i++) {
      expect(a.tick(100, 0.5)).toEqual(b.tick(100, 0.5));
    }
  });
  it('higher arousal saccades more often', () => {
    const clock = createSaccadeClock({ minMs: 300, maxMs: 2600 }, createRng(7));
    let highMoves = 0;
    for (let i = 0; i < 200; i++) if (clock.tick(100, 0.9).moved) highMoves++;
    const clock2 = createSaccadeClock({ minMs: 300, maxMs: 2600 }, createRng(7));
    let lowMoves = 0;
    for (let i = 0; i < 200; i++) if (clock2.tick(100, -0.9).moved) lowMoves++;
    expect(highMoves).toBeGreaterThan(lowMoves);
  });
  it('gaze stays in bounds', () => {
    const clock = createSaccadeClock({ minMs: 10, maxMs: 20 }, createRng(1));
    for (let i = 0; i < 500; i++) {
      const g = clock.tick(50, 0);
      expect(Math.abs(g.x)).toBeLessThanOrEqual(0.6);
      expect(Math.abs(g.y)).toBeLessThanOrEqual(0.6);
    }
  });
});
