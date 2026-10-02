import { describe, expect, it } from 'vitest';
import type { EmotionFrame } from '@amoji/emotion-core';
import {
  IDLE_POSES, cycleDuration, poseIndexFor, sampleIdlePose,
} from '../src/idle-poses';
import { mapFrameToVrm } from '../src/frame-mapper';

const POSE_NUM_KEYS = [
  'upperDelta', 'elbowDelta', 'spineDelta', 'headYaw', 'headRollDelta', 'leanSideDelta',
] as const;

const neutralFrame = (t: number): EmotionFrame => ({
  face: {
    browInnerUp: 0, browOuterUp: 0, browDown: 0, eyeWide: 0, eyeSquint: 0,
    lidClosure: 0, mouthSmile: 0, mouthFrown: 0, mouthOpen: 0, mouthStretch: 0,
    mouthPucker: 0, jawDrop: 0, cheekRaise: 0, noseWrinkle: 0, lipPress: 0, blink: 0,
  },
  body: {
    breath: 0, leanForward: 0, leanSide: 0, headPitch: 0, headRoll: 0, headYaw: 0,
    shoulderUp: 0, gestureReach: 0, gestureEnergy: 0,
  },
  valence: 0, arousal: 0, gaze: { x: 0, y: 0 }, idle: true, t,
});

describe('idle poses', () => {
  it('poseIndexFor stays within catalog bounds and is deterministic', () => {
    for (let c = 0; c < 200; c++) {
      const i = poseIndexFor(7, c);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(IDLE_POSES.length);
      expect(poseIndexFor(7, c)).toBe(i);
    }
  });

  it('different seeds give different pose sequences', () => {
    const a = Array.from({ length: 20 }, (_, c) => poseIndexFor(1, c));
    const b = Array.from({ length: 20 }, (_, c) => poseIndexFor(999, c));
    expect(a.join()).not.toBe(b.join());
  });

  it('sampleIdlePose is deterministic and finite', () => {
    for (const t of [0, 500, 1200, 5000, 8600, 20000, 123456]) {
      const p = sampleIdlePose(t, 7);
      expect(sampleIdlePose(t, 7)).toEqual(p);
      for (const k of POSE_NUM_KEYS) expect(Number.isFinite(p[k])).toBe(true);
    }
  });

  it('hold phase returns exactly the current catalog pose', () => {
    // walk cycles for seed 3, sample 2s into a cycle (blend window is 1.5s)
    let start = 0;
    for (let cycle = 0; cycle < 5; cycle++) {
      const t = start + 2000;
      const p = sampleIdlePose(t, 3);
      expect(p.id).toBe(IDLE_POSES[poseIndexFor(3, cycle)]!.id);
      start += cycleDuration(3, cycle);
    }
  });

  it('is continuous across pose switches (numeric fields only)', () => {
    let prev = sampleIdlePose(0, 11);
    for (let t = 50; t <= 30000; t += 50) {
      const cur = sampleIdlePose(t, 11);
      for (const k of POSE_NUM_KEYS) {
        expect(Math.abs(cur[k] - prev[k])).toBeLessThan(0.05);
      }
      prev = cur;
    }
  });

  it('crossedArms pose bends elbows more than stand', () => {
    const frame = neutralFrame(9000);
    const crossed = IDLE_POSES.find((p) => p.id === 'crossedArms')!;
    const a = mapFrameToVrm(frame, 1, crossed);
    const b = mapFrameToVrm(frame, 1, IDLE_POSES[0]!);
    expect(a.bones.leftLowerArm).toBeGreaterThan(b.bones.leftLowerArm);
  });

  it('headTilt pose adds visible roll and yaw', () => {
    const frame = neutralFrame(9000);
    const tilt = IDLE_POSES.find((p) => p.id === 'headTilt')!;
    const a = mapFrameToVrm(frame, 1, tilt);
    const b = mapFrameToVrm(frame, 1);
    expect(Math.abs(a.bones.headRoll)).toBeGreaterThan(Math.abs(b.bones.headRoll));
    expect(a.bones.headYaw).not.toBeCloseTo(b.bones.headYaw, 2);
  });
});
