import { describe, expect, it } from 'vitest';
import type { EmotionFrame } from '@amoji/emotion-core';
import { dominantMood } from '../lib/companion';

function frame(face: Partial<EmotionFrame['face']>): EmotionFrame {
  return {
    t: 0,
    valence: 0,
    arousal: 0,
    idle: false,
    face: {
      browInnerUp: 0,
      browOuterUp: 0,
      browDown: 0,
      eyeWide: 0,
      eyeSquint: 0,
      lidClosure: 0,
      mouthSmile: 0,
      mouthFrown: 0,
      mouthOpen: 0,
      mouthStretch: 0,
      mouthPucker: 0,
      jawDrop: 0,
      cheekRaise: 0,
      noseWrinkle: 0,
      lipPress: 0,
      blink: 0,
      ...face,
    },
    body: {
      breath: 0,
      leanForward: 0,
      leanSide: 0,
      headPitch: 0,
      headRoll: 0,
      headYaw: 0,
      shoulderUp: 0,
      gestureReach: 0,
      gestureEnergy: 0,
    },
    gaze: { x: 0, y: 0 },
  };
}

describe('dominantMood eye size residual', () => {
  it('does not call talking (jawDrop) surprised', () => {
    // Open mouth while talking used to flip mood→surprised and fight eye size.
    expect(dominantMood(frame({ jawDrop: 0.9, mouthOpen: 0.8 }))).toBe('neutral');
  });

  it('still reads real eye-wide + brows as surprised', () => {
    expect(dominantMood(frame({ eyeWide: 0.9, browOuterUp: 0.8 }))).toBe('surprised');
  });
});
