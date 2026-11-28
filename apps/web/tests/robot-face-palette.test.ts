import { describe, expect, it } from 'vitest';
import { ORB_MOOD_RGB } from '../lib/emotion-orb-colors';
import {
  EXPRESSION_STATES,
  FACE_COLOR_PALETTE,
  FACE_STATES,
  NEUTRAL,
  STATE_BLEND_MS,
  blendFaceColors,
  createExpressionBlender,
  faceColorsFor,
  idleBlinkAmount,
  idleGazeOffset,
} from '../lib/robot-face';

describe('face colour palette (retuning surface)', () => {
  it('defines a primary + accent for every drawable state', () => {
    for (const state of EXPRESSION_STATES) {
      const pair = FACE_COLOR_PALETTE[state];
      expect(pair, `missing palette entry for ${state}`).toBeDefined();
      for (const v of [...pair.primary, ...pair.secondary]) {
        expect(Number.isFinite(v), `${state} has a non-finite channel`).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      }
    }
    // The state table must resolve exactly the palette (no inline colours).
    for (const state of EXPRESSION_STATES) {
      const colours = faceColorsFor(state);
      expect(colours.primary).toEqual(FACE_COLOR_PALETTE[state].primary);
      expect(colours.secondary).toEqual(FACE_COLOR_PALETTE[state].secondary);
    }
  });

  it('anchors the six coarse moods to the shared orb palette', () => {
    expect(faceColorsFor('joy').primary).toEqual([...ORB_MOOD_RGB.joy]);
    expect(faceColorsFor('anger').primary).toEqual([...ORB_MOOD_RGB.angry]);
    expect(faceColorsFor('sadness').primary).toEqual([...ORB_MOOD_RGB.sad]);
    expect(faceColorsFor('surprise').primary).toEqual([...ORB_MOOD_RGB.surprised]);
    expect(faceColorsFor('contentment').primary).toEqual([...ORB_MOOD_RGB.relaxed]);
    expect(faceColorsFor('neutral').primary).toEqual([...ORB_MOOD_RGB.neutral]);
  });

  it('clamps interpolated colour and never emits NaN or out-of-gamut values', () => {
    const sad = FACE_COLOR_PALETTE.sadness;
    const joy = FACE_COLOR_PALETTE.joy;

    expect(blendFaceColors(sad, joy, 0)).toEqual(sad);
    expect(blendFaceColors(sad, joy, 1)).toEqual(joy);
    // Out-of-range t clamps instead of extrapolating.
    expect(blendFaceColors(sad, joy, 5)).toEqual(joy);
    expect(blendFaceColors(sad, joy, -5)).toEqual(sad);
    // NaN t resolves to the from-pair, all channels finite.
    expect(blendFaceColors(sad, joy, Number.NaN)).toEqual(sad);

    // Out-of-gamut and non-finite inputs clamp instead of leaking through.
    const wild = blendFaceColors(
      { primary: [999, -20, 128], secondary: [Number.POSITIVE_INFINITY, 0, Number.NaN] },
      sad,
      0,
    );
    expect(wild.primary).toEqual([255, 0, 128]);
    expect(wild.secondary).toEqual([255, 0, 0]);
    for (const v of [...wild.primary, ...wild.secondary]) expect(Number.isFinite(v)).toBe(true);
  });

  it('cross-fades colour on a state change instead of snapping', () => {
    const blender = createExpressionBlender();
    const from = FACE_STATES.neutral;
    const to = FACE_STATES.joy;

    blender.set('neutral', 1, 0);
    blender.set('joy', 1, 1000);
    const mid = blender.sample(1000 + STATE_BLEND_MS / 2);
    expect(mid.r).toBeGreaterThan(from.r);
    expect(mid.r).toBeLessThan(to.r);

    // Once the blend and punch have settled it rests exactly on the target.
    const settled = blender.sample(1000 + STATE_BLEND_MS + 400);
    expect(settled.r).toBeCloseTo(to.r, 6);
    expect(settled.g).toBeCloseTo(to.g, 6);
    expect(settled.b).toBeCloseTo(to.b, 6);
  });

  it('never samples a NaN or out-of-gamut colour for any state', () => {
    const blender = createExpressionBlender();
    EXPRESSION_STATES.forEach((state, i) => {
      blender.set(state, 1, i * 30);
      const p = blender.sample(i * 30 + 15);
      for (const v of [p.r, p.g, p.b, p.r2, p.g2, p.b2]) {
        expect(Number.isFinite(v), `${state} colour is not finite`).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(255);
      }
    });
  });
});

describe('idle micro-motion', () => {
  it('blinks on a deterministic clock-derived schedule', () => {
    expect(idleBlinkAmount(0)).toBe(idleBlinkAmount(0));
    let peak = 0;
    let openFrames = 0;
    for (let t = 0; t < 5000; t += 10) {
      const v = idleBlinkAmount(t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      peak = Math.max(peak, v);
      if (v === 0) openFrames++;
    }
    expect(peak, 'the face never closes its eyes').toBeGreaterThan(0.9);
    expect(openFrames, 'the face blinks every frame').toBeGreaterThan(0);
  });

  it('drifts gaze deterministically inside a small bound', () => {
    expect(idleGazeOffset(1234)).toEqual(idleGazeOffset(1234));
    for (let t = 0; t < 60_000; t += 250) {
      const gaze = idleGazeOffset(t);
      expect(Number.isFinite(gaze.x)).toBe(true);
      expect(Number.isFinite(gaze.y)).toBe(true);
      expect(Math.abs(gaze.x)).toBeLessThanOrEqual(0.16);
      expect(Math.abs(gaze.y)).toBeLessThanOrEqual(0.16);
    }
    expect(idleGazeOffset(0)).not.toEqual(idleGazeOffset(4000));
  });

  it('keeps the breathing bob that already lived in the neutral look', () => {
    expect(NEUTRAL.bounce).toBeGreaterThan(0);
  });
});
