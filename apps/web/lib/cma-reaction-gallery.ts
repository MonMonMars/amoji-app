// CMA reaction SFX gallery + Want/Skip picks.
// Owner EmotionClipRow #1–23 review (female-first order) → ship / archive / delete.
// Wanted codes feed recordedLaughClip / recordedPokeClip. Assets under public/voice-clips/cma-reaction/.

export const CMA_REACTION_GALLERY_KEY = 'amoji.cmaReactionSfx.picks.v1';
/** Inclusive code span covering original pack + poke pack + legacy poke CLIP rows. */
export const CMA_REACTION_RANGE = { from: 304, to: 366 } as const;

/**
 * Active ship-set after owner #1–23 review (EmotionClipRow female-first #).
 * Archive clips stay listed for Want/Skip / future use but are not zone defaults.
 */
export const CMA_REACTION_KEEP_CODES = [
  'CMA00318', // #15 male effort (normal) — active male poke
  'CMA00320', // #1 long giggle — archive / future
  'CMA00335', // #2 kid-boy ouch — archive / future
  'CMA00350', // #3 HA punch/hit — active female punch
  'CMA00351', // #4 slow soft press — active
  'CMA00353', // #6 evil-lady giggle — archive / future
  'CMA00354', // #7 young pretty smile — USE
  'CMA00359', // #9 old-woman scare — active gasp
  'CMA00360', // #10 age-35 small scare — active gasp
  'CMA00363', // #11 fast soft press — active
  'CMA00364', // #12 slow soft press — active
  'CMA00365', // #13 scary surprise — active
  'CMA00366', // #14 sensitive poke (young girl) — USE
] as const;

/** Archive: keep on disk + gallery for future Want; not wired as zone defaults. */
export const CMA_REACTION_ARCHIVE_CODES = [
  'CMA00320', // #1 giggle too long
  'CMA00335', // #2 kid boy ouch
  'CMA00353', // #6 evil lady giggle
] as const;

/** Owner delete from #1–23 review (+ prior pack cull still listed in DROPPED). */
export const CMA_REACTION_OWNER_DELETE_CODES = [
  'CMA00327', // #16 dog bark
  'CMA00330', // #17 delete
  'CMA00339', // #18 delete
  'CMA00352', // #5 name — delete
  'CMA00355', // #19 delete
  'CMA00356', // #20 delete
  'CMA00357', // #21 delete
  'CMA00358', // #8 no voice — delete
  'CMA00361', // #22 delete
  'CMA00362', // #23 delete
] as const;

/** Every CMA00304–349/366 code not in the keeper set (removed from ship-set + disk). */
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
  'CMA00327',
  'CMA00328',
  'CMA00329',
  'CMA00330',
  'CMA00331',
  'CMA00332',
  'CMA00333',
  'CMA00334',
  'CMA00336',
  'CMA00337',
  'CMA00338',
  'CMA00339',
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
  'CMA00352',
  'CMA00355',
  'CMA00356',
  'CMA00357',
  'CMA00358',
  'CMA00361',
  'CMA00362',
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

/** Ship-set after owner #1–23: 13 keepers (10 active + 3 archive). */
export const CMA_REACTION_GALLERY: readonly CmaReactionClip[] = [
  {
    code: 'CMA00318',
    file: 'CMA00318_universal_male_effort.mp3',
    lang: 'universal',
    gender: 'male',
    burst: 'effort',
    use: 'poke',
    license: 'CC0 1.0',
    source: 'SFXMint exertion-breathing (trimmed to poke window)',
    durationSec: 1.045,
  },
  {
    code: 'CMA00320',
    file: 'CMA00320_universal_female_giggle.mp3',
    lang: 'universal',
    gender: 'female',
    burst: 'giggle',
    use: 'reaction',
    license: 'CC0',
    source: 'StoryCut/Freesound BlueSiren 377742 girl chuckle (archive: too long)',
    durationSec: 2.247,
  },
  {
    code: 'CMA00335',
    file: 'CMA00335_universal_female_ouch_ah.mp3',
    lang: 'universal',
    gender: 'female',
    burst: 'ouch',
    use: 'reaction',
    license: 'Mixkit Free SFX',
    source: 'Mixkit 2204 (archive: kid-boy voice)',
    durationSec: 0.522,
  },
  {
    code: 'CMA00350',
    file: 'CMA00350_universal_female_ouch_ha.mp3',
    lang: 'universal',
    gender: 'female',
    burst: 'ouch',
    use: 'poke',
    license: 'CC0',
    source: 'OGA RPG Voice Starter jump1 (ha_rpg) — female punch/hit',
    durationSec: 0.366,
  },
  {
    code: 'CMA00351',
    file: 'CMA00351_universal_female_ouch_oh.mp3',
    lang: 'universal',
    gender: 'female',
    burst: 'ouch',
    use: 'poke',
    license: 'CC0',
    source: 'OGA Mature Female anime_wah crop (oh) — slow soft press',
    durationSec: 0.81,
  },
  {
    code: 'CMA00353',
    file: 'CMA00353_universal_female_ouch_giggle.mp3',
    lang: 'universal',
    gender: 'female',
    burst: 'giggle',
    use: 'reaction',
    license: 'CC0',
    source: 'Freesound Reitanna 351170 (archive: evil-lady giggle)',
    durationSec: 0.522,
  },
  {
    code: 'CMA00354',
    file: 'CMA00354_universal_female_ouch_smile.mp3',
    lang: 'universal',
    gender: 'female',
    burst: 'smile',
    use: 'poke',
    license: 'CC0',
    source: 'OGA Bright Female smile crop — young pretty girl USE',
    durationSec: 0.731,
  },
  {
    code: 'CMA00359',
    file: 'CMA00359_universal_female_gasp_reitanna.mp3',
    lang: 'universal',
    gender: 'female',
    burst: 'gasp',
    use: 'poke',
    license: 'CC0',
    source: 'Freesound Reitanna 242618 gasp — old-woman scare',
    durationSec: 0.549,
  },
  {
    code: 'CMA00360',
    file: 'CMA00360_universal_female_gasp_woven.mp3',
    lang: 'universal',
    gender: 'female',
    burst: 'gasp',
    use: 'poke',
    license: 'CC0',
    source: 'Woven SFX female-gasp — age-35 small scare',
    durationSec: 0.522,
  },
  {
    code: 'CMA00363',
    file: 'CMA00363_universal_female_ouch_um.mp3',
    lang: 'universal',
    gender: 'female',
    burst: 'um',
    use: 'poke',
    license: 'CC0',
    source: 'OGA Mature Female um — fast soft press',
    durationSec: 0.81,
  },
  {
    code: 'CMA00364',
    file: 'CMA00364_universal_female_ouch_giggle_full.mp3',
    lang: 'universal',
    gender: 'female',
    burst: 'ouch',
    use: 'poke',
    license: 'CC0',
    source: 'OGA Mature Female giggle — slow soft press',
    durationSec: 0.888,
  },
  {
    code: 'CMA00365',
    file: 'CMA00365_universal_female_ouch_ha_full.mp3',
    lang: 'universal',
    gender: 'female',
    burst: 'ha',
    use: 'poke',
    license: 'CC0',
    source: 'OGA Mature Female ha — scary surprise',
    durationSec: 0.862,
  },
  {
    code: 'CMA00366',
    file: 'CMA00366_universal_female_ouch_wow.mp3',
    lang: 'universal',
    gender: 'female',
    burst: 'gasp',
    use: 'poke',
    license: 'CC0',
    source: 'OGA Bright Female wow — sensitive body poke',
    durationSec: 0.888,
  },
] as const;

export function cmaReactionPath(file: string): string {
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
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const next: PickMap = {};
    for (const [code, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!cmaReactionByCode(code)) continue;
      if (v === 'want' || v === 'skip') next[code] = v;
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

export type CmaReactionPlayRole = 'laugh' | 'poke' | 'gasp';

const LAUGH_BURSTS = new Set(['laugh', 'giggle', 'ha', 'smile', 'groan']);
const POKE_BURSTS = new Set(['ouch', 'effort', 'yelp', 'gasp', 'um', 'ha', 'smile']);
const GASP_BURSTS = new Set(['gasp']);
const ARCHIVE = new Set<string>(CMA_REACTION_ARCHIVE_CODES);

function matchesPlayRole(clip: CmaReactionClip, role: CmaReactionPlayRole): boolean {
  if (role === 'poke') return clip.use === 'poke' || POKE_BURSTS.has(clip.burst);
  if (role === 'laugh') return LAUGH_BURSTS.has(clip.burst);
  if (role === 'gasp') return GASP_BURSTS.has(clip.burst);
  return false;
}

/** Catalog rows that can feed poke playback (excludes archive-only keepers). */
export function pokeRoleClips(opts?: {
  gender?: 'female' | 'male';
}): CmaReactionClip[] {
  return CMA_REACTION_GALLERY.filter((c) => {
    if (ARCHIVE.has(c.code)) return false;
    if (!matchesPlayRole(c, 'poke')) return false;
    if (opts?.gender && c.gender !== opts.gender) return false;
    return true;
  });
}

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
 *  - Else → full poke-role list minus Skipped (default = active ship set)
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

export function pickWantedCmaReactionPath(opts: {
  gender: 'female' | 'male';
  role: CmaReactionPlayRole;
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

export function forgetCmaReactionPickCache(): void {
  memory = {};
  loaded = false;
}
