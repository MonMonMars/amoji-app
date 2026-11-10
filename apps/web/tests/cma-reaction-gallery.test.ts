import { afterEach, describe, expect, it } from 'vitest';
import {
  CMA_REACTION_DROPPED_CODES,
  CMA_REACTION_GALLERY,
  CMA_REACTION_GALLERY_KEY,
  CMA_REACTION_RANGE,
  clearSkippedCmaReactionPicks,
  countCmaReactionPicks,
  cmaReactionByCode,
  cmaReactionPath,
  cmaReactionVerdict,
  expectedCmaReactionCodes,
  forgetCmaReactionPickCache,
  listCmaReactionCodes,
  listCmaReactionPicks,
  missingCmaReactionCodes,
  parseCmaReactionPicksJson,
  pickWantedCmaReactionPath,
  resetCmaReactionPicks,
  resetWantedCmaReactionRotation,
  setCmaReactionVerdict,
  skippedCmaReactionCodes,
  wantedCmaReactionClips,
  wantedCmaReactionCodes,
} from '../lib/cma-reaction-gallery';

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
  it('ships CMA00304–CMA00349 minus female-view #1–11 drops; keepers stay', () => {
    expect(CMA_REACTION_RANGE).toEqual({ from: 304, to: 349 });
    expect(CMA_REACTION_DROPPED_CODES).toHaveLength(11);
    expect(CMA_REACTION_GALLERY).toHaveLength(35);
    expect(missingCmaReactionCodes()).toEqual([]);
    expect(listCmaReactionCodes()).toEqual(expectedCmaReactionCodes());
    expect(cmaReactionByCode('CMA00304')).toBeNull(); // dropped #1
    expect(cmaReactionByCode('CMA00320')?.burst).toBe('giggle'); // kept #12
    expect(cmaReactionByCode('CMA00335')?.burst).toBe('ouch'); // kept #18
    expect(cmaReactionByCode('CMA00318')?.burst).toBe('effort'); // kept #23
    expect(cmaReactionByCode('CMA00327')?.burst).toBe('gasp'); // kept #27
    expect(cmaReactionByCode('CMA00330')?.burst).toBe('yawn'); // kept #30
    expect(cmaReactionByCode('CMA00349')?.burst).toBe('laugh');
    expect(cmaReactionByCode('CMA00300')).toBeNull();
  });

  it('builds public paths under /voice-clips/cma-reaction/', () => {
    const first = CMA_REACTION_GALLERY[0]!;
    const prev = process.env.NEXT_PUBLIC_BASE_PATH;
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    expect(cmaReactionPath(first.file)).toBe(`/voice-clips/cma-reaction/${first.file}`);
    expect(first.file.startsWith('CMA00306')).toBe(true);
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
    // Nested call still single prefix (path helper is pure; double-prefix guarded in assetUrl)
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
    expect(setCmaReactionVerdict('CMA00308', 'skip')).toBe('skip');
    expect(setCmaReactionVerdict('CMA00999', 'want')).toBeNull();
    expect(setCmaReactionVerdict('CMA00304', 'want')).toBeNull(); // dropped
    expect(cmaReactionVerdict('CMA00320')).toBe('want');
    expect(cmaReactionVerdict('CMA00308')).toBe('skip');
    expect(wantedCmaReactionCodes()).toEqual(['CMA00320']);
    expect(skippedCmaReactionCodes()).toEqual(['CMA00308']);
    const raw = store.get(CMA_REACTION_GALLERY_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toMatchObject({ CMA00320: 'want', CMA00308: 'skip' });
    setCmaReactionVerdict('CMA00320', 'undecided');
    expect(listCmaReactionPicks().CMA00320).toBeUndefined();
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
    setCmaReactionVerdict('CMA00320', 'want'); // female giggle (kept #12)
    setCmaReactionVerdict('CMA00308', 'skip'); // male laugh skipped
    setCmaReactionVerdict('CMA00335', 'want'); // female poke ouch (kept #18)
    setCmaReactionVerdict('CMA00317', 'skip'); // male poke skipped

    expect(wantedCmaReactionCodes()).toEqual(['CMA00320', 'CMA00335']);
    expect(skippedCmaReactionCodes()).toEqual(['CMA00308', 'CMA00317']);

    const laughPool = wantedCmaReactionClips({ gender: 'female', role: 'laugh' }).map((c) => c.code);
    expect(laughPool).toEqual(['CMA00320']);
    expect(laughPool).not.toContain('CMA00308');
    expect(laughPool).not.toContain('CMA00304');

    const pokePool = wantedCmaReactionClips({ gender: 'female', role: 'poke' }).map((c) => c.code);
    expect(pokePool).toEqual(['CMA00335']);
    expect(pokePool).not.toContain('CMA00317');

    const malePoke = wantedCmaReactionClips({ gender: 'male', role: 'poke' });
    expect(malePoke).toEqual([]);

    const path = pickWantedCmaReactionPath({ gender: 'female', role: 'laugh' });
    expect(path).toBe(cmaReactionPath(cmaReactionByCode('CMA00320')!.file));
    expect(path!.endsWith(cmaReactionByCode('CMA00320')!.file)).toBe(true);
    expect(path!.includes('/voice-clips/cma-reaction/')).toBe(true);
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
    expect(parseCmaReactionPicksJson('')).toEqual({});
    expect(parseCmaReactionPicksJson('not-json')).toEqual({});
    expect(parseCmaReactionPicksJson('[]')).toEqual({});
    expect(parseCmaReactionPicksJson('"want"')).toEqual({});
    expect(parseCmaReactionPicksJson('null')).toEqual({});
    expect(parseCmaReactionPicksJson('{"CMA00320":"WANT"}')).toEqual({});
    expect(parseCmaReactionPicksJson('{"CMA00999":"want"}')).toEqual({});
    // Dropped CMA00304/305 ignored even if stored historically
    expect(parseCmaReactionPicksJson('{"CMA00304":"want","CMA00320":"want","CMA00308":"skip","nope":"want"}')).toEqual({
      CMA00320: 'want',
      CMA00308: 'skip',
    });

    const store = mockStorage();
    forgetCmaReactionPickCache();
    store.set(CMA_REACTION_GALLERY_KEY, '{bad');
    expect(listCmaReactionPicks()).toEqual({});
    expect(pickWantedCmaReactionPath({ gender: 'female', role: 'laugh' })).toBeNull();
  });

  it('Skip-only (no Wanted) returns null; Clear Skipped keeps Wanted', () => {
    mockStorage();
    forgetCmaReactionPickCache();
    resetWantedCmaReactionRotation();
    setCmaReactionVerdict('CMA00308', 'skip');
    setCmaReactionVerdict('CMA00317', 'skip');
    expect(wantedCmaReactionCodes()).toEqual([]);
    expect(pickWantedCmaReactionPath({ gender: 'female', role: 'laugh' })).toBeNull();
    expect(countCmaReactionPicks().skipped).toBe(2);

    setCmaReactionVerdict('CMA00320', 'want');
    expect(clearSkippedCmaReactionPicks()).toBe(2);
    expect(skippedCmaReactionCodes()).toEqual([]);
    expect(wantedCmaReactionCodes()).toEqual(['CMA00320']);
    expect(countCmaReactionPicks()).toMatchObject({ wanted: 1, skipped: 0 });
  });

  it('skips Wanted ids whose files are unplayable and falls back to null/legacy', () => {
    mockStorage();
    forgetCmaReactionPickCache();
    resetWantedCmaReactionRotation();
    setCmaReactionVerdict('CMA00320', 'want');
    setCmaReactionVerdict('CMA00321', 'want'); // male laugh — not in female laugh pool
    setCmaReactionVerdict('CMA00306', 'want'); // male ha — female pool empty for these
    // Two female laugh-role Wanteds: only CMA00320 qualifies for female+laugh
    const miss = new Set([
      cmaReactionPath(cmaReactionByCode('CMA00320')!.file),
    ]);
    expect(
      pickWantedCmaReactionPath({
        gender: 'female',
        role: 'laugh',
        isPlayable: (p) => !miss.has(p),
      }),
    ).toBeNull();

    // Playable → returns kept giggle
    resetWantedCmaReactionRotation();
    const path = pickWantedCmaReactionPath({
      gender: 'female',
      role: 'laugh',
      isPlayable: () => true,
    });
    expect(path).toContain('CMA00320');
  });
});
