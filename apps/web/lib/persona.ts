'use client';
// Personality layer (r2026-10-03.04): each character gets a curated idle-pose
// set (≥3 from the vrm-renderer library), a poke-reaction style, and her/his
// own idle dialogue bank. Deterministic, offline, localStorage-free.
// r2026-10-04.52: flagship nine from the agent3 gallery (kizuna/alicia/ember/
// mei/atlas/sky/yuki/hina/mio) get poses, poke styles and looks; tifa/aerith
// retire from the cast.
// r2026-10-04.77 (Master Simon): tints pushed hard toward white — the warm
// peach tints multiplied into every material (skin included) and made the
// whole cast look orange under the light rig. Near-white keeps a whisper of
// per-character hue without any cast.
// r2026-10-04.83 (Master Simon): the poke no longer squash-deforms realistic
// humans — mesh deform reads as rubber on a human body. Humans recoil via
// SKELETON rotation; deform is kept only for the chibi cast (mochi), where
// cartoon physics is exactly the look.
import type { Lang } from './prefs';

/** pose ids from @amoji/vrm-renderer IDLE_POSES, curated per personality */
export const CHARACTER_POSES: Record<string, string[]> = {
  // ---- flagship nine (r2026-10-04.52): agent3 gallery #2–#10 ----------------
  // genki idol — bouncy, stage-ready, can't stop moving
  kizuna: ['bouncy', 'stretchUp', 'readyStance', 'lookUp', 'leanIn'],
  // classic idol — polished tilts and graceful leans
  alicia: ['bouncy', 'headTilt', 'leanIn', 'handsOnHips', 'swaySoft'],
  // fiery streamer — hands on hips, full of heat
  ember: ['bouncy', 'handsOnHips', 'stretchUp', 'weightShift', 'leanIn'],
  // warm sweetheart — soft sways and gentle tilts
  mei: ['swaySoft', 'headTilt', 'calmHug', 'dreamyTilt', 'toeShift'],
  // silent guardian (male) — steady, watchful, minimal motion
  atlas: ['stand', 'handsBehind', 'guardCross', 'confidentLean', 'lookAround'],
  // laid-back fashionista — unbothered weight shifts
  sky: ['weightShift', 'handsOnHips', 'lookAround', 'confidentLean', 'swaySoft'],
  // sunny sportswoman — always warming up
  yuki: ['readyStance', 'bouncy', 'stretchSide', 'weightShift', 'lookUp'],
  // bookish poet — chin in hand, half a daydream away
  hina: ['swaySoft', 'chinStroke', 'handsBehind', 'daydream', 'headTilt'],
  // project-lead go-getter — efficient, composed, ready
  mio: ['stand', 'handsOnHips', 'chinStroke', 'lookAround', 'confidentLean'],
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
  // easygoing best mate — relaxed sways and shrugs, hands behind the back
  alan: ['swaySoft', 'handsBehind', 'shoulderShrug', 'stand', 'chinStroke'],
  // remote community cast (r2026-10-05.104)
  aera: ['swaySoft', 'headTilt', 'daydream', 'dreamyTilt', 'lookUp'], dhahlia: ['bouncy', 'leanIn', 'stretchUp', 'lookUp', 'weightShift'], onyx: ['stand', 'handsBehind', 'guardCross', 'lookAround', 'confidentLean'], velara: ['handsBehind', 'chinStroke', 'stargaze', 'swaySoft', 'lookAround'],
  // bright gyaru cosplayer — bouncy, leans in, strikes a pose (r110)
  kitagawa: ['bouncy', 'leanIn', 'weightShift', 'confidentLean', 'headTilt'],
};

export function poseIdsFor(characterId: string): string[] {
  return CHARACTER_POSES[characterId] ?? ['stand', 'headTilt', 'weightShift'];
}

/** how a character reacts to being poked — body + face flavor */
export interface PokeStyle {
  /** squash depth of the bounce (scene scale delta) — CHIBI (deform) mode only;
   *  human characters recoil via skeleton rotation and ignore this number */
  squash: number;
  /** extra twist on the surprised face (0 = neutral poke face) */
  twist: 'playful' | 'startled' | 'unimpressed' | 'flustered' | 'challenging';
  /** which expression leads the reaction */
  face: 'happy' | 'surprised' | 'angry' | 'relaxed';
}

export const POKE_STYLE: Record<string, PokeStyle> = {
  kizuna: { squash: 0.09, twist: 'playful', face: 'happy' },
  alicia: { squash: 0.08, twist: 'playful', face: 'surprised' },
  ember: { squash: 0.09, twist: 'challenging', face: 'happy' },
  mei: { squash: 0.07, twist: 'flustered', face: 'surprised' },
  atlas: { squash: 0.03, twist: 'unimpressed', face: 'relaxed' },
  sky: { squash: 0.04, twist: 'unimpressed', face: 'surprised' },
  yuki: { squash: 0.06, twist: 'playful', face: 'happy' },
  hina: { squash: 0.04, twist: 'flustered', face: 'surprised' },
  mio: { squash: 0.03, twist: 'challenging', face: 'relaxed' },
  juno: { squash: 0.07, twist: 'playful', face: 'happy' },
  nova: { squash: 0.04, twist: 'unimpressed', face: 'surprised' },
  blaze: { squash: 0.09, twist: 'challenging', face: 'happy' },
  mochi: { squash: 0.1, twist: 'flustered', face: 'surprised' },
  kai: { squash: 0.03, twist: 'unimpressed', face: 'relaxed' },
  luna: { squash: 0.05, twist: 'flustered', face: 'happy' },
  rin: { squash: 0.06, twist: 'challenging', face: 'happy' },
  ren: { squash: 0.04, twist: 'flustered', face: 'surprised' },
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
  alan: { squash: 0.07, twist: 'playful', face: 'happy' },
  // remote community cast (r2026-10-05.104)
  aera: { squash: 0.04, twist: 'flustered', face: 'surprised' }, dhahlia: { squash: 0.07, twist: 'playful', face: 'happy' }, onyx: { squash: 0.02, twist: 'unimpressed', face: 'relaxed' }, velara: { squash: 0.03, twist: 'startled', face: 'surprised' },
  kitagawa: { squash: 0.08, twist: 'playful', face: 'happy' },
};

export function pokeStyleFor(characterId: string): PokeStyle {
  return POKE_STYLE[characterId] ?? { squash: 0.07, twist: 'playful', face: 'surprised' };
}

/** r83 (Master Simon): realistic humans recoil with SKELETON rotation — mesh
 *  squash-deform reads as rubber on a human body. Deform stays only for the
 *  chibi cast, where cartoon physics is exactly the look that feels right.
 *  Add ids here to grant a character the deform poke. */
export const CHIBI_CHARACTERS: string[] = ['mochi'];

export type PokeMode = 'skeleton' | 'deform';

/** how this character's body takes a poke: skeleton recoil, or chibi deform */
export function pokeModeFor(characterId: string): PokeMode {
  return CHIBI_CHARACTERS.includes(characterId) ? 'deform' : 'skeleton';
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
  kizuna: { tint: '#fff6f2', height: 0.98, width: 0.96 },
  alicia: { tint: '#fff4f7', height: 0.98, width: 0.95 },
  ember:  { tint: '#fff4f1', height: 1.0,  width: 0.97 },
  mei:    { tint: '#fff7f9', height: 0.97, width: 0.95 },
  atlas:  { tint: '#f3fcf8', height: 1.07, width: 1.06 },
  sky:    { tint: '#f7f4fd', height: 1.0,  width: 0.96 },
  yuki:   { tint: '#fff6f8', height: 0.98, width: 0.95 },
  hina:   { tint: '#fff7f9', height: 1.0,  width: 0.95 },
  mio:    { tint: '#f5faff', height: 1.01, width: 0.97 },
  juno:   { tint: '#fff4f9', height: 1.0,  width: 0.97 },
  nova:   { tint: '#f5f7ff', height: 1.01, width: 0.96 },
  blaze:  { tint: '#fff7ed', height: 1.07, width: 1.08 },
  mochi:  { tint: '#fffff1', height: 0.94, width: 0.95 },
  kai:    { tint: '#f2f9ff', height: 1.05, width: 1.04 },
  luna:   { tint: '#f9f4ff', height: 1.0,  width: 0.95 },
  rin:    { tint: '#f2fcfa', height: 0.98, width: 0.94 },
  ren:    { tint: '#f5f6ff', height: 1.03, width: 1.0 },
  cloud:  { tint: '#f3f8ff', height: 1.08, width: 1.06 },
  kasumi: { tint: '#f4fbff', height: 1.0,  width: 0.95 },
  marin:  { tint: '#fff4f8', height: 0.98, width: 0.97 },
  ayane:  { tint: '#f8f2ff', height: 1.01, width: 0.96 },
  hitomi: { tint: '#f4fcf4', height: 1.0,  width: 1.0 },
  robbie: { tint: '#fff8ed', height: 1.06, width: 1.06 },
  mika:   { tint: '#f2fcf7', height: 1.02, width: 0.98 },
  anchor: { tint: '#f1f8ff', height: 1.07, width: 1.05 },
  lydia:  { tint: '#fcf4ff', height: 1.0,  width: 0.95 },
  ruby:   { tint: '#fff4f6', height: 0.94, width: 0.94 },
  snowy:  { tint: '#f6fbff', height: 0.96, width: 0.95 },
  alan:   { tint: '#f2fbf3', height: 1.04, width: 1.03 },
  // remote community cast (r2026-10-05.104)
  aera: { tint: '#f6f3ff', height: 1.0, width: 0.95 }, dhahlia: { tint: '#fff4f8', height: 0.98, width: 0.96 }, onyx: { tint: '#eef1f8', height: 1.07, width: 1.05 }, velara: { tint: '#f2fbf7', height: 1.01, width: 0.96 },
  kitagawa: { tint: '#fff0f5', height: 1.0, width: 0.94 },
};

export function lookFor(characterId: string): CharacterLook {
  return CHARACTER_LOOKS[characterId] ?? { tint: '#ffffff', height: 1, width: 1 };
}
