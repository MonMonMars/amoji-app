import { afterEach, describe, expect, it } from 'vitest';
import {
  CMA_REACTION_ARCHIVE_CODES,
  CMA_REACTION_DROPPED_CODES,
  CMA_REACTION_GALLERY,
  CMA_REACTION_GALLERY_KEY,
  CMA_REACTION_KEEP_CODES,
  CMA_REACTION_OWNER_DELETE_CODES,
  CMA_REACTION_RANGE,
  clearSkippedCmaReactionPicks,
  countCmaReactionPicks,
  cmaCodeFromPath,
  cmaReactionByCode,
  cmaReactionPath,
  cmaReactionVerdict,
  enabledPokeReactionClips,
  expectedCmaReactionCodes,
  forgetCmaReactionPickCache,
  listCmaReactionCodes,
  listCmaReactionPicks,
  listPokeSfxInventory,
  missingCmaReactionCodes,
  parseCmaReactionPicksJson,
  pickEnabledPokeReactionPath,
  pickWantedCmaReactionPath,
  pokeRoleClips,
  resetCmaReactionPicks,
  resetWantedCmaReactionRotation,
  setCmaReactionVerdict,
  skippedCmaReactionCodes,
  wantedCmaReactionClips,
  wantedCmaReactionCodes,
} from '../lib/cma-reaction-gallery';
import { pokeZoneClipPaths, recordedPokeClip, VOICE_CLIP_GENDERS } from '../lib/voice-clips';

function mockStorage() {
  const store = new Map<string, string>();
  (globalThis as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    get length() { return store.size; },
  };
  return store;
}

afterEach(() => {
  resetCmaReactionPicks();
  forgetCmaReactionPickCache();
});

describe('CMA reaction gallery catalog', () => {
  it('ships owner #1–23 keepers (13) and drops deleted codes', () => {
    expect(CMA_REACTION_RANGE).toEqual({ from: 304, to: 366 });
    expect(CMA_REACTION_KEEP_CODES).toHaveLength(13);
    expect(CMA_REACTION_ARCHIVE_CODES).toEqual(['CMA00320', 'CMA00335', 'CMA00353']);
    expect(CMA_REACTION_OWNER_DELETE_CODES).toContain('CMA00352');
    expect(CMA_REACTION_OWNER_DELETE_CODES).toContain('CMA00358');
    expect(CMA_REACTION_DROPPED_CODES.length).toBeGreaterThanOrEqual(50);
    expect(CMA_REACTION_GALLERY).toHaveLength(13);
    expect(missingCmaReactionCodes()).toEqual([]);
    expect(listCmaReactionCodes()).toEqual(expectedCmaReactionCodes());
    expect(cmaReactionByCode('CMA00304')).toBeNull();
    expect(cmaReactionByCode('CMA00327')).toBeNull();
    expect(cmaReactionByCode('CMA00352')).toBeNull();
    expect(cmaReactionByCode('CMA00350')?.use).toBe('poke');
    expect(cmaReactionByCode('CMA00354')?.burst).toBe('smile');
    expect(cmaReactionByCode('CMA00363')?.use).toBe('poke');
    expect(cmaReactionByCode('CMA00366')?.use).toBe('poke');
    expect(cmaReactionByCode('CMA00318')?.use).toBe('poke');
  });

  it('builds public paths under /voice-clips/cma-reaction/', () => {
    const first = CMA_REACTION_GALLERY[0]!;
    const prev = process.env.NEXT_PUBLIC_BASE_PATH;
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    expect(cmaReactionPath(first.file)).toBe(`/voice-clips/cma-reaction/${first.file}`);
    expect(first.code).toBe('CMA00318');
    if (prev === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = prev;
  });

  it('prefixes NEXT_PUBLIC_BASE_PATH on Pages and does not double-prefix', () => {
    const first = CMA_REACTION_GALLERY[0]!;
    const prev = process.env.NEXT_PUBLIC_BASE_PATH;
    process.env.NEXT_PUBLIC_BASE_PATH = '/amoji-app';
    const once = cmaReactionPath(first.file);
    expect(once).toBe(`/amoji-app/voice-clips/cma-reaction/${first.file}`);
    expect(once.startsWith('/amoji-app/amoji-app/')).toBe(false);
    expect(cmaReactionPath(first.file)).toBe(once);
    if (prev === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = prev;
  });
});

describe('CMA reaction Want/Skip picks', () => {
  it('persists Want and Skip separately and exports lists', () => {
    const store = mockStorage();
    forgetCmaReactionPickCache();
    expect(cmaReactionVerdict('CMA00320')).toBe('undecided');
    expect(setCmaReactionVerdict('CMA00320', 'want')).toBe('want');
    expect(setCmaReactionVerdict('CMA00350', 'skip')).toBe('skip');
    expect(setCmaReactionVerdict('CMA00999', 'want')).toBeNull();
    expect(setCmaReactionVerdict('CMA00304', 'want')).toBeNull();
    expect(wantedCmaReactionCodes()).toEqual(['CMA00320']);
    expect(skippedCmaReactionCodes()).toEqual(['CMA00350']);
    const raw = store.get(CMA_REACTION_GALLERY_KEY);
    expect(JSON.parse(raw!)).toMatchObject({ CMA00320: 'want', CMA00350: 'skip' });
    setCmaReactionVerdict('CMA00320', 'undecided');
    expect(wantedCmaReactionCodes()).toEqual([]);
  });

  it('rehydrates from localStorage after cache forget', () => {
    mockStorage();
    forgetCmaReactionPickCache();
    setCmaReactionVerdict('CMA00320', 'want');
    forgetCmaReactionPickCache();
    expect(cmaReactionVerdict('CMA00320')).toBe('want');
    resetCmaReactionPicks();
    expect(cmaReactionVerdict('CMA00320')).toBe('undecided');
  });
});

describe('CMA Wanted play pool (wired)', () => {
  it('Wanted codes enter the play pool; Skip and undecided stay out', () => {
    mockStorage();
    forgetCmaReactionPickCache();
    resetWantedCmaReactionRotation();
    setCmaReactionVerdict('CMA00320', 'want');
    setCmaReactionVerdict('CMA00350', 'want');
    setCmaReactionVerdict('CMA00351', 'skip');
    setCmaReactionVerdict('CMA00318', 'want');

    expect(wantedCmaReactionCodes()).toEqual(['CMA00318', 'CMA00320', 'CMA00350']);

    const laughPool = wantedCmaReactionClips({ gender: 'female', role: 'laugh' }).map((c) => c.code);
    expect(laughPool).toEqual(['CMA00320']);

    const pokePool = wantedCmaReactionClips({ gender: 'female', role: 'poke' }).map((c) => c.code);
    expect(pokePool).toEqual(['CMA00350']);

    const malePoke = wantedCmaReactionClips({ gender: 'male', role: 'poke' }).map((c) => c.code);
    expect(malePoke).toEqual(['CMA00318']);

    const path = pickWantedCmaReactionPath({ gender: 'female', role: 'laugh' });
    expect(path).toBe(cmaReactionPath(cmaReactionByCode('CMA00320')!.file));
  });

  it('empty Wanted returns null so callers fall back to legacy clips', () => {
    mockStorage();
    forgetCmaReactionPickCache();
    resetWantedCmaReactionRotation();
    expect(wantedCmaReactionCodes()).toEqual([]);
    expect(pickWantedCmaReactionPath({ gender: 'female', role: 'laugh' })).toBeNull();
    expect(pickWantedCmaReactionPath({ gender: 'male', role: 'poke' })).toBeNull();
  });
});

describe('CMA pick harden + Clear Skipped', () => {
  it('fail-closed on corrupt / wrong-shaped localStorage JSON', () => {
    expect(parseCmaReactionPicksJson(null)).toEqual({});
    expect(parseCmaReactionPicksJson('{"CMA00320":"WANT"}')).toEqual({});
    expect(parseCmaReactionPicksJson('{"CMA00304":"want","CMA00320":"want","CMA00350":"skip"}')).toEqual({
      CMA00320: 'want',
      CMA00350: 'skip',
    });

    const store = mockStorage();
    forgetCmaReactionPickCache();
    store.set(CMA_REACTION_GALLERY_KEY, '{bad');
    expect(listCmaReactionPicks()).toEqual({});
  });

  it('Skip-only (no Wanted) returns null; Clear Skipped keeps Wanted', () => {
    mockStorage();
    forgetCmaReactionPickCache();
    resetWantedCmaReactionRotation();
    setCmaReactionVerdict('CMA00350', 'skip');
    setCmaReactionVerdict('CMA00318', 'skip');
    expect(pickWantedCmaReactionPath({ gender: 'male', role: 'poke' })).toBeNull();
    expect(countCmaReactionPicks().skipped).toBe(2);

    setCmaReactionVerdict('CMA00320', 'want');
    expect(clearSkippedCmaReactionPicks()).toBe(2);
    expect(wantedCmaReactionCodes()).toEqual(['CMA00320']);
  });

  it('skips Wanted ids whose files are unplayable and falls back to null/legacy', () => {
    mockStorage();
    forgetCmaReactionPickCache();
    resetWantedCmaReactionRotation();
    setCmaReactionVerdict('CMA00320', 'want');
    const miss = new Set([cmaReactionPath(cmaReactionByCode('CMA00320')!.file)]);
    expect(
      pickWantedCmaReactionPath({
        gender: 'female',
        role: 'laugh',
        isPlayable: (p) => !miss.has(p),
      }),
    ).toBeNull();

    resetWantedCmaReactionRotation();
    const path = pickWantedCmaReactionPath({
      gender: 'female',
      role: 'laugh',
      isPlayable: () => true,
    });
    expect(path).toContain('CMA00320');
  });
});

describe('poke SFX inventory + selection → playback pool', () => {
  it('lists every zone-table path as in-list + selectable', () => {
    const zonePaths = VOICE_CLIP_GENDERS.flatMap((g) => pokeZoneClipPaths(g));
    const inv = listPokeSfxInventory(zonePaths);
    for (const path of zonePaths) {
      const row = inv.find((r) => r.path === path);
      expect(row, path).toBeTruthy();
      expect(row!.inList, path).toBe(true);
      expect(row!.selectable, path).toBe(true);
      expect(row!.usedByCharacter, path).toBe(true);
      expect(cmaCodeFromPath(path)).toBeTruthy();
      expect(cmaReactionByCode(cmaCodeFromPath(path)!)).toBeTruthy();
    }
    // Archive keepers are in gallery but not default pokeRoleClips.
    for (const code of CMA_REACTION_ARCHIVE_CODES) {
      expect(pokeRoleClips().some((c) => c.code === code)).toBe(false);
      expect(cmaReactionByCode(code)).toBeTruthy();
    }
    expect(pokeRoleClips().length).toBeGreaterThan(0);
  });

  it('default enabled poke pool excludes archive; Want narrows; Skip drops', () => {
    mockStorage();
    forgetCmaReactionPickCache();
    resetWantedCmaReactionRotation();

    const femaleAll = enabledPokeReactionClips({ gender: 'female' }).map((c) => c.code);
    expect(femaleAll).toEqual(pokeRoleClips({ gender: 'female' }).map((c) => c.code));
    expect(femaleAll).not.toContain('CMA00335');
    expect(femaleAll).toContain('CMA00363');
    expect(femaleAll).toContain('CMA00350');

    setCmaReactionVerdict('CMA00350', 'skip');
    expect(enabledPokeReactionClips({ gender: 'female' }).map((c) => c.code)).not.toContain('CMA00350');
    expect(enabledPokeReactionClips({ gender: 'female' }).map((c) => c.code)).toContain('CMA00363');

    setCmaReactionVerdict('CMA00363', 'want');
    setCmaReactionVerdict('CMA00366', 'want');
    expect(enabledPokeReactionClips({ gender: 'female' }).map((c) => c.code).sort()).toEqual([
      'CMA00363',
      'CMA00366',
    ]);

    const path = pickEnabledPokeReactionPath({ gender: 'female' });
    expect(path).toMatch(/CMA0036[36]/);
  });

  it('recordedPokeClip stays zone-stable; Want does not rotate; Skip falls back', () => {
    mockStorage();
    forgetCmaReactionPickCache();
    resetWantedCmaReactionRotation();

    expect(recordedPokeClip('female', 'belly')).toContain('CMA00363');
    expect(recordedPokeClip('female', 'torso')).toContain('CMA00350');
    expect(recordedPokeClip('female', 'head')).toContain('CMA00354');
    expect(recordedPokeClip('male', 'chest')).toContain('CMA00318');

    // Wanting other clips must not steal another location's sound.
    setCmaReactionVerdict('CMA00363', 'want');
    setCmaReactionVerdict('CMA00366', 'want');
    expect(recordedPokeClip('female', 'belly')).toContain('CMA00363');
    expect(recordedPokeClip('female', 'head')).toContain('CMA00354');
    expect(recordedPokeClip('female', 'head')).toBe(recordedPokeClip('female', 'head'));

    // Skip this zone's clip → gender default, not a rotating Wanted pick.
    setCmaReactionVerdict('CMA00354', 'skip');
    expect(recordedPokeClip('female', 'head')).toContain('CMA00351');
  });
});
