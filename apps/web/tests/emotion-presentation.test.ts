/**
 * E2 defect 3 — expression presentation (onset punch + hold).
 *
 * The engine fades a mood in with a 250 ms time constant. On the rising edge of
 * a genuinely strong emotion the presenter drives ~1.22× the target for ~120 ms
 * then settles back to exactly the target; a mild mood is never punched.
 */
import { describe, expect, it } from 'vitest';
import {
  createExpressionPresenter,
  punchEnvelope,
} from '../lib/emotion-presentation';

describe('punchEnvelope', () => {
  it('rises, holds, settles and ends', () => {
    expect(punchEnvelope(0, 120, 120, 200)).toBeCloseTo(0, 5);
    expect(punchEnvelope(60, 120, 120, 200)).toBeGreaterThan(0.4);
    expect(punchEnvelope(120, 120, 120, 200)).toBeCloseTo(1, 5);
    expect(punchEnvelope(200, 120, 120, 200)).toBeCloseTo(1, 5);
    expect(punchEnvelope(440, 120, 120, 200)).toBeCloseTo(0, 5);
    expect(punchEnvelope(900, 120, 120, 200)).toBe(0);
  });
});

describe('createExpressionPresenter', () => {
  it('leaves a mild mood alone (below the strength gate)', () => {
    const p = createExpressionPresenter();
    for (let t = 0; t <= 600; t += 60) {
      expect(p.present('sad', 0.2, t)).toBeCloseTo(0.2, 5);
    }
  });

  it('punches a strong onset to ~1.22x, holds, then settles on target', () => {
    const p = createExpressionPresenter();
    expect(p.present('sad', 0.5, 1000)).toBeCloseTo(0.5, 5); // rising edge, env 0
    expect(p.present('sad', 0.5, 1120)).toBeCloseTo(0.61, 5); // peak
    expect(p.present('sad', 0.5, 1200)).toBeCloseTo(0.61, 5); // hold
    expect(p.present('sad', 0.5, 1440)).toBeCloseTo(0.5, 5); // settled
  });

  it('clamps the peak at 1', () => {
    const p = createExpressionPresenter();
    p.present('surprised', 0.95, 0);
    expect(p.present('surprised', 0.95, 120)).toBe(1);
  });

  it('does not re-punch inside the cooldown window', () => {
    const p = createExpressionPresenter();
    p.present('angry', 0.5, 0); // punch starts
    p.present('angry', 0.2, 450); // settle finished; below the gate
    expect(p.present('angry', 0.5, 500)).toBeCloseTo(0.5, 5); // rising, but cooling
    // after the cooldown a fresh rising edge punches again
    p.present('angry', 0.2, 950);
    p.present('angry', 0.5, 1000);
    expect(p.present('angry', 0.5, 1120)).toBeCloseTo(0.61, 5);
  });

  it('keeps channels independent', () => {
    const p = createExpressionPresenter();
    const a = p.present('happy', 0.5, 0);
    const b = p.present('angry', 0.5, 0);
    expect(a).toBeCloseTo(0.5, 5);
    expect(b).toBeCloseTo(0.5, 5);
    expect(p.present('happy', 0.5, 120)).toBeCloseTo(0.61, 5);
    expect(p.present('angry', 0.5, 120)).toBeCloseTo(0.61, 5);
  });

  it('reset() clears pending punches', () => {
    const p = createExpressionPresenter();
    p.present('happy', 0.5, 0);
    p.reset();
    expect(p.present('happy', 0.5, 60)).toBeCloseTo(0.5, 5);
  });
});
