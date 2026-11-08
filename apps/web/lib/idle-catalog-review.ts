// Pixel Designer review (2026-11-08): permanent record keyed by library # + clipId.
// See also docs/idle-pixel-review.md

import { CHAT_IDLE_CURATED } from './idle-curated-rail';
import { IDLE_LIBRARY, idleByNum } from './idle-library';
import {
  IDLE_PIN_FALLBACK_CLIP_ID,
  RETIRED_IDLE_CLIP_IDS,
  RETIRED_IDLE_NUMS,
  isRetiredIdleClip,
  isRetiredIdleNum,
  resolveIdleClipId,
} from './idle-retired';

export {
  IDLE_PIN_FALLBACK_CLIP_ID,
  RETIRED_IDLE_CLIP_IDS,
  RETIRED_IDLE_NUMS,
  isRetiredIdleClip,
  isRetiredIdleNum,
  resolveIdleClipId,
} from './idle-retired';

export type PixelIdleVerdict =
  | 'keep-curated'
  | 'keep-library'
  | 'delete'
  | 'grey'
  | 'blend-bad';

export interface PixelIdleReviewRow {
  libNum: number;
  clipId: string;
  verdict: PixelIdleVerdict;
  note: string;
}

const CURATED_LEGACY_LIB_NUMS = new Set(CHAT_IDLE_CURATED.map((e) => e.legacyLibNum));

/** Pixel #94–118 highlight keeps (designer notes). */
export const PIXEL_IDLE_REVIEW_KEEPS: Readonly<
  Record<number, { note: string; highlight?: boolean }>
> = {
  94: { note: 'Look forward → sudden L/R upward (bird/plane)', highlight: true },
  95: { note: 'Neck stretch L/R', highlight: true },
  101: { note: 'Robot dance', highlight: true },
  102: { note: 'Finger point top, slow body swing — slow jazz concert', highlight: true },
  103: { note: 'Fast music arm swing — hip hop', highlight: true },
  104: { note: 'Jazz-like arm move; hands press front buttons', highlight: true },
  108: { note: 'Hands up, funny crying', highlight: true },
  109: { note: 'Big arm up hurray/yeah', highlight: true },
  110: { note: 'Scared → mad, hands on hip angry', highlight: true },
  111: { note: 'Head bow — sorry / JP bow', highlight: true },
  112: { note: 'Two fists up — add oil OR very angry', highlight: true },
  113: { note: 'Slow big arm dance — slow singing', highlight: true },
  114: { note: 'Tai chi / slow kung fu', highlight: true },
  115: { note: 'JP sword pull from waist, sheath back', highlight: true },
  116: { note: 'Sword front pull, point top', highlight: true },
  117: {
    note: 'Hands cover head; sudden L hand forward — keep; prefer subtle breath overlay if layered',
    highlight: true,
  },
  118: {
    note: 'Same as #117 (identical catalog treatment) — subtle breath if breath layer applies',
    highlight: true,
  },
};

/** Designer notes #1–93 (batch review + engineering triage). */
const PIXEL_NOTES_1_93: Readonly<Partial<Record<number, string>>> = {
  1: 'Calm breath default — soften military straight stance in mixer (spine/arms).',
  2: 'Standard idle — same soften pass as #1; chat default rotation.',
  3: 'Look around — subtle head/body; KEEP curated look.',
  4: 'UAL1 loop clip-through — grey; not playable.',
  5: 'KayKit idle — casual breathe candidate; curated rail.',
  6: 'Folded arms — library only; not curated.',
  7: 'Bored — casual stand; curated breathe.',
  8: 'Arguing — too expressive for default rail.',
  9: 'Chatting — library.',
  10: 'Chatting02 — library.',
  11: 'Conversation loop — library.',
  12: 'Listening to music — library.',
  13: 'LookingAround02 — distinct from #3; curated look.',
  14: 'DELETE — watching something loop; retired.',
  15: 'Hello wave — library gesture.',
  16: 'Female stand — library.',
  17: 'Male stand gesture — library.',
  18: 'Thinking — curated think rail.',
  19: 'Waving — library.',
  20: 'Thumbs up — curated react.',
  21: 'Clapping — soften hands in mixer; library.',
  22: 'Victory cheer — add oil reaction; curated react.',
  23: 'Defeat — library.',
  24: 'DELETE — UAL1 talking blend-bad; retired.',
  25: 'DELETE — ninja idle blend-bad; retired.',
  26: 'Kenney stand — library breathe alt.',
  27: 'PSX gif-only — grey.',
  28: 'PSX gif-only — grey.',
  29: 'PSX gif-only — grey.',
  30: 'PSX gif-only — grey.',
  31: 'Squad gif-only — grey.',
  32: 'Relax / stretch — fix arm-down if layered; curated stretch.',
  33: 'Neutral breathe — curated; not default rotation.',
  34: 'Sassy think pose — curated think.',
  35: 'Chin hand — old bad default pin; library only.',
  36: 'Hug slow — curated sing/slow.',
  37: 'Kaykit A — grey convert; retired.',
  38: 'Kaykit B — grey convert; retired.',
  39: 'Quaternius human — casual breathe; curated.',
  40: 'Mixamo breathing — curated breathe.',
  41: 'Happy idle slow sing — curated.',
  42: 'RPM F standing — normal idle breathe; curated.',
  43: 'RPM F var1 — breathe; curated.',
  44: 'RPM F var2 — library.',
  45: 'RPM F var3 subtle look — curated.',
  46: 'RPM F var4 subtle look — curated.',
  47: 'DELETE — lean wall float/blend-bad; retired.',
  48: 'DELETE — pointing blend-bad; retired.',
  49: 'Sad idle — library.',
  50: 'Mixamo standing FLOAT — library smoke only.',
  51: 'Agreeing FLOAT — library.',
  52: 'Excited FLOAT — soften arms when used.',
  53: 'Arm stretch — curated stretch.',
  54: 'DELETE — ThreeJS soldier; retired.',
  55: 'DELETE — KayKit wave idol flash; retired.',
  56: 'DELETE — KayKit cheer idol flash; retired.',
  57: 'DELETE — UAL2 yes flash; retired.',
  58: 'DELETE — UAL2 no flash; retired.',
  59: 'DELETE — phone idle flash; retired.',
  60: 'Lantern — library.',
  61: 'KayKit laying — not standing breathe.',
  62: 'KayKit interact — library.',
  63: 'UAL2 consume — library.',
  64: 'UAL2 rail — library.',
  65: 'UAL2 rail call — library.',
  66: 'UAL2 chest — library.',
  67: 'Zombie idle — library.',
  68: 'Zombie scratch — library.',
  69: 'Farm harvest — library.',
  70: 'Shield idle — library.',
  71: 'Farm plant — library.',
  72: 'Farm water — library.',
  73: 'Tree chop — library.',
  74: 'UAL1 torch — library.',
  75: 'Pistol idle — library.',
  76: 'Sword idle — library.',
  77: 'Spell idle — library.',
  78: 'Interact — library.',
  79: 'Crouch — library.',
  80: 'Sitting — library.',
  81: 'Sitting talk — library.',
  82: 'Swim — library.',
  83: 'Driving — library.',
  84: 'Kneeling fix — library.',
  85: 'Push — library.',
  86: 'Pick up — library.',
  87: 'Hype man — library perform.',
  88: 'DJ — library perform.',
  89: 'DJ02 — library perform.',
  90: 'Innerscene Sam CC0 breathe — curated.',
  91: 'Innerscene Harper — library breathe alt.',
  92: 'Innerscene Maya — library breathe alt.',
  93: 'RPM M standing — curated breathe.',
};

function verdictForLibNum(libNum: number, entry: (typeof IDLE_LIBRARY)[number]): PixelIdleVerdict {
  if (RETIRED_IDLE_NUMS.has(libNum) || entry.retired) {
    if ([14, 24, 25, 47, 48, 54].includes(libNum)) return 'delete';
    if ([55, 56, 57, 58, 59, 96, 97, 98, 99, 100, 105, 106, 107].includes(libNum)) return 'grey';
    return 'blend-bad';
  }
  if (CURATED_LEGACY_LIB_NUMS.has(libNum)) return 'keep-curated';
  if (PIXEL_IDLE_REVIEW_KEEPS[libNum]) return 'keep-library';
  if (!entry.playable || !entry.vrmaUrl) return 'grey';
  return 'keep-library';
}

/** Full #1–118 Pixel record (generated from library + notes). */
export const PIXEL_IDLE_REVIEW: readonly PixelIdleReviewRow[] = IDLE_LIBRARY.map((e) => {
  const keepNote = PIXEL_IDLE_REVIEW_KEEPS[e.num]?.note;
  const note =
    keepNote
    ?? PIXEL_NOTES_1_93[e.num]
    ?? (e.retired ? 'Retired from picker — library archive row.' : 'Library-only playable.');
  return {
    libNum: e.num,
    clipId: e.clipId,
    verdict: verdictForLibNum(e.num, e),
    note,
  };
});

/** Legacy saved enable/pin: library # as string → clipId (or fallback). */
export function resolveLegacyLibPin(stored: string): string {
  const n = Number(stored);
  if (!Number.isInteger(n) || n < 1) return resolveIdleClipId(stored);
  const row = idleByNum(n);
  if (!row) return IDLE_PIN_FALLBACK_CLIP_ID;
  if (isRetiredIdleNum(n) || row.retired) return IDLE_PIN_FALLBACK_CLIP_ID;
  const curated = CHAT_IDLE_CURATED.find((r) => r.legacyLibNum === n);
  if (curated) return curated.clipId;
  return resolveIdleClipId(row.clipId);
}

export function curatedRailCount(): number {
  return CHAT_IDLE_CURATED.length;
}

export function countRetiredLibraryRows(): number {
  return IDLE_LIBRARY.filter((e) => e.retired || RETIRED_IDLE_NUMS.has(e.num) || !e.playable).length;
}
