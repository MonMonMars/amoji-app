/**
 * Shared cast lighting profile. Every roster id uses the same unit multipliers
 * on the daylight rig (r108) — no per-character hemi/key/fill/face/exposure
 * overrides. Material passes (matcap dampen, shade floor, MToon unify) also
 * run on every load so shader/style stays one path.
 */

export interface CastLightingMultipliers {
  hemi: number;
  key: number;
  fill: number;
  ambient: number;
  /** Extra frontal face light (0 = none). Locked off for all cast members. */
  face: number;
  exposure: number;
}

/** Single palette multiplier for every cast member in WebGL (no per-id warmth). */
export const CAST_UNITY_TINT = '#ffffff';

/** Locked unit profile — every characterId resolves here. */
export const CAST_LIGHTING_UNIT: CastLightingMultipliers = {
  hemi: 1,
  key: 1,
  fill: 1,
  ambient: 1,
  face: 0,
  exposure: 1,
};

/**
 * @deprecated Empty — per-id lighting overrides removed (owner: same lighting
 * for all). Kept so docs/tests can assert the allowlist stays empty.
 */
export const CAST_LIGHTING_OVERRIDES: Readonly<Record<string, Partial<CastLightingMultipliers>>> =
  Object.freeze({});

/** @deprecated Matcap dampen is universal; this list is empty. */
export const CAST_MATCAP_DAMPEN_IDS: readonly string[] = [];

/** Scale applied to each RGB channel of matcapFactor (Color). */
export const CAST_MATCAP_COLOR_SCALE = 0.42;

/** Rim mix pull-down (universal MToon pass). */
export const CAST_RIM_MIX_SCALE = 0.55;

export function castLightingMultipliers(_characterId?: string): CastLightingMultipliers {
  return { ...CAST_LIGHTING_UNIT };
}

/** Always true — every character shares the matcap/rim tempering pass. */
export function needsCastMatcapDampen(_characterId?: string): boolean {
  return true;
}

/** Always false — face key stays off so the shared rig is identical for all. */
export function needsCastFaceLight(_characterId?: string): boolean {
  return false;
}

/** `models/want/a01-shino.vrm` or full URL → `a01-shino` */
export function characterIdFromModelRef(ref: string): string | undefined {
  const m = ref.match(/(?:^|\/)(a\d{2,3}-[a-z0-9-]+)\.vrm(?:\?|#|$)/i);
  return m?.[1]?.toLowerCase();
}
