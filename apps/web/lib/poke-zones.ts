// Pixel poke grid: 6 body tiers × 4 facing angles → 24 voice slots + motion recipes.
// Tier 6 (calf + foot): reaction voice only — feet stay planted, zero poke displacement.

import type { Lang } from './prefs';
import type { PokeBody, PokeDirection, TalkZone } from './poke-hit';
import { pokeBodyReaction } from './poke-hit';

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

export const POKE_ANGLES: readonly PokeDirection[] = ['front', 'left', 'back', 'right'] as const;

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
  /** When true, body stays still; only voice slot fires. */
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
  left: '左側',
  back: '背面',
  right: '右側',
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
      voiceOnly: tier === 'calf_foot',
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
  head: { head: 1, chest: 0.28, spine: 0.14, hip: 0.06, arm: 0.1, shift: 0.02 },
  shoulder_chest: { head: 0.22, chest: 1, spine: 0.62, hip: 0.28, arm: 0.85, shift: 0.05 },
  belly: { head: 0.1, chest: 0.42, spine: 1, hip: 0.52, arm: 0.22, shift: 0 },
  hip: { head: 0.06, chest: 0.22, spine: 0.48, hip: 1, arm: 0.14, shift: 0 },
  thigh: { head: 0.04, chest: 0.1, spine: 0.22, hip: 0.68, arm: 0.08, shift: 0.03 },
  calf_foot: { head: 0, chest: 0, spine: 0, hip: 0, arm: 0, shift: 0 },
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
 * Tier-aware punch recoil: opposite-side lean with tier falloff; tier 6 = no motion.
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
    // Soft opposite-side follow through the torso — same fall vector, low band scale.
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
