// CMA reaction SFX gallery + Want/Skip picks.
// Mon EmotionClipRow female-view keepers: #12/#18/#23/#27/#30/#36 + poke CMA00350–362
// + legacy main-poke CLIP rows CMA00363–366 (um/giggle/ha/wow) so every sound the
// character could play on poke is listed and selectable.
// Wanted codes feed recordedLaughClip / recordedPokeClip. Assets under public/voice-clips/cma-reaction/.

export const CMA_REACTION_GALLERY_KEY = 'amoji.cmaReactionSfx.picks.v1';
/** Inclusive code span covering original pack + poke pack + legacy poke CLIP rows. */
export const CMA_REACTION_RANGE = { from: 304, to: 366 } as const;

/** Original Mon keepers (female-view EmotionClipRow #s). */
export const CMA_REACTION_KEEP_CODES = [
  'CMA00320', // #12 female giggle
  'CMA00335', // #18 female poke ouch
  'CMA00318', // #23 male effort breath
  'CMA00327', // #27 male gasp
  'CMA00330', // #30 male yawn
  'CMA00339', // #36 male ouch / sword
] as const;

/** Every CMA00304–349 code not in the Mon keeper set (removed from ship-set + disk). */
export const CMA_REACTION_DROPPED_CODES = [
  'CMA00304',
  'CMA00305',
  'CMA00306',
  'CMA00307',
  'CMA00308',
  'CMA00309',
  'CMA00310',
  'CMA00311',
  'CMA00312',
  'CMA00313',
  'CMA00314',
  'CMA00315',
  'CMA00316',
  'CMA00317',
  'CMA00319',
  'CMA00321',
  'CMA00322',
  'CMA00323',
  'CMA00324',
  'CMA00325',
  'CMA00326',
  'CMA00328',
  'CMA00329',
  'CMA00331',
  'CMA00332',
  'CMA00333',
  'CMA00334',
  'CMA00336',
  'CMA00337',
  'CMA00338',
  'CMA00340',
  'CMA00341',
  'CMA00342',
  'CMA00343',
  'CMA00344',
  'CMA00345',
  'CMA00346',
  'CMA00347',
  'CMA00348',
  'CMA00349',
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

/** Ship-set: 6 Mon keepers + poke CMA00350–362 + legacy main-poke CLIP CMA00363–366. */
export const CMA_REACTION_GALLERY: readonly CmaReactionClip[] = [
  {
    code: "CMA00318",
    file: "CMA00318_universal_male_effort.mp3",
    lang: "universal",
    gender: "male",
    burst: "effort",
    use: "reaction",
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
    code: "CMA00327",
    file: "CMA00327_universal_male_gasp_astonished.mp3",
    lang: "universal",
    gender: "male",
    burst: "gasp",
    use: "poke",
    license: "Mixkit Free SFX",
    source: "Mixkit 967",
    durationSec: 1.123,
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
    code: "CMA00339",
    file: "CMA00339_universal_male_ouch.mp3",
    lang: "universal",
    gender: "male",
    burst: "ouch",
    use: "poke",
    license: "CC0",
    source: "OpenGameArt HaelDB yelling",
    durationSec: 0.993,
  },
  {
    code: "CMA00350",
    file: "CMA00350_universal_female_ouch_ha.mp3",
    lang: "universal",
    gender: "female",
    burst: "ouch",
    use: "poke",
    license: "CC0",
    source: "OGA RPG Voice Starter jump1 (ha_rpg)",
    durationSec: 0.366,
  },
  {
    code: "CMA00351",
    file: "CMA00351_universal_female_ouch_oh.mp3",
    lang: "universal",
    gender: "female",
    burst: "ouch",
    use: "poke",
    license: "CC0",
    source: "OGA Mature Female anime_wah crop (oh)",
    durationSec: 0.81,
  },
  {
    code: "CMA00352",
    file: "CMA00352_universal_female_ouch_hehe.mp3",
    lang: "universal",
    gender: "female",
    burst: "ouch",
    use: "poke",
    license: "CC BY 4.0",
    source: "magicalmysticva Cute Girl Voice Reactions 734124",
    durationSec: 0.836,
  },
  {
    code: "CMA00353",
    file: "CMA00353_universal_female_ouch_giggle.mp3",
    lang: "universal",
    gender: "female",
    burst: "giggle",
    use: "poke",
    license: "CC0",
    source: "Freesound Reitanna 351170 quick giggle",
    durationSec: 0.522,
  },
  {
    code: "CMA00354",
    file: "CMA00354_universal_female_ouch_smile.mp3",
    lang: "universal",
    gender: "female",
    burst: "smile",
    use: "poke",
    license: "CC0",
    source: "OGA Bright Female smile crop",
    durationSec: 0.731,
  },
  {
    code: "CMA00355",
    file: "CMA00355_universal_male_ouch_effort.mp3",
    lang: "universal",
    gender: "male",
    burst: "effort",
    use: "poke",
    license: "CC0",
    source: "Freesound Drkvixn91 318077 Whimper_Gasp",
    durationSec: 1.019,
  },
  {
    code: "CMA00356",
    file: "CMA00356_universal_male_ouch_wow.mp3",
    lang: "universal",
    gender: "male",
    burst: "gasp",
    use: "poke",
    license: "CC0",
    source: "Woven male-gasp (universal/male/wow)",
    durationSec: 0.47,
  },
  {
    code: "CMA00357",
    file: "CMA00357_universal_male_ouch_effort_short.mp3",
    lang: "universal",
    gender: "male",
    burst: "effort",
    use: "poke",
    license: "CC0 1.0",
    source: "Crop of CMA00318 SFXMint exertion-breathing",
    durationSec: 0.679,
  },
  {
    code: "CMA00358",
    file: "CMA00358_universal_female_ouch_giggle_short.mp3",
    lang: "universal",
    gender: "female",
    burst: "giggle",
    use: "poke",
    license: "CC0",
    source: "Crop of CMA00320 BlueSiren giggle",
    durationSec: 0.601,
  },

  {
    code: "CMA00359",
    file: "CMA00359_universal_female_gasp_reitanna.mp3",
    lang: "universal",
    gender: "female",
    burst: "gasp",
    use: "poke",
    license: "CC0",
    source: "Freesound Reitanna 242618 gasp",
    durationSec: 0.549,
  },
  {
    code: "CMA00360",
    file: "CMA00360_universal_female_gasp_woven.mp3",
    lang: "universal",
    gender: "female",
    burst: "gasp",
    use: "poke",
    license: "CC0",
    source: "Woven SFX female-gasp.wav",
    durationSec: 0.522,
  },
  {
    code: "CMA00361",
    file: "CMA00361_universal_male_gasp_woven.mp3",
    lang: "universal",
    gender: "male",
    burst: "gasp",
    use: "poke",
    license: "CC0",
    source: "Woven SFX male-gasp.wav",
    durationSec: 0.496,
  },
  {
    code: "CMA00362",
    file: "CMA00362_universal_male_ouch_mixkit.mp3",
    lang: "universal",
    gender: "male",
    burst: "ouch",
    use: "poke",
    license: "Mixkit Free SFX",
    source: "Mixkit 2205 male ouch (crop)",
    durationSec: 1.149,
  },
  // Legacy main RECORDED_POKE_ZONE rows that were still played but not listed.
  {
    code: "CMA00363",
    file: "CMA00363_universal_female_ouch_um.mp3",
    lang: "universal",
    gender: "female",
    burst: "um",
    use: "poke",
    license: "CC0",
    source: "OGA Mature Female → universal/female/um.mp3 (main chest/breast poke)",
    durationSec: 0.81,
  },
  {
    code: "CMA00364",
    file: "CMA00364_universal_female_ouch_giggle_full.mp3",
    lang: "universal",
    gender: "female",
    burst: "giggle",
    use: "poke",
    license: "CC0",
    source: "OGA Mature Female → universal/female/giggle.mp3 (main hand poke)",
    durationSec: 0.888,
  },
  {
    code: "CMA00365",
    file: "CMA00365_universal_female_ouch_ha_full.mp3",
    lang: "universal",
    gender: "female",
    burst: "ha",
    use: "poke",
    license: "CC0",
    source: "OGA Mature Female → universal/female/ha.mp3 (main torso poke)",
    durationSec: 0.862,
  },
  {
    code: "CMA00366",
    file: "CMA00366_universal_female_ouch_wow.mp3",
    lang: "universal",
    gender: "female",
    burst: "gasp",
    use: "poke",
    license: "CC0",
    source: "OGA Bright Female → universal/female/wow.mp3 (main back poke)",
    durationSec: 0.888,
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
const POKE_BURSTS = new Set(['ouch', 'effort', 'yelp', 'gasp', 'um', 'ha']);
const GASP_BURSTS = new Set(['gasp']);

function matchesPlayRole(clip: CmaReactionClip, role: CmaReactionPlayRole): boolean {
  if (role === 'poke') return clip.use === 'poke' || POKE_BURSTS.has(clip.burst);
  if (role === 'laugh') return LAUGH_BURSTS.has(clip.burst);
  if (role === 'gasp') return GASP_BURSTS.has(clip.burst);
  return false;
}

/** Catalog rows that can feed poke playback (use=poke or poke-shaped burst). */
export function pokeRoleClips(opts?: {
  gender?: 'female' | 'male';
}): CmaReactionClip[] {
  return CMA_REACTION_GALLERY.filter((c) => {
    if (!matchesPlayRole(c, 'poke')) return false;
    if (opts?.gender && c.gender !== opts.gender) return false;
    return true;
  });
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

/**
 * Poke playback pool from user picks:
 *  - Any Wanted poke-role clip for this gender → Wanted only
 *  - Else → full poke-role list minus Skipped (default = full updated list)
 */
export function enabledPokeReactionClips(opts: {
  gender: 'female' | 'male';
}): CmaReactionClip[] {
  const wanted = wantedCmaReactionClips({ gender: opts.gender, role: 'poke' });
  if (wanted.length) return wanted;
  const skipped = new Set(skippedCmaReactionCodes());
  return pokeRoleClips({ gender: opts.gender }).filter((c) => !skipped.has(c.code));
}

let wantedPlayCursor = 0;
let enabledPokePlayCursor = 0;

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

/**
 * Next enabled poke path. Prefer `preferPath` when it is in the enabled set
 * (keeps zone-table answers when the user has not narrowed Want). Else rotate.
 */
export function pickEnabledPokeReactionPath(opts: {
  gender: 'female' | 'male';
  preferPath?: string;
  isPlayable?: (path: string) => boolean;
}): string | null {
  const pool = enabledPokeReactionClips(opts);
  if (!pool.length) return null;
  if (opts.preferPath) {
    const hit = pool.find((c) => cmaReactionPath(c.file) === opts.preferPath);
    if (hit) {
      const path = cmaReactionPath(hit.file);
      if (!opts.isPlayable || opts.isPlayable(path)) return path;
    }
  }
  const n = pool.length;
  for (let i = 0; i < n; i++) {
    const clip = pool[enabledPokePlayCursor % n]!;
    enabledPokePlayCursor += 1;
    const path = cmaReactionPath(clip.file);
    if (!clip.file || !path) continue;
    if (opts.isPlayable && !opts.isPlayable(path)) continue;
    return path;
  }
  return null;
}

export function resetWantedCmaReactionRotation(): void {
  wantedPlayCursor = 0;
  enabledPokePlayCursor = 0;
}

/** CMA code embedded in a /voice-clips/cma-reaction/… path, or null. */
export function cmaCodeFromPath(path: string): string | null {
  const m = path.match(/CMA\d{5}/);
  return m ? m[0]! : null;
}

export interface PokeSfxInventoryRow {
  code: string;
  path: string;
  gender: 'female' | 'male';
  burst: string;
  inList: boolean;
  selectable: boolean;
  usedByCharacter: boolean;
  source: 'zone' | 'gallery-poke' | 'legacy-main';
}

/**
 * Every poke-capable gallery row + every RECORDED_POKE_ZONE path, for inventory
 * diffs (list vs playback). `zonePaths` is injected so this module stays free
 * of a voice-clips import cycle.
 */
export function listPokeSfxInventory(zonePaths: readonly string[]): PokeSfxInventoryRow[] {
  const zoneSet = new Set(zonePaths);
  const byCode = new Map<string, PokeSfxInventoryRow>();
  for (const clip of pokeRoleClips()) {
    const path = cmaReactionPath(clip.file);
    const used = zoneSet.has(path);
    const legacy = Number(clip.code.slice(3)) >= 363;
    byCode.set(clip.code, {
      code: clip.code,
      path,
      gender: clip.gender,
      burst: clip.burst,
      inList: true,
      selectable: true,
      usedByCharacter: used,
      source: legacy ? 'legacy-main' : used ? 'zone' : 'gallery-poke',
    });
  }
  for (const path of zonePaths) {
    const code = cmaCodeFromPath(path);
    if (!code) {
      byCode.set(`orphan:${path}`, {
        code: '',
        path,
        gender: path.includes('/male/') ? 'male' : 'female',
        burst: 'unknown',
        inList: false,
        selectable: false,
        usedByCharacter: true,
        source: 'zone',
      });
      continue;
    }
    if (byCode.has(code)) {
      const row = byCode.get(code)!;
      row.usedByCharacter = true;
      if (row.source === 'gallery-poke') row.source = 'zone';
      continue;
    }
    byCode.set(code, {
      code,
      path,
      gender: path.includes('_male_') || path.includes('/male/') ? 'male' : 'female',
      burst: 'unknown',
      inList: false,
      selectable: false,
      usedByCharacter: true,
      source: 'zone',
    });
  }
  return [...byCode.values()].sort((a, b) => a.path.localeCompare(b.path));
}

/** Test helper — drop in-memory cache so the next read rehydrates. */
export function forgetCmaReactionPickCache(): void {
  memory = {};
  loaded = false;
}
