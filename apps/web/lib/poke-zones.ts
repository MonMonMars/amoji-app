// Pixel poke grid: 6 body tiers × 8 facing angles → 48 voice slots + motion recipes.
// Every tier, including calf + foot, moves and plays a gendered poke voice.

import type { Lang } from './prefs';
import type { PokeBody, PokeDirection, TalkZone } from './poke-hit';
import { POKE_DIRECTIONS, pokeBodyReaction } from './poke-hit';

/** Body tier, top → bottom (Pixel spec). */
export type PokeTierId =
  | 'head'
  | 'shoulder_chest'
  | 'belly'
  | 'hip'
  | 'thigh'
  | 'calf_foot';

export const POKE_TIER_ORDER: readonly PokeTierId[] = [
  'head',
  'shoulder_chest',
  'belly',
  'hip',
  'thigh',
  'calf_foot',
] as const;

export const POKE_ANGLES: readonly PokeDirection[] = POKE_DIRECTIONS;

export type PokeSectionId = `poke:${PokeTierId}:${PokeDirection}`;

export interface PokeSection {
  id: PokeSectionId;
  tier: PokeTierId;
  /** 1 = head … 6 = calf + foot */
  tierNumber: 1 | 2 | 3 | 4 | 5 | 6;
  angle: PokeDirection;
  /** Traditional Chinese label for copy / Pixel voice table */
  labelTc: string;
  voiceKey: PokeSectionId;
  /** Legacy flag; all tiers now move. Kept so existing callers compile. */
  voiceOnly: boolean;
}

const TIER_LABEL_TC: Record<PokeTierId, string> = {
  head: '頭',
  shoulder_chest: '肩胸',
  belly: '肚腹',
  hip: '臀胯',
  thigh: '大腿',
  calf_foot: '小腿／腳',
};

const ANGLE_LABEL_TC: Record<PokeDirection, string> = {
  front: '正面',
  frontLeft: '左前',
  left: '左側',
  backLeft: '左後',
  back: '背面',
  backRight: '右後',
  right: '右側',
  frontRight: '右前',
};

const TIER_NUM: Record<PokeTierId, PokeSection['tierNumber']> = {
  head: 1,
  shoulder_chest: 2,
  belly: 3,
  hip: 4,
  thigh: 5,
  calf_foot: 6,
};

function sectionId(tier: PokeTierId, angle: PokeDirection): PokeSectionId {
  return `poke:${tier}:${angle}`;
}

export const POKE_SECTIONS: readonly PokeSection[] = POKE_TIER_ORDER.flatMap((tier) =>
  POKE_ANGLES.map((angle) => {
    const id = sectionId(tier, angle);
    return {
      id,
      tier,
      tierNumber: TIER_NUM[tier],
      angle,
      labelTc: `${TIER_LABEL_TC[tier]}·${ANGLE_LABEL_TC[angle]}`,
      voiceKey: id,
      voiceOnly: false,
    } satisfies PokeSection;
  }),
);

export const POKE_SECTION_IDS: readonly PokeSectionId[] = POKE_SECTIONS.map((s) => s.id);

const SECTION_BY_ID = new Map<PokeSectionId, PokeSection>(
  POKE_SECTIONS.map((s) => [s.id, s]),
);

export function pokeSectionById(id: string): PokeSection | undefined {
  return SECTION_BY_ID.get(id as PokeSectionId);
}

/** Map legacy hit-test zone → body tier for the 6×4 grid. */
export function talkZoneToTier(zone: TalkZone): PokeTierId {
  switch (zone) {
    case 'head':
      return 'head';
    case 'chest':
    case 'side':
    case 'armL':
    case 'armR':
    case 'hand':
    case 'back':
      return 'shoulder_chest';
    case 'belly':
    case 'torso':
      return 'belly';
    case 'butt':
      return 'hip';
    case 'legL':
    case 'legR':
      return 'thigh';
    case 'foot':
      return 'calf_foot';
    default:
      return 'belly';
  }
}

export function resolvePokeSection(zone: TalkZone, direction: PokeDirection): PokeSection {
  const tier = talkZoneToTier(zone);
  const id = sectionId(tier, direction);
  return SECTION_BY_ID.get(id)!;
}

/** Relative follow amplitude per body band when this tier is poked (Mon Pixel blend rule). */
const TIER_BAND_SCALE: Record<
  PokeTierId,
  { head: number; chest: number; spine: number; hip: number; arm: number; shift: number }
> = {
  head: { head: 1, chest: 0.34, spine: 0.18, hip: 0.08, arm: 0.16, shift: 0.03 },
  // Stronger chest/arm band so same-side tip + near-arm flinch read on phone.
  shoulder_chest: { head: 0.28, chest: 1.18, spine: 0.78, hip: 0.36, arm: 1.12, shift: 0.06 },
  // head: 1 keeps the belly counter (head opposite abdomen) at full amplitude.
  belly: { head: 1, chest: 0.48, spine: 1.08, hip: 0.58, arm: 0.28, shift: 0 },
  hip: { head: 0.08, chest: 0.26, spine: 0.55, hip: 1.08, arm: 0.18, shift: 0 },
  thigh: { head: 0.05, chest: 0.12, spine: 0.26, hip: 0.78, arm: 0.1, shift: 0.036 },
  calf_foot: { head: 0.06, chest: 0.1, spine: 0.22, hip: 0.62, arm: 0.1, shift: 0.02 },
};

function tierLegacyZone(tier: PokeTierId, hitZone: TalkZone): TalkZone {
  if (tier === 'thigh') {
    if (hitZone === 'legR') return 'legR';
    if (hitZone === 'legL') return 'legL';
    return 'legL';
  }
  switch (tier) {
    case 'head':
      return 'head';
    case 'shoulder_chest':
      if (hitZone === 'armL' || hitZone === 'armR' || hitZone === 'hand' || hitZone === 'side') return hitZone;
      if (hitZone === 'back') return 'back';
      return 'chest';
    case 'belly':
      return 'belly';
    case 'hip':
      return 'butt';
    case 'calf_foot':
      return 'foot';
    default:
      return 'belly';
  }
}

const STILL: PokeBody = {
  rootX: 0, rootY: 0, rootZ: 0,
  spinePitch: 0, chestPitch: 0, spineYaw: 0, chestRoll: 0,
  headX: 0, headZ: 0,
  hipPitch: 0, hipRoll: 0, hipShiftX: 0, hipShiftZ: 0,
  lArmX: 0, rArmX: 0, lElbowZ: 0, rElbowZ: 0, lArmUp: 0, rArmUp: 0,
};

function scaleBody(body: PokeBody, scale: typeof TIER_BAND_SCALE.head): PokeBody {
  return {
    ...body,
    headX: body.headX * scale.head,
    headZ: body.headZ * scale.head,
    chestPitch: body.chestPitch * scale.chest,
    chestRoll: body.chestRoll * scale.chest,
    spinePitch: body.spinePitch * scale.spine,
    spineYaw: body.spineYaw * scale.spine,
    hipPitch: body.hipPitch * scale.hip,
    hipRoll: body.hipRoll * scale.hip,
    hipShiftX: body.hipShiftX * scale.shift,
    hipShiftZ: body.hipShiftZ * scale.shift,
    lArmX: body.lArmX * scale.arm,
    rArmX: body.rArmX * scale.arm,
    lElbowZ: body.lElbowZ * scale.arm,
    rElbowZ: body.rElbowZ * scale.arm,
    lArmUp: body.lArmUp * scale.arm,
    rArmUp: body.rArmUp * scale.arm,
  };
}

/**
 * Tier-aware poke lean: the body tips toward the poked side (Owner R13,
 * push left → body falls screen-left) with tier falloff. All six tiers move.
 *
 * Head tier keeps full head amplitude from the head recipe, then layers a
 * soft torso follow (Pixel: head poke moves upper body less, not zero).
 * The head-only early return in pokeBodyReaction would otherwise leave
 * TIER_BAND_SCALE.chest/spine unused.
 */
export function pokeSectionBodyReaction(opts: {
  t: number;
  section: PokeSection;
  hitZone: TalkZone;
  fallX: number;
  fallZ: number;
  sideSign: number;
  softChest: boolean;
  twist: number;
}): PokeBody {
  if (opts.section.voiceOnly) return { ...STILL };
  const legacy = tierLegacyZone(opts.section.tier, opts.hitZone);
  const common = {
    t: opts.t,
    direction: opts.section.angle,
    fallX: opts.fallX,
    fallZ: opts.fallZ,
    sideSign: opts.sideSign,
    twist: opts.twist,
  } as const;
  if (opts.section.tier === 'head') {
    const headOnly = pokeBodyReaction({
      ...common,
      zone: 'head',
      softChest: false,
    });
    // Soft torso follow on the same fall vector (away from push), low band scale.
    const follow = scaleBody(
      pokeBodyReaction({
        ...common,
        zone: 'torso',
        softChest: false,
      }),
      TIER_BAND_SCALE.head,
    );
    return {
      ...follow,
      headX: headOnly.headX,
      headZ: headOnly.headZ,
    };
  }
  const raw = pokeBodyReaction({
    ...common,
    zone: legacy,
    softChest: opts.softChest && legacy === 'chest',
  });
  return scaleBody(raw, TIER_BAND_SCALE[opts.section.tier]);
}

/** Generic one-liner until Pixel supplies per-section copy. */
export function pokeSectionPlaceholderLine(sectionId: PokeSectionId, lang: Lang): string {
  const section = pokeSectionById(sectionId);
  const label = section?.labelTc ?? sectionId;
  const key = section?.voiceKey ?? sectionId;
  if (lang === 'yue') return `（戳戳反應待填：${label}｜${key}）`;
  if (lang === 'zh') return `（戳戳反应待填：${label}｜${key}）`;
  if (lang === 'ja') return `（ポーク反応・未設定：${key}）`;
  return `(Poke line pending: ${label} · ${key})`;
}
