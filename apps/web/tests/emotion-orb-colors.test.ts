import type { EmotionFrame } from '@amoji/emotion-core';
import { describe, expect, it } from 'vitest';
import {
  ORB_MOOD_RGB,
  isAngryOrbRed,
  orbBaseRgb,
} from '../lib/emotion-orb-colors';

const blankFace = Object.fromEntries(
  [
    'browInnerUp',
    'browOuterUp',
    'browDown',
    'eyeWide',
    'eyeSquint',
    'lidClosure',
    'mouthSmile',
    'mouthFrown',
    'mouthOpen',
    'mouthStretch',
    'mouthPucker',
    'jawDrop',
    'cheekRaise',
    'noseWrinkle',
    'lipPress',
    'blink',
  ].map((k) => [k, 0]),
) as EmotionFrame['face'];

const blankBody = Object.fromEntries(
  [
    'breath',
    'leanForward',
    'leanSide',
    'headPitch',
    'headRoll',
    'headYaw',
    'shoulderUp',
    'gestureReach',
    'gestureEnergy',
  ].map((k) => [k, 0]),
) as EmotionFrame['body'];

function frame(valence: number, arousal: number): EmotionFrame {
  return {
    face: blankFace,
    body: blankBody,
    valence,
    arousal,
    gaze: { x: 0, y: 0 },
    idle: false,
    t: 0,
  };
}

describe('emotion orb mood colours', () => {
  it('maps excited moods to yellow/orange, never angry red', () => {
    expect(orbBaseRgb('joy', null)).toEqual(ORB_MOOD_RGB.joy);
    expect(orbBaseRgb('surprised', null)).toEqual(ORB_MOOD_RGB.surprised);
    expect(isAngryOrbRed(orbBaseRgb('joy', null))).toBe(false);
    expect(isAngryOrbRed(orbBaseRgb('surprised', null))).toBe(false);
  });

  it('uses red only for angry', () => {
    expect(orbBaseRgb('angry', null)).toEqual(ORB_MOOD_RGB.angry);
    expect(isAngryOrbRed(orbBaseRgb('angry', null))).toBe(true);
  });

  it('maps calm moods to green (warm) and blue (cool)', () => {
    expect(orbBaseRgb('relaxed', null)[1]).toBeGreaterThan(orbBaseRgb('relaxed', null)[0]);
    expect(orbBaseRgb('sad', null)[2]).toBeGreaterThan(orbBaseRgb('sad', null)[0]);
    expect(isAngryOrbRed(orbBaseRgb('sad', null))).toBe(false);
    expect(isAngryOrbRed(orbBaseRgb('relaxed', null))).toBe(false);
  });

  it('neutral follows valence/arousal instead of character accent', () => {
    const calmWarm = orbBaseRgb('neutral', frame(0.4, 0.1));
    const calmCool = orbBaseRgb('neutral', frame(-0.4, 0.1));
    const excited = orbBaseRgb('neutral', frame(0.6, 0.7));

    expect(calmWarm[1]).toBeGreaterThan(calmWarm[2]);
    expect(calmCool[2]).toBeGreaterThan(calmCool[0]);
    expect(excited[0]).toBeGreaterThan(200);
    expect(excited[1]).toBeGreaterThan(140);
    expect(isAngryOrbRed(calmWarm)).toBe(false);
    expect(isAngryOrbRed(calmCool)).toBe(false);
    expect(isAngryOrbRed(excited)).toBe(false);
  });
});
