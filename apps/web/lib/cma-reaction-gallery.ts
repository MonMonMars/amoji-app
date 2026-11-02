// CMA00304–CMA00349 Reaction SFX gallery catalog + Want/Skip picks.
// Selection only — NOT wired into poke/laugh/loading production paths.
// Assets: public/voice-clips/cma-reaction/*.mp3 (from D: amoji-reaction-sfx-library).

export const CMA_REACTION_GALLERY_KEY = 'amoji.cmaReactionSfx.picks.v1';
export const CMA_REACTION_RANGE = { from: 304, to: 349 } as const;

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

/** Ship-set for in-app Want/Skip. Contiguous CMA00304–CMA00349. */
export const CMA_REACTION_GALLERY: readonly CmaReactionClip[] = [
  {
    code: "CMA00304",
    file: "CMA00304_universal_female_laugh.mp3",
    lang: "universal",
    gender: "female",
    burst: "laugh",
    use: "reaction",
    license: "CC0 1.0",
    source: "SFXMint laugh-09",
    durationSec: 2.534,
  },
  {
    code: "CMA00305",
    file: "CMA00305_universal_female_laugh.mp3",
    lang: "universal",
    gender: "female",
    burst: "laugh",
    use: "reaction",
    license: "CC0 1.0",
    source: "SFXMint laugh-10",
    durationSec: 2.534,
  },
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
    code: "CMA00309",
    file: "CMA00309_universal_female_gasp.mp3",
    lang: "universal",
    gender: "female",
    burst: "gasp",
    use: "reaction",
    license: "CC0 1.0",
    source: "SFXMint post-scream-gasp-01",
    durationSec: 1.829,
  },
  {
    code: "CMA00310",
    file: "CMA00310_universal_female_gasp.mp3",
    lang: "universal",
    gender: "female",
    burst: "gasp",
    use: "reaction",
    license: "CC0 1.0",
    source: "SFXMint post-scream-gasp-02",
    durationSec: 1.829,
  },
  {
    code: "CMA00311",
    file: "CMA00311_universal_female_hiccup.mp3",
    lang: "universal",
    gender: "female",
    burst: "hiccup",
    use: "reaction",
    license: "CC0 1.0",
    source: "SFXMint hiccup-01",
    durationSec: 0.496,
  },
  {
    code: "CMA00312",
    file: "CMA00312_universal_female_hiccup.mp3",
    lang: "universal",
    gender: "female",
    burst: "hiccup",
    use: "reaction",
    license: "CC0 1.0",
    source: "SFXMint hiccup-03",
    durationSec: 0.627,
  },
  {
    code: "CMA00313",
    file: "CMA00313_universal_female_hiccup.mp3",
    lang: "universal",
    gender: "female",
    burst: "hiccup",
    use: "reaction",
    license: "CC0 1.0",
    source: "SFXMint hiccup-04",
    durationSec: 0.575,
  },
  {
    code: "CMA00314",
    file: "CMA00314_universal_female_yawn.mp3",
    lang: "universal",
    gender: "female",
    burst: "yawn",
    use: "reaction",
    license: "CC0 1.0",
    source: "SFXMint yawn-06",
    durationSec: 1.881,
  },
  {
    code: "CMA00315",
    file: "CMA00315_universal_female_yawn.mp3",
    lang: "universal",
    gender: "female",
    burst: "yawn",
    use: "reaction",
    license: "CC0 1.0",
    source: "SFXMint yawn-08",
    durationSec: 1.672,
  },
  {
    code: "CMA00316",
    file: "CMA00316_universal_female_yawn.mp3",
    lang: "universal",
    gender: "female",
    burst: "yawn",
    use: "reaction",
    license: "CC0 1.0",
    source: "SFXMint yawn-04",
    durationSec: 2.247,
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
    code: "CMA00319",
    file: "CMA00319_universal_female_laugh.mp3",
    lang: "universal",
    gender: "female",
    burst: "laugh",
    use: "reaction",
    license: "CC0",
    source: "StoryCut/Freesound Kalibrk 433921 woman laugh",
    durationSec: 1.829,
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
  return '/voice-clips/cma-reaction/' + file;
}

export function cmaReactionByCode(code: string): CmaReactionClip | null {
  return CMA_REACTION_GALLERY.find((c) => c.code === code) ?? null;
}

export function listCmaReactionCodes(): string[] {
  return CMA_REACTION_GALLERY.map((c) => c.code);
}

export function expectedCmaReactionCodes(): string[] {
  const out: string[] = [];
  for (let n = CMA_REACTION_RANGE.from; n <= CMA_REACTION_RANGE.to; n++) {
    out.push('CMA' + String(n).padStart(5, '0'));
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

function hydrate(): PickMap {
  if (loaded) return memory;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return memory;
    const raw = localStorage.getItem(CMA_REACTION_GALLERY_KEY);
    if (!raw) return memory;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return memory;
    const next: PickMap = {};
    for (const [code, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!cmaReactionByCode(code)) continue;
      if (v === 'want' || v === 'skip' || v === 'undecided') next[code] = v;
    }
    memory = next;
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

/** Test helper — drop in-memory cache so the next read rehydrates. */
export function forgetCmaReactionPickCache(): void {
  memory = {};
  loaded = false;
}

