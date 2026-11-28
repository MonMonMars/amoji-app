import { describe, expect, it } from 'vitest';
import {
  EMOTION_IDS,
  FACE_CHANNEL_KEYS,
  FACE_STATES,
  LED_SIZE,
  NEUTRAL,
  TRANSIENT_FACE_STATES,
  blendFaceParams,
  blendProgress,
  createExpressionBlender,
  createPunchTracker,
  drawFace,
  faceColorsFor,
  fallbackMouthLevel,
  ledFrame,
  paramsForEmotion,
  resolveFaceParams,
  smoothMouthLevel,
  talkingMouthTarget,
  type ExpressionState,
} from '../lib/robot-face';

// The channels that make two looks distinguishable. Colours are checked
// separately so a tint tweak cannot mask two identical geometry rows.
const SHAPE_CHANNELS = [
  'eyeW', 'eyeH', 'eyeSlant', 'pupil', 'pupilX', 'pupilY',
  'browTilt', 'browRaise', 'browAsym',
  'smile', 'open', 'pucker', 'blush', 'bounce',
] as const;

const signature = (state: ExpressionState): string =>
  SHAPE_CHANNELS.map((k) => Math.round(FACE_STATES[state][k] * 100)).join(',');

const differsFromNeutral = (state: ExpressionState): number => {
  const p = FACE_STATES[state];
  let n = 0;
  for (const k of FACE_CHANNEL_KEYS) {
    if (Math.abs(p[k] - NEUTRAL[k]) > 0.04) n++;
  }
  return n;
};

describe('expression state model', () => {
  it('defines a visual state for every catalog emotion', () => {
    for (const id of EMOTION_IDS) {
      expect(FACE_STATES[id], `missing look for ${id}`).toBeDefined();
      expect(FACE_CHANNEL_KEYS.every((k) => Number.isFinite(FACE_STATES[id][k]))).toBe(true);
    }
  });

  it('defines every transient robot state', () => {
    for (const state of TRANSIENT_FACE_STATES) {
      expect(FACE_STATES[state], `missing look for ${state}`).toBeDefined();
      expect(FACE_CHANNEL_KEYS.every((k) => Number.isFinite(FACE_STATES[state][k]))).toBe(true);
    }
  });

  it('gives every emotion a look that is not neutral', () => {
    for (const id of EMOTION_IDS) {
      if (id === 'neutral') continue;
      expect(differsFromNeutral(id), `${id} still looks neutral`).toBeGreaterThanOrEqual(2);
      // paramsForEmotion must reach the same look (the old table silently
      // returned NEUTRAL for eight emotions).
      const p = resolveFaceParams(paramsForEmotion(id, 1));
      let moved = 0;
      for (const k of FACE_CHANNEL_KEYS) {
        if (Math.abs(p[k] - NEUTRAL[k]) > 0.04) moved++;
      }
      expect(moved, `paramsForEmotion(${id}) fell through to neutral`).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps all emotion and transient looks distinct from each other', () => {
    const all: ExpressionState[] = [...TRANSIENT_FACE_STATES, ...EMOTION_IDS];
    const seen = new Map<string, ExpressionState>();
    for (const state of all) {
      const sig = signature(state);
      expect(seen.has(sig), `${state} has the same shape as ${seen.get(sig)}`).toBe(false);
      seen.set(sig, state);
    }
  });
});

describe('face colour resolution', () => {
  it('returns an in-range pair for every emotion, using the existing palette', () => {
    for (const id of EMOTION_IDS) {
      const { primary, secondary } = faceColorsFor(id);
      for (const v of [...primary, ...secondary]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      }
    }
    const joy = faceColorsFor('joy').primary;
    expect(joy[0]).toBeGreaterThan(joy[2]);
    const sad = faceColorsFor('sadness').primary;
    expect(sad[2]).toBeGreaterThan(sad[0]);
  });

  it('falls back to the neutral pair for an unknown state', () => {
    const unknown = faceColorsFor('not-a-state');
    expect(unknown.primary).toEqual([NEUTRAL.r, NEUTRAL.g, NEUTRAL.b]);
    expect(unknown.secondary).toEqual([NEUTRAL.r2, NEUTRAL.g2, NEUTRAL.b2]);
  });
});

describe('state blending and timing', () => {
  const joy = FACE_STATES.joy;

  it('blends between looks without snapping and clamps t', () => {
    expect(blendFaceParams(NEUTRAL, joy, 0).smile).toBeCloseTo(NEUTRAL.smile, 6);
    expect(blendFaceParams(NEUTRAL, joy, 1).smile).toBeCloseTo(joy.smile, 6);
    const half = blendFaceParams(NEUTRAL, joy, 0.5).smile;
    expect(half).toBeGreaterThan(NEUTRAL.smile);
    expect(half).toBeLessThan(joy.smile);
    expect(blendFaceParams(NEUTRAL, joy, 2).smile).toBeCloseTo(joy.smile, 6);
    expect(blendFaceParams(NEUTRAL, joy, Number.NaN).smile).toBeCloseTo(NEUTRAL.smile, 6);
  });

  it('cross-fades inside the 120–200 ms window', () => {
    expect(blendProgress(0)).toBe(0);
    expect(blendProgress(120)).toBeLessThan(1);
    expect(blendProgress(160)).toBe(1);
    expect(blendProgress(200)).toBe(1);
  });

  it('punches in past the target on a strong rising edge, then settles', () => {
    const b = createExpressionBlender();
    expect(b.sample(0).eyeH).toBeCloseTo(NEUTRAL.eyeH, 6);
    b.set('joy', 1, 0);
    // 200 ms: blend has arrived and the punch is at its peak.
    const peak = b.sample(200);
    expect(peak.eyeH).toBeGreaterThan(joy.eyeH);
    // After attack+hold+settle the face rests exactly on the target.
    const settled = b.sample(700);
    expect(settled.eyeH).toBeCloseTo(joy.eyeH, 6);
  });

  it('punches again after the face has decayed through idle', () => {
    const b = createExpressionBlender();
    b.set('joy', 1, 0);
    b.sample(700);
    b.set('idle', 1, 800);
    b.sample(1000);
    b.set('joy', 1, 1100);
    expect(b.sample(1300).eyeH).toBeGreaterThan(FACE_STATES.joy.eyeH);
  });

  it('does not punch a mild emotion or a repeated strong one', () => {
    const mild = createExpressionBlender();
    mild.set('joy', 0.2, 0);
    expect(mild.sample(160).eyeH).toBeLessThan(0.9);

    const tracker = createPunchTracker();
    expect(tracker.update(0.2, 0)).toBe(false);
    expect(tracker.update(0.8, 10)).toBe(true);
    expect(tracker.update(0.8, 500)).toBe(false);
    tracker.update(0.8, 800);
    expect(tracker.update(0.8, 900)).toBe(false);
  });

  it('never emits NaN and clamps out-of-range strength', () => {
    const b = createExpressionBlender();
    expect(b.intensity).toBe(0);
    b.set('joy', 5, 0);
    expect(b.intensity).toBe(1);
    const all: ExpressionState[] = [...TRANSIENT_FACE_STATES, ...EMOTION_IDS];
    for (let i = 0; i < all.length; i++) {
      b.set(all[i]!, 1, i * 40);
      const p = b.sample(i * 40 + 90);
      for (const k of FACE_CHANNEL_KEYS) {
        expect(Number.isFinite(p[k]), `${all[i]}.${k} is not finite`).toBe(true);
      }
      expect(p.eyeH).toBeGreaterThanOrEqual(0);
      expect(p.eyeH).toBeLessThanOrEqual(1.2);
      expect(p.smile).toBeGreaterThanOrEqual(-1);
      expect(p.smile).toBeLessThanOrEqual(1);
      expect(p.open).toBeGreaterThanOrEqual(0);
      expect(p.open).toBeLessThanOrEqual(1.2);
    }
  });
});

describe('renderers accept every state', () => {
  const ctxStub = new Proxy(
    {},
    {
      get: (_target, prop) => (prop === 'canvas' ? {} : () => undefined),
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D;

  it('draws every state without throwing (canvas + LED)', () => {
    const all: ExpressionState[] = [...TRANSIENT_FACE_STATES, ...EMOTION_IDS];
    for (const state of all) {
      expect(() => drawFace(ctxStub, 360, 300, FACE_STATES[state], 0, 0, 0, 0, 0)).not.toThrow();
      const frame = ledFrame(FACE_STATES[state], 0);
      expect(frame.length).toBe(LED_SIZE * LED_SIZE * 3);
      let lit = 0;
      for (let i = 0; i < frame.length; i += 3) if (frame[i]! + frame[i + 1]! + frame[i + 2]! > 0) lit++;
      expect(lit, `${state} lights no LED pixels`).toBeGreaterThan(0);
    }
  });
});

describe('talking mouth', () => {
  it('follows a supplied level and clamps it', () => {
    expect(talkingMouthTarget('speaking', 0.8, 1000)).toBeCloseTo(0.8, 6);
    expect(talkingMouthTarget('speaking', 5, 1000)).toBe(1);
    expect(talkingMouthTarget('idle', 0.6, 1000)).toBeCloseTo(0.6, 6);
  });

  it('falls back deterministically when there is no analyser level', () => {
    const a = talkingMouthTarget('speaking', 0, 1000);
    const b = talkingMouthTarget('speaking', 0, 1000);
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0.05);
    expect(a).toBeLessThan(1);
    expect(fallbackMouthLevel(4321)).toBe(fallbackMouthLevel(4321));
    expect(talkingMouthTarget('idle', 0, 1000)).toBe(0);
    expect(talkingMouthTarget('sleeping', 0, 1000)).toBe(0);
  });

  it('opens faster than it closes (45 ms / 110 ms) and is NaN-safe', () => {
    const rising = smoothMouthLevel(0, 1, 16);
    const falling = smoothMouthLevel(1, 0, 16);
    expect(rising).toBeGreaterThan(0);
    expect(rising).toBeLessThan(1);
    expect(1 - falling).toBeLessThan(rising);
    expect(smoothMouthLevel(Number.NaN, Number.NaN, 16)).toBe(0);
    expect(smoothMouthLevel(1, 1, 0)).toBe(1);
  });
});
