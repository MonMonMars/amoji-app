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
};

export function pokeStyleFor(characterId: string): PokeStyle {
  return POKE_STYLE[characterId] ?? { squash: 0.07, twist: 'playful', face: 'surprised' };
}
