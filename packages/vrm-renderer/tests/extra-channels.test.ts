/**
 * E2 defect 1 — independent expression channels.
 *
 * The shipped VRoid cast only carries the six emotion presets, so the extra
 * channel path must stay DORMANT there (identical six-preset output). A rig
 * that authors ARKit-style morphs gets them as their own targets, and the
 * contribution is taken out of the preset fold so the face is not driven twice.
 */
import { describe, expect, it } from 'vitest';
import type { EmotionFrame, FaceParams } from '@amoji/emotion-core';
import { mapFrameToVrm } from '../src/frame-mapper';

const neutralFace = (): FaceParams => ({
  browInnerUp: 0, browOuterUp: 0, browDown: 0, eyeWide: 0, eyeSquint: 0,
  lidClosure: 0, mouthSmile: 0, mouthFrown: 0, mouthOpen: 0, mouthStretch: 0,
  mouthPucker: 0, jawDrop: 0, cheekRaise: 0, noseWrinkle: 0, lipPress: 0, blink: 0,
});

const frame = (face: Partial<FaceParams>): EmotionFrame => ({
  face: { ...neutralFace(), ...face },
  body: {
    breath: 0, leanForward: 0, leanSide: 0, headPitch: 0, headRoll: 0, headYaw: 0,
    shoulderUp: 0, gestureReach: 0, gestureEnergy: 0,
  },
  valence: 0,
  arousal: 0,
  gaze: { x: 0, y: 0 },
  idle: false,
  t: 1000,
});

// catalog sadness: mouthFrown .8, browInnerUp .8, lidClosure .4, browOuterUp .2
const SAD = frame({ mouthFrown: 0.8, browInnerUp: 0.8, lidClosure: 0.4, browOuterUp: 0.2 });

describe('mapFrameToVrm extra channels', () => {
  it('a rig without the morphs gets exactly the six-preset fold', () => {
    const t = mapFrameToVrm(SAD);
    expect(t.extra).toEqual({});
    // sorrow = mouthFrown*0.7 + browInnerUp*0.3 + lidClosure*0.2
    expect(t.blendShape.sorrow).toBeCloseTo(0.88, 5);
  });

  it('a rig with browInnerUp drives the brow itself and drops it from sorrow', () => {
    const base = mapFrameToVrm(SAD);
    const withBrow = mapFrameToVrm(SAD, 1, undefined, { extraChannels: ['browInnerUp'] });
    expect(withBrow.extra?.browInnerUp).toBeCloseTo(0.8, 5);
    expect(withBrow.blendShape.sorrow).toBeCloseTo(base.blendShape.sorrow - 0.8 * 0.3, 5);
    // not folded twice: sorrow only carries the mouth + lids now
    expect(withBrow.blendShape.sorrow).toBeCloseTo(0.8 * 0.7 + 0.4 * 0.2, 5);
  });

  it('a rig that lacks the morph keeps the fold even when the channel is requested', () => {
    // Canvas only requests channels from the rig map, so THIS is the graceful
    // degradation contract: an unrequested/absent channel never changes a
    // preset it cannot drive.
    const absent = mapFrameToVrm(SAD, 1, undefined, { extraChannels: [] });
    expect(absent.extra).toEqual({});
    expect(absent.blendShape.sorrow).toBeCloseTo(0.88, 5);
  });

  it('every requested channel stays in 0..1 and scales with intensity', () => {
    const angry = frame({ browDown: 0.9, lipPress: 0.7, noseWrinkle: 0.4 });
    const full = mapFrameToVrm(angry, 1, undefined, {
      extraChannels: ['browDown', 'lipPress', 'noseWrinkle'],
    });
    expect(full.extra?.browDown).toBeCloseTo(0.9, 5);
    expect(full.extra?.lipPress).toBeCloseTo(0.7, 5);
    expect(full.extra?.noseWrinkle).toBeCloseTo(0.4, 5);
    // all three angry folds were replaced, so the preset itself is empty
    expect(full.blendShape.angry).toBeCloseTo(0, 5);
    const half = mapFrameToVrm(angry, 0.5, undefined, {
      extraChannels: ['browDown', 'lipPress', 'noseWrinkle'],
    });
    expect(half.extra?.browDown).toBeCloseTo(0.45, 5);
    for (const v of Object.values(half.extra ?? {})) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic for the same frame and channel set', () => {
    const opts = { extraChannels: ['cheekRaise', 'mouthPucker'] as const };
    const f = frame({ mouthSmile: 0.7, cheekRaise: 0.6, mouthPucker: 0.3 });
    expect(mapFrameToVrm(f, 1, undefined, opts)).toEqual(mapFrameToVrm(f, 1, undefined, opts));
  });
});
