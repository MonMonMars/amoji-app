/**
 * Per-character multipliers on the shared cast daylight rig (r108). Only roster
 * ids with a visible mismatch under ACES + neutral key get entries — everyone
 * else uses 1.0 (see castLightingMultipliers).
 *
 * Needs bump (stable castNo badges, 2026-11 review):
 *   1  a01-shino   — VRoid Sendagaya ref; soft MToon + matcap reads hot/washed vs later cast
 *   2  a02-shibu   — same family as #1
 *   3  a03-fumiriya — male ref sample; same MToon/matcap family as #1–2
 *   13 a63-hinoame-satuki-mei-sirayuki — grazing shadow pockets before shade floor catches
 *
 * r144 (2026-11-09): prior PR #299 never dampened matcap (three-vrm exposes
 * matcapFactor as a Color, not a float) and shade floors read the missing
 * shadeColor alias instead of shadeColorFactor — faces stayed washed/black.
 */

export interface CastLightingMultipliers {
  hemi: number;
  key: number;
  fill: number;
  ambient: number;
  /** Extra frontal face light (0 = none). Keep small — ACES already bright. */
  face: number;
  exposure: number;
}

const UNIT: CastLightingMultipliers = {
  hemi: 1,
  key: 1,
  fill: 1,
  ambient: 1,
  face: 0,
  exposure: 1,
};

/**
 * VRoid reference trio (#1–3): keep key near unit so shade pockets stay lit,
 * wrap with fill/ambient/face, and pull exposure slightly so matcap (once
 * actually dampened) does not blow out under ACES.
 */
const SENDAGAYA_REF: CastLightingMultipliers = {
  hemi: 1.06,
  key: 0.95,
  fill: 1.55,
  ambient: 1.85,
  face: 1,
  exposure: 0.96,
};

const OVERRIDES: Readonly<Record<string, Partial<CastLightingMultipliers>>> = {
  'a01-shino': SENDAGAYA_REF,
  'a02-shibu': SENDAGAYA_REF,
  'a03-fumiriya': SENDAGAYA_REF,
  'a63-hinoame-satuki-mei-sirayuki': {
    key: 0.9,
    fill: 1.4,
    ambient: 1.7,
    face: 0.85,
    exposure: 0.97,
  },
};

/** Ids whose MToon matcap (_SphereAdd / matcapFactor Color) is toned down. */
export const CAST_MATCAP_DAMPEN_IDS: readonly string[] = [
  'a01-shino',
  'a02-shibu',
  'a03-fumiriya',
];

/** Scale applied to each RGB channel of matcapFactor (Color). */
export const CAST_MATCAP_COLOR_SCALE = 0.42;

/** Rim mix pull-down for the same reference trio. */
export const CAST_RIM_MIX_SCALE = 0.55;

export function castLightingMultipliers(characterId?: string): CastLightingMultipliers {
  if (!characterId) return { ...UNIT };
  const o = OVERRIDES[characterId];
  if (!o) return { ...UNIT };
  return {
    hemi: o.hemi ?? UNIT.hemi,
    key: o.key ?? UNIT.key,
    fill: o.fill ?? UNIT.fill,
    ambient: o.ambient ?? UNIT.ambient,
    face: o.face ?? UNIT.face,
    exposure: o.exposure ?? UNIT.exposure,
  };
}

export function needsCastMatcapDampen(characterId: string): boolean {
  return (CAST_MATCAP_DAMPEN_IDS as readonly string[]).includes(characterId);
}

export function needsCastFaceLight(characterId?: string): boolean {
  return castLightingMultipliers(characterId).face > 0;
}

/** `models/want/a01-shino.vrm` or full URL → `a01-shino` */
export function characterIdFromModelRef(ref: string): string | undefined {
  const m = ref.match(/(?:^|\/)(a\d{2,3}-[a-z0-9-]+)\.vrm(?:\?|#|$)/i);
  return m?.[1]?.toLowerCase();
}
