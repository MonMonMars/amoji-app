/**
 * Shared cast eye profile — same lids / open / atlas rules for every roster
 * id (lighting-unify philosophy: no per-character eye-size knobs).
 *
 * VRoid / seed faces often put several emotion presets on one eye atlas via
 * textureTransformBinds. Stacking happy+surprised+relaxed lerps UV offsets
 * between atlas cells and reads as random big↔small eyes. Wide morphs
 * (Fcl_ALL_Surprised) also inflate the socket when left uncapped.
 */

/** Lid close for blink — enough to read as a blink, short of a full iris seal. */
export const CAST_EYE_BLINK_CAP = 0.55;

/** Squint / soft-close presets (happy, joy, fun, relaxed). */
export const CAST_EYE_SQUINT_CAP = 0.58;

/** Wide-open / startled preset — keep pupils readable, no cartoon mega-eyes. */
export const CAST_EYE_WIDE_CAP = 0.32;

/** Below this, atlas eye presets clear to neutral (no UV fight). */
export const CAST_EYE_ATLAS_FLOOR = 0.14;

/** Face presets that share the eye atlas / eye-size morphs. */
export const CAST_EYE_ATLAS_EXPR = [
  'happy',
  'angry',
  'sad',
  'surprised',
  'relaxed',
  'fun',
  'joy',
  'sorrow',
] as const;

export type CastEyeAtlasExpr = (typeof CAST_EYE_ATLAS_EXPR)[number];
