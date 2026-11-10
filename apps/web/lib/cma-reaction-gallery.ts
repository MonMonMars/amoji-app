// CMA00304-CMA00349 Reaction SFX gallery catalog + Want/Skip picks.
// Wired: Wanted codes feed recordedLaughClip / recordedPokeClip at play time.
// Skip and undecided never enter the play pool. Assets under public/voice-clips/cma-reaction/.
// Mon EmotionClipRow female-view #1–11 dropped (bad laughs/gasps/hiccups/yawns); CMA codes stay stable.

export const CMA_REACTION_GALLERY_KEY = 'amoji.cmaReactionSfx.picks.v1';
export const CMA_REACTION_RANGE = { from: 304, to: 349 } as const;

/** Female-view EmotionClipRow #1–11 — removed from ship-set + disk. Codes kept for docs/history. */
export const CMA_REACTION_DROPPED_CODES = [
  'CMA00304', // #1 female laugh
  'CMA00305', // #2 female laugh
  'CMA00309', // #3 female gasp
  'CMA00310', // #4 female gasp
  'CMA00311', // #5 female hiccup
  'CMA00312', // #6 female hiccup
  'CMA00313', // #7 female hiccup
  'CMA00314', // #8 female yawn
  'CMA00315', // #9 female yawn
  'CMA00316', // #10 female yawn
  'CMA00319', // #11 female laugh
] as const;

export type CmaReactionVerdict = 'want' | 'skip' | 'undecided';

export interface CmaReactionClip {
  code: string;
  /** Filename under /voice-clips/cma-reaction/ */
  file: string;
  lang: string;
  gender: 'female' | 'male';
  burst: string;
  use: string;
  license: string;
  source: string;
  durationSec: number;
}

/** Ship-set for in-app Want/Skip. CMA00304–349 minus CMA_REACTION_DROPPED_CODES. */
export const CMA_REACTION_GALLERY: readonly CmaReactionClip[] = [
  {
    code: "CMA00306",
    file: "CMA00306_universal_male_ha_chuckle.mp3",
    lang: "universal",
    gender: "male",
    burst: "ha",
    use: "reaction",
    license: "CC0 1.0",
    source: "SFXMint man-chuckle-06",
    durationSec: 2.456,
  },
  {
    code: "CMA00307",
    file: "CMA00307_universal_male_ha_chuckle.mp3",
    lang: "universal",
    gender: "male",
    burst: "ha",
    use: "reaction",
    license: "CC0 1.0",
    source: "SFXMint man-chuckle-07",
    durationSec: 2.011,
  },
  {
    code: "CMA00308",
    file: "CMA00308_universal_male_laugh_chuckle.mp3",
    lang: "universal",
    gender: "male",
    burst: "laugh",
    use: "reaction",
    license: "CC0 1.0",
    source: "SFXMint man-chuckle-08",
    durationSec: 2.116,
  },
  {
    code: "CMA00317",
    file: "CMA00317_universal_male_ouch_effort.mp3",
    lang: "universal",
    gender: "male",
    burst: "ouch",
    use: "poke",
    license: "CC0 1.0",
    source: "SFXMint exertion-grunt",
    durationSec: 1.646,
  },
  {
    code: "CMA00318",
    file: "CMA00318_universal_male_effort.mp3",
    lang: "universal",
    gender: "male",
    burst: "effort",
    use: "poke",
    license: "CC0 1.0",
    source: "SFXMint exertion-breathing",
    durationSec: 2.038,
  },
  {
    code: "CMA00320",
    file: "CMA00320_universal_female_giggle.mp3",
    lang: "universal",
    gender: "female",
    burst: "giggle",
    use: "reaction",
    license: "CC0",
    source: "StoryCut/Freesound BlueSiren 377742 girl chuckle",
    durationSec: 2.247,
  },
  {
    code: "CMA00321",
    file: "CMA00321_universal_male_laugh.mp3",
    lang: "universal",
    gender: "male",
    burst: "laugh",
    use: "reaction",
    license: "CC0",
    source: "StoryCut/Freesound dastudiospr 529818 man laughing",
    durationSec: 2.429,
  },
  {
    code: "CMA00322",
    file: "CMA00322_universal_male_groan_laugh.mp3",
    lang: "universal",
    gender: "male",
    burst: "groan",
    use: "reaction",
    license: "CC0",
    source: "StoryCut/Freesound jayfrosting 333403 dad-joke groan-laugh",
    durationSec: 2.351,
  },
  {
    code: "CMA00323",
    file: "CMA00323_universal_male_laugh_deep.mp3",
    lang: "universal",
    gender: "male",
    burst: "laugh",
    use: "reaction",
    license: "CC0",
    source: "StoryCut/Freesound Eneasz 119459 deep male laughter",
    durationSec: 2.351,
  },
  {
    code: "CMA00324",
    file: "CMA00324_universal_female_gasp_shocked.mp3",
    lang: "universal",
    gender: "female",
    burst: "gasp",
    use: "reaction",
    license: "Mixkit Free SFX",
    source: "Mixkit 378",
    durationSec: 1.228,
  },
  {
    code: "CMA00325",
    file: "CMA00325_universal_female_gasp_surprised.mp3",
    lang: "universal",
    gender: "female",
    burst: "gasp",
    use: "reaction",
    license: "Mixkit Free SFX",
    source: "Mixkit 379",
    durationSec: 1.228,
  },
  {
    code: "CMA00326",
    file: "CMA00326_universal_female_gasp_astonished.mp3",
    lang: "universal",
    gender: "female",
    burst: "gasp",
    use: "reaction",
    license: "Mixkit Free SFX",
    source: "Mixkit 963",
    durationSec: 1.228,
  },
  {
    code: "CMA00327",
    file: "CMA00327_universal_male_gasp_astonished.mp3",
    lang: "universal",
    gender: "male",
    burst: "gasp",
    use: "reaction",
    license: "Mixkit Free SFX",
    source: "Mixkit 967",
    durationSec: 1.123,
  },
  {
    code: "CMA00328",
    file: "CMA00328_universal_male_effort_scared_breath.mp3",
    lang: "universal",
    gender: "male",
    burst: "effort",
    use: "poke",
    license: "Mixkit Free SFX",
    source: "Mixkit 965",
    durationSec: 1.123,
  },
  {
    code: "CMA00329",
    file: "CMA00329_universal_male_gasp_old.mp3",
    lang: "universal",
    gender: "male",
    burst: "gasp",
    use: "reaction",
    license: "Mixkit Free SFX",
    source: "Mixkit 1969",
    durationSec: 1.489,
  },
  {
    code: "CMA00330",
    file: "CMA00330_universal_male_yawn.mp3",
    lang: "universal",
    gender: "male",
    burst: "yawn",
    use: "reaction",
    license: "Mixkit Free SFX",
    source: "Mixkit 2276",
    durationSec: 2.429,
  },
  {
    code: "CMA00331",
    file: "CMA00331_universal_male_yawn_sleepy.mp3",
    lang: "universal",
    gender: "male",
    burst: "yawn",
    use: "reaction",
    license: "Mixkit Free SFX",
    source: "Mixkit 2468",
    durationSec: 2.429,
  },
  {
    code: "CMA00332",
    file: "CMA00332_universal_female_yawn_cartoon.mp3",
    lang: "universal",
    gender: "female",
    burst: "yawn",
    use: "reaction",
    license: "Mixkit Free SFX",
    source: "Mixkit 2216",
    durationSec: 1.541,
  },
  {
    code: "CMA00333",
    file: "CMA00333_universal_male_yawn_tired.mp3",
    lang: "universal",
    gender: "male",
    burst: "yawn",
    use: "reaction",
    license: "Mixkit Free SFX",
    source: "Mixkit 2231",
    durationSec: 1.933,
  },
  {
    code: "CMA00334",
    file: "CMA00334_universal_female_yawn_cartoon2.mp3",
    lang: "universal",
    gender: "female",
    burst: "yawn",
    use: "reaction",
    license: "Mixkit Free SFX",
    source: "Mixkit 2661",
    durationSec: 1.176,
  },
  {
    code: "CMA00335",
    file: "CMA00335_universal_female_ouch_ah.mp3",
    lang: "universal",
    gender: "female",
    burst: "ouch",
    use: "poke",
    license: "Mixkit Free SFX",
    source: "Mixkit 2204",
    durationSec: 0.522,
  },
  {
    code: "CMA00336",
    file: "CMA00336_universal_male_ouch_ow.mp3",
    lang: "universal",
    gender: "male",
    burst: "ouch",
    use: "poke",
    license: "Mixkit Free SFX",
    source: "Mixkit 2205",
    durationSec: 1.149,
  },
  {
    code: "CMA00337",
    file: "CMA00337_universal_male_ouch_ow.mp3",
    lang: "universal",
    gender: "male",
    burst: "ouch",
    use: "poke",
    license: "Mixkit Free SFX",
    source: "Mixkit 2278",
    durationSec: 1.541,
  },
  {
    code: "CMA00338",
    file: "CMA00338_universal_male_ha_dwarf.mp3",
    lang: "universal",
    gender: "male",
    burst: "ha",
    use: "reaction",
    license: "Mixkit Free SFX",
    source: "Mixkit 10",
    durationSec: 1.541,
  },
  {
    code: "CMA00339",
    file: "CMA00339_universal_male_ouch.mp3",
    lang: "universal",
    gender: "male",
    burst: "ouch",
    use: "poke",
    license: "CC0",
    source: "OGA HaelDB yelling sounds 3grunt1.wav",
    durationSec: 0.993,
  },
  {
    code: "CMA00340",
    file: "CMA00340_universal_male_yelp.mp3",
    lang: "universal",
    gender: "male",
    burst: "yelp",
    use: "poke",
    license: "CC0",
    source: "OGA HaelDB yelling sounds 3grunt2.wav",
    durationSec: 0.993,
  },
  {
    code: "CMA00341",
    file: "CMA00341_universal_male_ouch.mp3",
    lang: "universal",
    gender: "male",
    burst: "ouch",
    use: "poke",
    license: "CC0",
    source: "OGA HaelDB yelling sounds 3grunt3.wav",
    durationSec: 0.549,
  },
  {
    code: "CMA00342",
    file: "CMA00342_universal_male_yelp.mp3",
    lang: "universal",
    gender: "male",
    burst: "yelp",
    use: "poke",
    license: "CC0",
    source: "OGA HaelDB yelling sounds 3grunt4.wav",
    durationSec: 0.549,
  },
  {
    code: "CMA00343",
    file: "CMA00343_universal_male_ouch.mp3",
    lang: "universal",
    gender: "male",
    burst: "ouch",
    use: "poke",
    license: "CC0",
    source: "OGA HaelDB yelling sounds 3grunt5.wav",
    durationSec: 0.549,
  },
  {
    code: "CMA00344",
    file: "CMA00344_universal_male_yelp.mp3",
    lang: "universal",
    gender: "male",
    burst: "yelp",
    use: "poke",
    license: "CC0",
    source: "OGA HaelDB yelling sounds 3grunt6.wav",
    durationSec: 0.993,
  },
  {
    code: "CMA00345",
    file: "CMA00345_universal_male_laugh_oga0.mp3",
    lang: "universal",
    gender: "male",
    burst: "laugh",
    use: "reaction",
    license: "CC0",
    source: "OGA Supergeek ogalaughter_2 seg0",
    durationSec: 0.444,
  },
  {
    code: "CMA00346",
    file: "CMA00346_universal_male_ha_oga1.mp3",
    lang: "universal",
    gender: "male",
    burst: "ha",
    use: "reaction",
    license: "CC0",
    source: "OGA Supergeek ogalaughter_2 seg1",
    durationSec: 0.731,
  },
  {
    code: "CMA00347",
    file: "CMA00347_universal_male_laugh_oga2.mp3",
    lang: "universal",
    gender: "male",
    burst: "laugh",
    use: "reaction",
    license: "CC0",
    source: "OGA Supergeek ogalaughter_2 seg2",
    durationSec: 0.601,
  },
  {
    code: "CMA00348",
    file: "CMA00348_universal_male_ha_oga3.mp3",
    lang: "universal",
    gender: "male",
    burst: "ha",
    use: "reaction",
    license: "CC0",
    source: "OGA Supergeek ogalaughter_2 seg3",
    durationSec: 0.47,
  },
  {
    code: "CMA00349",
    file: "CMA00349_universal_male_laugh_oga4.mp3",
    lang: "universal",
    gender: "male",
    burst: "laugh",
    use: "reaction",
    license: "CC0",
    source: "OGA Supergeek ogalaughter_2 seg4",
    durationSec: 0.575,
  },
] as const;

export function cmaReactionPath(file: string): string {
  // Pages deploy sets NEXT_PUBLIC_BASE_PATH=/amoji-app; local/dev leaves it empty.
  // Inline (do not import asset.ts — that module is 'use client').
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return base + '/voice-clips/cma-reaction/' + file;
}

export function cmaReactionByCode(code: string): CmaReactionClip | null {
  return CMA_REACTION_GALLERY.find((c) => c.code === code) ?? null;
}

export function listCmaReactionCodes(): string[] {
  return CMA_REACTION_GALLERY.map((c) => c.code);
}

export function expectedCmaReactionCodes(): string[] {
  const dropped = new Set<string>(CMA_REACTION_DROPPED_CODES);
  const out: string[] = [];
  for (let n = CMA_REACTION_RANGE.from; n <= CMA_REACTION_RANGE.to; n++) {
    const code = 'CMA' + String(n).padStart(5, '0');
    if (dropped.has(code)) continue;
    out.push(code);
  }
  return out;
}

export function missingCmaReactionCodes(): string[] {
  const have = new Set(listCmaReactionCodes());
  return expectedCmaReactionCodes().filter((c) => !have.has(c));
}

type PickMap = Record<string, CmaReactionVerdict>;

let memory: PickMap = {};
let loaded = false;

/** Fail-closed parse of localStorage JSON. Wrong shape / corrupt → empty picks. */
export function parseCmaReactionPicksJson(raw: string | null | undefined): PickMap {
  if (raw == null || raw === '') return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    // Arrays / primitives / null are wrong-shaped — never throw, never apply.
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const next: PickMap = {};
    for (const [code, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!cmaReactionByCode(code)) continue; // unknown / missing-from-catalog ids dropped
      if (v === 'want' || v === 'skip') next[code] = v;
      // 'undecided' and anything else are ignored (undecided = absent)
    }
    return next;
  } catch {
    return {};
  }
}

function hydrate(): PickMap {
  if (loaded) return memory;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return memory;
    const raw = localStorage.getItem(CMA_REACTION_GALLERY_KEY);
    memory = parseCmaReactionPicksJson(raw);
  } catch { /* ignore */ }
  return memory;
}

function persist(next: PickMap): void {
  memory = next;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CMA_REACTION_GALLERY_KEY, JSON.stringify(next));
  } catch { /* private mode */ }
}

export function cmaReactionVerdict(code: string): CmaReactionVerdict {
  return hydrate()[code] ?? 'undecided';
}

export function setCmaReactionVerdict(code: string, verdict: CmaReactionVerdict): CmaReactionVerdict | null {
  if (!cmaReactionByCode(code)) return null;
  const next = { ...hydrate() };
  if (verdict === 'undecided') delete next[code];
  else next[code] = verdict;
  persist(next);
  return verdict;
}

export function listCmaReactionPicks(): PickMap {
  return { ...hydrate() };
}

export function wantedCmaReactionCodes(): string[] {
  return Object.entries(hydrate()).filter(([, v]) => v === 'want').map(([c]) => c).sort();
}

export function skippedCmaReactionCodes(): string[] {
  return Object.entries(hydrate()).filter(([, v]) => v === 'skip').map(([c]) => c).sort();
}

export function resetCmaReactionPicks(): void {
  memory = {};
  loaded = true;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(CMA_REACTION_GALLERY_KEY);
  } catch { /* ignore */ }
}

/** Drop Skip verdicts only — Wanted stays. Returns how many skips cleared. */
export function clearSkippedCmaReactionPicks(): number {
  const cur = hydrate();
  let removed = 0;
  const next: PickMap = {};
  for (const [code, v] of Object.entries(cur)) {
    if (v === 'skip') {
      removed += 1;
      continue;
    }
    next[code] = v;
  }
  persist(next);
  return removed;
}

/** Count helpers for gallery chips (CI-safe, no DOM). */
export function countCmaReactionPicks(picks?: PickMap): {
  all: number;
  wanted: number;
  skipped: number;
  undecided: number;
} {
  const map = picks ?? hydrate();
  let wanted = 0;
  let skipped = 0;
  for (const v of Object.values(map)) {
    if (v === 'want') wanted += 1;
    else if (v === 'skip') skipped += 1;
  }
  const all = CMA_REACTION_GALLERY.length;
  return { all, wanted, skipped, undecided: Math.max(0, all - wanted - skipped) };
}


/** Play roles that map gallery burst/use onto laugh / poke / gasp pools. */
export type CmaReactionPlayRole = 'laugh' | 'poke' | 'gasp';

const LAUGH_BURSTS = new Set(['laugh', 'giggle', 'ha', 'smile', 'groan']);
const POKE_BURSTS = new Set(['ouch', 'effort', 'yelp']);
const GASP_BURSTS = new Set(['gasp']);

function matchesPlayRole(clip: CmaReactionClip, role: CmaReactionPlayRole): boolean {
  if (role === 'poke') return clip.use === 'poke' || POKE_BURSTS.has(clip.burst);
  if (role === 'laugh') return LAUGH_BURSTS.has(clip.burst);
  if (role === 'gasp') return GASP_BURSTS.has(clip.burst);
  return false;
}

/** Wanted catalog rows only. Skip/undecided excluded. Optional gender + play-role filter. */
export function wantedCmaReactionClips(opts?: {
  gender?: 'female' | 'male';
  role?: CmaReactionPlayRole;
}): CmaReactionClip[] {
  const wanted = new Set(wantedCmaReactionCodes());
  return CMA_REACTION_GALLERY.filter((c) => {
    if (!wanted.has(c.code)) return false;
    if (opts?.gender && c.gender !== opts.gender) return false;
    if (opts?.role && !matchesPlayRole(c, opts.role)) return false;
    return true;
  });
}

let wantedPlayCursor = 0;

/**
 * Next Wanted CMA path for this gender + role, or null when the Wanted pool is empty.
 * Runtime localStorage picks only — never a hardcoded Want list.
 */
export function pickWantedCmaReactionPath(opts: {
  gender: 'female' | 'male';
  role: CmaReactionPlayRole;
  /** Optional playability gate (e.g. missing public file). Unplayable Wanted ids are skipped; all-miss → null → legacy. */
  isPlayable?: (path: string) => boolean;
}): string | null {
  const pool = wantedCmaReactionClips(opts);
  if (!pool.length) return null;
  const n = pool.length;
  for (let i = 0; i < n; i++) {
    const clip = pool[wantedPlayCursor % n]!;
    wantedPlayCursor += 1;
    const path = cmaReactionPath(clip.file);
    if (!clip.file || !path) continue;
    if (opts.isPlayable && !opts.isPlayable(path)) continue;
    return path;
  }
  return null;
}

export function resetWantedCmaReactionRotation(): void {
  wantedPlayCursor = 0;
}

/** Test helper — drop in-memory cache so the next read rehydrates. */
export function forgetCmaReactionPickCache(): void {
  memory = {};
  loaded = false;
}
