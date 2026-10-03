'use client';
// Personality layer (r2026-10-03.04): each character gets a curated idle-pose
// set (≥3 from the vrm-renderer library), a poke-reaction style, and her/his
// own idle dialogue bank. Deterministic, offline, localStorage-free.
import type { Lang } from './prefs';

/** pose ids from @amoji/vrm-renderer IDLE_POSES, curated per personality */
export const CHARACTER_POSES: Record<string, string[]> = {
  // warm, playful, a little cheeky — sways, leans in, confident
  juno: ['swaySoft', 'leanIn', 'headTilt', 'handsOnHips', 'weightShift'],
  // calm, thoughtful, quietly witty — ponders, drifts, unhurried
  nova: ['chinStroke', 'daydream', 'handsBehind', 'lookAround', 'stand'],
  // energetic, encouraging — bounces, stretches, shrugs, can't stand still
  blaze: ['bouncy', 'stretchUp', 'shoulderShrug', 'readyStance', 'lookUp'],
  // soft, sweet, a little shy — hugs herself, fidgets, tilts, gazes
  mochi: ['calmHug', 'fidget', 'headTilt', 'toeShift', 'dreamyTilt'],
  // cool-headed, dry humor — guarded, scans the room, unbothered
  kai: ['guardCross', 'lookAround', 'handsBehind', 'stand', 'confidentLean'],
  // dreamy, poetic, night owl — stars, daydreams, sways slow
  luna: ['stargaze', 'daydream', 'dreamyTilt', 'swaySoft', 'lookUp'],
  // sporty, sunny, refuses to lose — always ready, always stretching
  rin: ['readyStance', 'stretchSide', 'bouncy', 'weightShift', 'stretchUp'],
  // gentle, bookish, quietly devoted — self-hug, chin in hand, soft sway
  ren: ['calmHug', 'chinStroke', 'swaySoft', 'handsBehind', 'daydream'],
  // athletic, warm-hearted, fiercely loyal — fighter's idle set
  tifa: ['readyStance', 'handsOnHips', 'stretchSide', 'weightShift', 'guardCross'],
  // gentle flower girl, wise beyond years — dreamy tilts and soft sways
  aerith: ['dreamyTilt', 'swaySoft', 'stargaze', 'headTilt', 'leanIn'],
  // cool mercenary with a soft center — guarded, scanning, arms crossed
  cloud: ['guardCross', 'lookAround', 'handsBehind', 'stand', 'weightShift'],
  // graceful shinobi, kind underneath — poised, still, watchful
  kasumi: ['stand', 'handsBehind', 'lookAround', 'chinStroke', 'swaySoft'],
  // bubbly gyaru — bouncy, leaning, full of energy
  marin: ['bouncy', 'weightShift', 'leanIn', 'headTilt', 'stretchUp'],
  // cool kunoichi, sharp tongue — crossed arms, unimpressed scanning
  ayane: ['guardCross', 'crossedArms', 'lookAround', 'handsOnHips', 'stand'],
  // earnest, wholesome, quietly strong — ready stance + warm hugs
  hitomi: ['readyStance', 'calmHug', 'handsOnHips', 'stretchUp', 'swaySoft'],
  // big-brother energy — steady, warm, ready stance
  robbie: ['readyStance', 'handsOnHips', 'shoulderShrug', 'swaySoft', 'stand'],
  // laid-back musician — sways, chin in hand, dreamy
  mika: ['swaySoft', 'chinStroke', 'daydream', 'handsBehind', 'headTilt'],
  // old sea captain — anchored, scanning the horizon
  anchor: ['stand', 'handsBehind', 'lookAround', 'guardCross', 'chinStroke'],
  // elegant socialite — poised, graceful tilts
  lydia: ['swaySoft', 'headTilt', 'handsOnHips', 'dreamyTilt', 'leanIn'],
  // bouncy bunny — cannot stand still
  ruby: ['bouncy', 'toeShift', 'stretchUp', 'weightShift', 'lookUp'],
  // winter fairy — slow dreamy drift
  snowy: ['stargaze', 'calmHug', 'dreamyTilt', 'swaySoft', 'toeShift'],
};

export function poseIdsFor(characterId: string): string[] {
  return CHARACTER_POSES[characterId] ?? ['stand', 'headTilt', 'weightShift'];
}

/** how a character reacts to being poked — body + face flavor */
export interface PokeStyle {
  /** squash depth of the bounce (scene scale delta) */
  squash: number;
  /** extra twist on the surprised face (0 = neutral poke face) */
  twist: 'playful' | 'startled' | 'unimpressed' | 'flustered' | 'challenging';
  /** which expression leads the reaction */
  face: 'happy' | 'surprised' | 'angry' | 'relaxed';
}

export const POKE_STYLE: Record<string, PokeStyle> = {
  juno: { squash: 0.07, twist: 'playful', face: 'happy' },
  nova: { squash: 0.04, twist: 'unimpressed', face: 'surprised' },
  blaze: { squash: 0.09, twist: 'challenging', face: 'happy' },
  mochi: { squash: 0.1, twist: 'flustered', face: 'surprised' },
  kai: { squash: 0.03, twist: 'unimpressed', face: 'relaxed' },
  luna: { squash: 0.05, twist: 'flustered', face: 'happy' },
  rin: { squash: 0.06, twist: 'challenging', face: 'happy' },
  ren: { squash: 0.04, twist: 'flustered', face: 'surprised' },
  tifa: { squash: 0.06, twist: 'challenging', face: 'happy' },
  aerith: { squash: 0.05, twist: 'playful', face: 'happy' },
  cloud: { squash: 0.02, twist: 'unimpressed', face: 'relaxed' },
  kasumi: { squash: 0.04, twist: 'startled', face: 'surprised' },
  marin: { squash: 0.08, twist: 'playful', face: 'happy' },
  ayane: { squash: 0.03, twist: 'unimpressed', face: 'angry' },
  hitomi: { squash: 0.05, twist: 'startled', face: 'happy' },
  robbie: { squash: 0.06, twist: 'playful', face: 'happy' },
  mika: { squash: 0.04, twist: 'unimpressed', face: 'relaxed' },
  anchor: { squash: 0.02, twist: 'unimpressed', face: 'relaxed' },
  lydia: { squash: 0.05, twist: 'playful', face: 'surprised' },
  ruby: { squash: 0.1, twist: 'startled', face: 'surprised' },
  snowy: { squash: 0.06, twist: 'flustered', face: 'surprised' },
};

export function pokeStyleFor(characterId: string): PokeStyle {
  return POKE_STYLE[characterId] ?? { squash: 0.07, twist: 'playful', face: 'surprised' };
}

/** per-character body look (r2026-10-03.28): material tint + build, applied
 *  to the shared open-license VRM so each character reads as her/his own
 *  person in the 3D scene until per-character drop-in models ship
 *  (CharacterDef.model under /models). Tints are near-white on purpose —
 *  multiplied into every material, they shift the whole palette without
 *  wrecking skin tones. */
export interface CharacterLook {
  /** near-white hex multiplied into every material — gentle color identity */
  tint: string;
  /** vertical scale (height) */
  height: number;
  /** horizontal scale (shoulders / build) */
  width: number;
}

export const CHARACTER_LOOKS: Record<string, CharacterLook> = {
  juno:   { tint: '#ffd9ec', height: 1.0,  width: 0.97 },
  nova:   { tint: '#dfe3ff', height: 1.01, width: 0.96 },
  blaze:  { tint: '#ffe3c2', height: 1.07, width: 1.08 },
  mochi:  { tint: '#fff3cf', height: 0.94, width: 0.95 },
  kai:    { tint: '#d3ecff', height: 1.05, width: 1.04 },
  luna:   { tint: '#ecd9ff', height: 1.0,  width: 0.95 },
  rin:    { tint: '#d2f5ef', height: 0.98, width: 0.94 },
  ren:    { tint: '#dde1ff', height: 1.03, width: 1.0 },
  tifa:   { tint: '#ffd9d9', height: 1.02, width: 1.02 },
  aerith: { tint: '#ffe0ee', height: 0.99, width: 0.96 },
  cloud:  { tint: '#d6e6ff', height: 1.08, width: 1.06 },
  kasumi: { tint: '#d9f1ff', height: 1.0,  width: 0.95 },
  marin:  { tint: '#ffd9e8', height: 0.98, width: 0.97 },
  ayane:  { tint: '#e6d4ff', height: 1.01, width: 0.96 },
  hitomi: { tint: '#d9f5d9', height: 1.0,  width: 1.0 },
  robbie: { tint: '#ffe9c2', height: 1.06, width: 1.06 },
  mika:   { tint: '#d2f5e3', height: 1.02, width: 0.98 },
  anchor: { tint: '#cfe8ff', height: 1.07, width: 1.05 },
  lydia:  { tint: '#f6d9ff', height: 1.0,  width: 0.95 },
  ruby:   { tint: '#ffd9e0', height: 0.94, width: 0.94 },
  snowy:  { tint: '#e2f2ff', height: 0.96, width: 0.95 },
};

export function lookFor(characterId: string): CharacterLook {
  return CHARACTER_LOOKS[characterId] ?? { tint: '#ffffff', height: 1, width: 1 };
}
