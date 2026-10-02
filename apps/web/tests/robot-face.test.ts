import { describe, it, expect } from 'vitest';
import {
  withLookAndVoice, ledFrame, paramsForHints, paramsForText, NEUTRAL, LED_SIZE,
  type FaceParams,
} from '../lib/robot-face';

const finite = (p: FaceParams) =>
  ['eyeW', 'eyeH', 'pupil', 'smile', 'open', 'r', 'g', 'b', 'bounce'].every(
    (k) => Number.isFinite(p[k as keyof FaceParams]),
  );

describe('withLookAndVoice', () => {
  it('is identity at zero level', () => {
    const p = withLookAndVoice(NEUTRAL, { level: 0 });
    expect(p.open).toBe(NEUTRAL.open);
  });

  it('voice level opens the mouth for lipsync', () => {
    const p = withLookAndVoice(NEUTRAL, { level: 1 });
    expect(p.open).toBeGreaterThanOrEqual(0.95);
  });

  it('never closes the mouth below the emotion openness', () => {
    const happy = paramsForHints({ joy: 1 });
    const p = withLookAndVoice(happy, { level: 1 });
    expect(p.open).toBeGreaterThanOrEqual(happy.open);
  });

  it('clamps out-of-range level and dilates pupil while talking', () => {
    const p = withLookAndVoice(NEUTRAL, { level: 5 });
    expect(p.open).toBeLessThanOrEqual(1);
    expect(p.pupil).toBeGreaterThan(NEUTRAL.pupil);
  });
});

describe('ledFrame', () => {
  const litColumnsInRow = (buf: Uint8Array, row: number): number[] => {
    const cols: number[] = [];
    for (let x = 0; x < LED_SIZE; x++) {
      const i = (row * LED_SIZE + x) * 3;
      if (buf[i]! + buf[i + 1]! + buf[i + 2]! > 0) cols.push(x);
    }
    return cols;
  };
  const litCount = (buf: Uint8Array) => {
    let n = 0;
    for (let i = 0; i < buf.length; i += 3) if (buf[i]! + buf[i + 1]! + buf[i + 2]! > 0) n++;
    return n;
  };

  it('returns a size×size×3 RGB buffer', () => {
    const buf = ledFrame(NEUTRAL, 0);
    expect(buf.length).toBe(LED_SIZE * LED_SIZE * 3);
  });

  it('gaze lookX shifts the eyes left and right', () => {
    const center = litColumnsInRow(ledFrame(NEUTRAL, 0, LED_SIZE, 0, 0, 0), 5);
    const left = litColumnsInRow(ledFrame(NEUTRAL, 0, LED_SIZE, -1, 0, 0), 5);
    const right = litColumnsInRow(ledFrame(NEUTRAL, 0, LED_SIZE, 1, 0, 0), 5);
    expect(Math.min(...left)).toBeLessThan(Math.min(...center));
    expect(Math.min(...right)).toBeGreaterThan(Math.min(...center));
  });

  it('voice level lights extra mouth pixels (lipsync)', () => {
    const quiet = litCount(ledFrame(NEUTRAL, 0, LED_SIZE, 0, 0, 0));
    const loud = litCount(ledFrame(NEUTRAL, 0, LED_SIZE, 0, 0, 1));
    expect(loud).toBeGreaterThan(quiet);
  });
});

describe('paramsForText / paramsForHints', () => {
  it('joy hints curve the mouth up and warm the glow', () => {
    const p = paramsForHints({ joy: 1 });
    expect(p.smile).toBeGreaterThan(NEUTRAL.smile);
    expect(p.r).toBeGreaterThan(p.b);
  });

  it('sadness hints droop the eyes', () => {
    const p = paramsForHints({ sadness: 1 });
    expect(p.eyeH).toBeLessThan(NEUTRAL.eyeH);
    expect(p.smile).toBeLessThan(0);
  });

  it('text analysis yields finite, in-range params', () => {
    for (const text of ['hello there', '我今天很開心！', '唔開心呀…', 'よろしくね']) {
      const p = paramsForText(text);
      expect(finite(p)).toBe(true);
      expect(p.eyeH).toBeGreaterThanOrEqual(0);
      expect(p.open).toBeGreaterThanOrEqual(0);
      expect(p.open).toBeLessThanOrEqual(1.2);
    }
  });
});
