import { describe, expect, it } from 'vitest';
import {
  ATLAS_EYE_ATLAS_FLOOR,
  ATLAS_EYE_BLINK_CAP,
  ATLAS_EYE_SQUINT_CAP,
  ATLAS_EYE_WIDE_CAP,
  CAST_EYE_ATLAS_EXPR,
  CAST_EYE_ATLAS_FLOOR,
  CAST_EYE_BLINK_CAP,
  CAST_EYE_SQUINT_CAP,
  CAST_EYE_WIDE_CAP,
  ROSTER_EYE_ATLAS_FLOOR,
  ROSTER_EYE_BLINK_CAP,
  ROSTER_EYE_SQUINT_CAP,
  ROSTER_EYE_WIDE_CAP,
  eyeCaps,
} from '../lib/vrm/cast-eye-profile';
import {
  capEyeExpression,
  detectEyeProfile,
  dominateEyeExpressions,
} from '../lib/vrm/eyes';

describe('cast eye profiles', () => {
  it('roster profile reaches full expression (owner override 2026-11-25)', () => {
    expect(ROSTER_EYE_SQUINT_CAP).toBe(1.0);
    expect(ROSTER_EYE_WIDE_CAP).toBeGreaterThanOrEqual(0.9);
    expect(ROSTER_EYE_BLINK_CAP).toBeGreaterThanOrEqual(0.9);
    expect(ROSTER_EYE_ATLAS_FLOOR).toBe(0);
    expect(eyeCaps('roster')).toEqual({
      blink: ROSTER_EYE_BLINK_CAP,
      squint: ROSTER_EYE_SQUINT_CAP,
      wide: ROSTER_EYE_WIDE_CAP,
      floor: ROSTER_EYE_ATLAS_FLOOR,
    });
  });

  it('seed-san keeps the conservative atlas-safe caps', () => {
    // seed-san binds these presets to ONE eye texture atlas (material 11
    // textureTransformBinds). Full weight there lerps between atlas cells and
    // reads as random big↔small eyes, so this profile must not be lifted.
    expect(ATLAS_EYE_BLINK_CAP).toBe(0.55);
    expect(ATLAS_EYE_SQUINT_CAP).toBe(0.58);
    expect(ATLAS_EYE_WIDE_CAP).toBe(0.32);
    expect(ATLAS_EYE_ATLAS_FLOOR).toBe(0.14);
    expect(eyeCaps('atlas')).toEqual({
      blink: ATLAS_EYE_BLINK_CAP,
      squint: ATLAS_EYE_SQUINT_CAP,
      wide: ATLAS_EYE_WIDE_CAP,
      floor: ATLAS_EYE_ATLAS_FLOOR,
    });
  });

  it('legacy export names still mean the atlas profile', () => {
    expect(CAST_EYE_BLINK_CAP).toBe(ATLAS_EYE_BLINK_CAP);
    expect(CAST_EYE_SQUINT_CAP).toBe(ATLAS_EYE_SQUINT_CAP);
    expect(CAST_EYE_WIDE_CAP).toBe(ATLAS_EYE_WIDE_CAP);
    expect(CAST_EYE_ATLAS_FLOOR).toBe(ATLAS_EYE_ATLAS_FLOOR);
    expect(CAST_EYE_ATLAS_EXPR.length).toBeGreaterThanOrEqual(5);
  });
});

describe('detectEyeProfile', () => {
  it('picks atlas when any expression drives a texture transform', () => {
    expect(detectEyeProfile({
      expressions: [
        { binds: [{ bindType: 'morphTarget' }] },
        { binds: [{ bindType: 'textureTransform' }] },
      ],
    })).toBe('atlas');
    expect(detectEyeProfile({
      expressions: [{ binds: [{ bindType: 'materialColor' }] }],
    })).toBe('atlas');
  });

  it('picks roster for pure morph rigs and empty managers', () => {
    expect(detectEyeProfile({
      expressions: [
        { binds: [{ bindType: 'morphTarget' }] },
        { binds: [{ bindType: 'morphTarget' }] },
      ],
    })).toBe('roster');
    expect(detectEyeProfile({ expressions: [{ binds: [] }] })).toBe('roster');
    expect(detectEyeProfile({})).toBe('roster');
    expect(detectEyeProfile(null)).toBe('roster');
    expect(detectEyeProfile(undefined)).toBe('roster');
  });
});

describe('capEyeExpression per profile', () => {
  it('lets a roster smile and surprise through at full intent', () => {
    expect(capEyeExpression('happy', 1, 'roster')).toBe(1);
    expect(capEyeExpression('joy', 0.95, 'roster')).toBe(0.95);
    expect(capEyeExpression('surprised', 1, 'roster')).toBe(ROSTER_EYE_WIDE_CAP);
    expect(capEyeExpression('blink', 1, 'roster')).toBe(ROSTER_EYE_BLINK_CAP);
  });

  it('keeps the atlas caps for seed-san', () => {
    expect(capEyeExpression('happy', 1, 'atlas')).toBe(0.58);
    expect(capEyeExpression('surprised', 1, 'atlas')).toBe(0.32);
    expect(capEyeExpression('blink', 1, 'atlas')).toBe(0.55);
    // Default is the conservative profile — an un-opted caller stays safe.
    expect(capEyeExpression('happy', 1)).toBe(0.58);
  });

  it('leaves non-eye channels alone and clamps look-at / negatives to 0', () => {
    expect(capEyeExpression('aa', 0.7, 'roster')).toBe(0.7);
    expect(capEyeExpression('lookLeft', 0.5, 'roster')).toBe(0);
    expect(capEyeExpression('happy', -1, 'roster')).toBe(0);
    expect(capEyeExpression('happy', Number.NaN, 'roster')).toBe(0);
  });
});

describe('dominateEyeExpressions', () => {
  it('roster: primary keeps full weight and one runner-up may coexist', () => {
    const out = dominateEyeExpressions({ happy: 0.9, surprised: 0.25 }, 'roster');
    expect(out.happy).toBe(0.9);
    expect(out.surprised).toBeCloseTo(0.25, 6);
    // everything else clears
    expect(out.angry).toBe(0);
    expect(out.sad).toBe(0);
    expect(out.relaxed).toBe(0);
  });

  it('roster: a weak runner-up below the floor is cleared', () => {
    const out = dominateEyeExpressions({ happy: 0.9, surprised: 0.05 }, 'roster');
    expect(out.happy).toBe(0.9);
    expect(out.surprised).toBe(0);
  });

  it('roster: the runner-up is clamped to the secondary weight', () => {
    const out = dominateEyeExpressions({ happy: 0.7, angry: 0.6, sad: 0.5 }, 'roster');
    expect(out.happy).toBe(0.7);
    expect(out.angry).toBeGreaterThan(0);
    expect(out.angry).toBeLessThanOrEqual(0.35);
    expect(out.sad).toBe(0);
  });

  it('atlas: winner-take-all still clears every loser (UV-cell safety)', () => {
    const out = dominateEyeExpressions({ happy: 0.9, surprised: 0.25 }, 'atlas');
    expect(out.happy).toBe(0.58);
    expect(out.surprised).toBe(0);
  });

  it('folds alias keys so surprise/surprised cannot fight', () => {
    const out = dominateEyeExpressions({ surprise: 0.4, happy: 0.2 }, 'atlas');
    expect(out.surprised).toBe(0.32);
    expect(out.surprise).toBe(0);
    expect(out.happy).toBe(0);
  });

  it('clears to neutral when nothing beats the profile floor', () => {
    expect(dominateEyeExpressions({ happy: 0.1 }, 'atlas').happy).toBe(0);
    // roster has floor 0, so a small intent still renders
    expect(dominateEyeExpressions({ happy: 0.1 }, 'roster').happy).toBe(0.1);
  });
});
