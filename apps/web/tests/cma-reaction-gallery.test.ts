import { afterEach, describe, expect, it } from 'vitest';
import {
  CMA_REACTION_DROPPED_CODES,
  CMA_REACTION_GALLERY,
  CMA_REACTION_GALLERY_KEY,
  CMA_REACTION_KEEP_CODES,
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
  it('ships only Mon keepers #12/#18/#23/#27/#30/#36 + new poke CMA00350–362', () => {
    expect(CMA_REACTION_RANGE).toEqual({ from: 304, to: 362 });
    expect(CMA_REACTION_KEEP_CODES).toEqual([
      'CMA00320', 'CMA00335', 'CMA00318', 'CMA00327', 'CMA00330', 'CMA00339',
    ]);
    expect(CMA_REACTION_DROPPED_CODES).toHaveLength(40);
    expect(CMA_REACTION_GALLERY).toHaveLength(19);
    expect(missingCmaReactionCodes()).toEqual([]);
    expect(listCmaReactionCodes()).toEqual(expectedCmaReactionCodes());
    expect(cmaReactionByCode('CMA00304')).toBeNull();
    // Original female-view EmotionClipRow keepers
    expect(cmaReactionByCode('CMA00320')?.burst).toBe('giggle'); // #12
    expect(cmaReactionByCode('CMA00335')?.burst).toBe('ouch'); // #18
    expect(cmaReactionByCode('CMA00318')?.burst).toBe('effort'); // #23
    expect(cmaReactionByCode('CMA00327')?.burst).toBe('gasp'); // #27
    expect(cmaReactionByCode('CMA00327')?.use).toBe('poke');
    expect(cmaReactionByCode('CMA00330')?.burst).toBe('yawn'); // #30
    expect(cmaReactionByCode('CMA00339')?.burst).toBe('ouch'); // #36
    expect(cmaReactionByCode('CMA00350')?.use).toBe('poke');
    expect(cmaReactionByCode('CMA00362')?.use).toBe('poke');
    expect(cmaReactionByCode('CMA00349')).toBeNull();
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
    expect(setCmaReactionVerdict('CMA00339', 'skip')).toBe('skip');
    expect(setCmaReactionVerdict('CMA00999', 'want')).toBeNull();
    expect(setCmaReactionVerdict('CMA00304', 'want')).toBeNull();
    expect(wantedCmaReactionCodes()).toEqual(['CMA00320']);
    expect(skippedCmaReactionCodes()).toEqual(['CMA00339']);
    const raw = store.get(CMA_REACTION_GALLERY_KEY);
    expect(JSON.parse(raw!)).toMatchObject({ CMA00320: 'want', CMA00339: 'skip' });
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
    setCmaReactionVerdict('CMA00335', 'want');
    setCmaReactionVerdict('CMA00339', 'skip');
    setCmaReactionVerdict('CMA00355', 'want');

    expect(wantedCmaReactionCodes()).toEqual(['CMA00320', 'CMA00335', 'CMA00355']);

    const laughPool = wantedCmaReactionClips({ gender: 'female', role: 'laugh' }).map((c) => c.code);
    expect(laughPool).toEqual(['CMA00320']);

    const pokePool = wantedCmaReactionClips({ gender: 'female', role: 'poke' }).map((c) => c.code);
    expect(pokePool).toEqual(['CMA00335']);

    const malePoke = wantedCmaReactionClips({ gender: 'male', role: 'poke' }).map((c) => c.code);
    expect(malePoke).toEqual(['CMA00355']);
    expect(malePoke).not.toContain('CMA00339');

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
    expect(parseCmaReactionPicksJson('{"CMA00304":"want","CMA00320":"want","CMA00339":"skip"}')).toEqual({
      CMA00320: 'want',
      CMA00339: 'skip',
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
    setCmaReactionVerdict('CMA00339', 'skip');
    setCmaReactionVerdict('CMA00355', 'skip');
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
