/**
 * Shared cast eye profile — TWO profiles, chosen per rig at mount.
 *
 * `atlas` (conservative, the pre-2026-11-25 behaviour): for rigs whose emotion
 * presets share ONE eye texture atlas via `textureTransformBinds` — e.g.
 * `seed-san.vrm` binds happy/angry/sad/relaxed/surprised to material 11's UV
 * transform. Stacking those lerps moves the atlas between cells and reads as
 * random big↔small eyes, so wide morphs also inflate the socket. These rigs
 * keep partial lids / wide morphs. Detected automatically: any non-morph
 * expression bind ⇒ `atlas`.
 *
 * `roster` (expressive): every live VRoid WANT roster rig binds PURE morph
 * targets with zero texture/material binds (audited 2026-11-25), so the atlas
 * rationale does not apply. OWNER OVERRIDE 2026-11-25: the original art
 * direction here ("no cartoon mega-eyes", "pleasant but mild") is retired —
 * the owner asked for obvious facial expressions and chose full
 * expressiveness. The roster profile lets a full smile/squint and a real
 * wide-eyed surprise through.
 *
 * The two profiles are intentionally module constants: there are still no
 * per-character eye-size knobs. Switching profiles is the only lever.
 */
export type CastEyeProfile = 'roster' | 'atlas';

// ---- expressive profile — live VRoid roster (pure morph rigs) -------------

/** A blink reads as closed without a full iris seal. */
export const ROSTER_EYE_BLINK_CAP = 0.9;

/** Squint / soft-close presets (happy, joy, fun, relaxed) — full weight. */
export const ROSTER_EYE_SQUINT_CAP = 1.0;

/** Wide-open / startled preset — real surprise, pupils still readable. */
export const ROSTER_EYE_WIDE_CAP = 0.9;

/** No neutral-clear floor: a 0.15 emotion still reads on a morph rig. */
export const ROSTER_EYE_ATLAS_FLOOR = 0;

// ---- atlas-safe profile — seed-san and any texture-atlas rig --------------

/** Lid close for blink — enough to read as a blink, short of a full iris seal. */
export const ATLAS_EYE_BLINK_CAP = 0.55;

/** Squint / soft-close presets (happy, joy, fun, relaxed). */
export const ATLAS_EYE_SQUINT_CAP = 0.58;

/** Wide-open / startled preset — keep pupils readable, no cartoon mega-eyes. */
export const ATLAS_EYE_WIDE_CAP = 0.32;

/** Below this, atlas eye presets clear to neutral (no UV fight). */
export const ATLAS_EYE_ATLAS_FLOOR = 0.14;

/**
 * Legacy export names — they always meant the conservative atlas profile.
 * Kept so older imports (and pre-profile tests) cannot silently change meaning.
 */
export const CAST_EYE_BLINK_CAP = ATLAS_EYE_BLINK_CAP;
export const CAST_EYE_SQUINT_CAP = ATLAS_EYE_SQUINT_CAP;
export const CAST_EYE_WIDE_CAP = ATLAS_EYE_WIDE_CAP;
export const CAST_EYE_ATLAS_FLOOR = ATLAS_EYE_ATLAS_FLOOR;

export interface EyeCaps {
  blink: number;
  squint: number;
  wide: number;
  /** dominance threshold: smaller raw intents clear to neutral */
  floor: number;
}

/** Cap + floor table for a profile. Deterministic; no per-id values. */
export function eyeCaps(profile: CastEyeProfile): EyeCaps {
  if (profile === 'roster') {
    return {
      blink: ROSTER_EYE_BLINK_CAP,
      squint: ROSTER_EYE_SQUINT_CAP,
      wide: ROSTER_EYE_WIDE_CAP,
      floor: ROSTER_EYE_ATLAS_FLOOR,
    };
  }
  return {
    blink: ATLAS_EYE_BLINK_CAP,
    squint: ATLAS_EYE_SQUINT_CAP,
    wide: ATLAS_EYE_WIDE_CAP,
    floor: ATLAS_EYE_ATLAS_FLOOR,
  };
}

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

/**
 * Alias → canonical atlas name. VRM / emotion-core use `surprise` while the
 * dominate path keys on `surprised`; folding prevents both cells fighting.
 */
export const CAST_EYE_ATLAS_ALIASES: Readonly<Record<string, string>> = {
  surprise: 'surprised',
  sorrow: 'sad',
};

export type CastEyeAtlasExpr = (typeof CAST_EYE_ATLAS_EXPR)[number];
