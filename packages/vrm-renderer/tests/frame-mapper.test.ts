import { describe, expect, it } from 'vitest';
import { EmotionEngine } from '@amoji/emotion-core';
import type { BodyParams, EmotionFrame, FaceParams } from '@amoji/emotion-core';
import { ARM_DOWN_BASE, ELBOW_BASE, mapFrameToVrm } from '../src/frame-mapper';

const frameOf = (tags: Parameters<EmotionEngine['update']>[0]) => {
  const e = new EmotionEngine({}, 11);
  e.update(tags);
  for (let i = 0; i < 40; i++) e.tick(50);
  return e.tick(50);
};

describe('mapFrameToVrm', () => {
  it('joy maps to fun/joy blend shapes', () => {
    const t = mapFrameToVrm(frameOf({ llmTags: { joy: 1 } }));
    expect(t.blendShape.fun).toBeGreaterThan(0.3);
    expect(t.blendShape.joy).toBeGreaterThan(0.3);
    expect(t.blendShape.sorrow).toBeLessThan(0.1);
  });
  it('sadness maps to sorrow', () => {
    const t = mapFrameToVrm(frameOf({ llmTags: { sadness: 1 } }));
    expect(t.blendShape.sorrow).toBeGreaterThan(0.3);
  });
  it('anger maps to angry with lowered brows via jaw/neutral head pitch', () => {
    const t = mapFrameToVrm(frameOf({ llmTags: { anger: 1 } }));
    expect(t.blendShape.angry).toBeGreaterThan(0.3);
  });
  it('outputs stay in range', () => {
    for (const tags of [{ joy: 1 }, { fear: 1 }, { disgust: 1 }, { love: 1 }]) {
      const t = mapFrameToVrm(frameOf({ llmTags: tags }));
      for (const v of Object.values(t.blendShape)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
      expect(Math.abs(t.bones.headPitch)).toBeLessThanOrEqual(0.35);
      expect(Math.abs(t.bones.headYaw)).toBeLessThanOrEqual(0.6);
      expect(Math.abs(t.bones.headRoll)).toBeLessThanOrEqual(0.35);
    }
  });
  it('intensity scales output down', () => {
    const f = frameOf({ llmTags: { joy: 1 } });
    const full = mapFrameToVrm(f, 1);
    const half = mapFrameToVrm(f, 0.5);
    expect(half.blendShape.fun).toBeLessThan(full.blendShape.fun);
  });
});

// ---- Task 15: body idle animation (T-pose fix, sway, breathing) ----

const neutralFace = (): FaceParams => ({
  browInnerUp: 0, browOuterUp: 0, browDown: 0, eyeWide: 0, eyeSquint: 0,
  lidClosure: 0, mouthSmile: 0, mouthFrown: 0, mouthOpen: 0, mouthStretch: 0,
  mouthPucker: 0, jawDrop: 0, cheekRaise: 0, noseWrinkle: 0, lipPress: 0, blink: 0,
});

const neutralBody = (): BodyParams => ({
  breath: 0, leanForward: 0, leanSide: 0, headPitch: 0, headRoll: 0, headYaw: 0,
  shoulderUp: 0, gestureReach: 0, gestureEnergy: 0,
});

const makeFrame = (t: number, body?: Partial<BodyParams>, extra?: Partial<EmotionFrame>): EmotionFrame => ({
  face: neutralFace(),
  body: { ...neutralBody(), ...body },
  valence: 0,
  arousal: 0,
  gaze: { x: 0, y: 0 },
  idle: true,
  t,
  ...extra,
});

describe('body idle', () => {
  it('neutral pose lowers arms from T-pose to near ARM_DOWN_BASE', () => {
    const t = mapFrameToVrm(makeFrame(1200));
    expect(Math.abs(t.bones.leftUpperArm - ARM_DOWN_BASE)).toBeLessThan(0.1);
    expect(Math.abs(t.bones.rightUpperArm - ARM_DOWN_BASE)).toBeLessThan(0.1);
    expect(t.bones.leftLowerArm).toBeGreaterThanOrEqual(ELBOW_BASE);
  });

  it('intensity 0 keeps arms exactly at base and spine flat', () => {
    const t = mapFrameToVrm(makeFrame(1200), 0);
    expect(t.bones.leftUpperArm).toBeCloseTo(ARM_DOWN_BASE, 5);
    expect(t.bones.rightUpperArm).toBeCloseTo(ARM_DOWN_BASE, 5);
    expect(t.bones.spinePitch).toBeCloseTo(0, 5);
    expect(t.bones.chestPitch).toBeCloseTo(0, 5);
  });

  it('is deterministic for the same frame', () => {
    const f = makeFrame(2100, { gestureEnergy: 0.5, breath: 0.4 });
    expect(mapFrameToVrm(f)).toEqual(mapFrameToVrm(f));
  });

  it('leanForward pitches the spine forward', () => {
    const t = mapFrameToVrm(makeFrame(800, { leanForward: 1 }));
    expect(t.bones.spinePitch).toBeGreaterThan(0.05);
  });

  it('high arousal breaks left/right arm symmetry via sway', () => {
    const t = mapFrameToVrm(makeFrame(2100, {}, { arousal: 0.8 }));
    expect(t.bones.leftUpperArm).not.toBeCloseTo(t.bones.rightUpperArm, 3);
  });

  it('extreme inputs stay within clamps', () => {
    const t = mapFrameToVrm(makeFrame(3333, {
      leanForward: 1, leanSide: -1, shoulderUp: 1, gestureEnergy: 1, breath: 1,
    }, { arousal: 1, gaze: { x: 1, y: 1 } }));
    for (const v of [t.bones.leftUpperArm, t.bones.rightUpperArm]) {
      expect(v).toBeGreaterThanOrEqual(0.15);
      expect(v).toBeLessThanOrEqual(1.45);
    }
    expect(t.bones.leftLowerArm).toBeGreaterThanOrEqual(0.05);
    expect(t.bones.leftLowerArm).toBeLessThanOrEqual(0.6);
    expect(Math.abs(t.bones.spinePitch)).toBeLessThanOrEqual(0.2);
    expect(Math.abs(t.bones.chestPitch)).toBeLessThanOrEqual(0.12);
    expect(Math.abs(t.bones.headPitch)).toBeLessThanOrEqual(0.35);
    expect(Math.abs(t.bones.headYaw)).toBeLessThanOrEqual(0.6);
    expect(Math.abs(t.bones.headRoll)).toBeLessThanOrEqual(0.35);
  });
});
