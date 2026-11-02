import { afterEach, describe, expect, it } from 'vitest';
import {
  CMA_REACTION_GALLERY,
  CMA_REACTION_GALLERY_KEY,
  CMA_REACTION_RANGE,
  cmaReactionByCode,
  cmaReactionPath,
  cmaReactionVerdict,
  expectedCmaReactionCodes,
  forgetCmaReactionPickCache,
  listCmaReactionCodes,
  listCmaReactionPicks,
  missingCmaReactionCodes,
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
  it('ships contiguous CMA00304–CMA00349 with no gaps', () => {
    expect(CMA_REACTION_RANGE).toEqual({ from: 304, to: 349 });
    expect(CMA_REACTION_GALLERY).toHaveLength(46);
    expect(missingCmaReactionCodes()).toEqual([]);
    expect(listCmaReactionCodes()).toEqual(expectedCmaReactionCodes());
    expect(cmaReactionByCode('CMA00304')?.burst).toBe('laugh');
    expect(cmaReactionByCode('CMA00349')?.burst).toBe('laugh');
    expect(cmaReactionByCode('CMA00300')).toBeNull();
  });

  it('builds public paths under /voice-clips/cma-reaction/', () => {
    const first = CMA_REACTION_GALLERY[0]!;
    expect(cmaReactionPath(first.file)).toBe(`/voice-clips/cma-reaction/${first.file}`);
    expect(first.file.startsWith('CMA00304')).toBe(true);
  });
});

describe('CMA reaction Want/Skip picks', () => {
  it('persists Want and Skip separately and exports lists', () => {
    const store = mockStorage();
    forgetCmaReactionPickCache();
    expect(cmaReactionVerdict('CMA00304')).toBe('undecided');
    expect(setCmaReactionVerdict('CMA00304', 'want')).toBe('want');
    expect(setCmaReactionVerdict('CMA00305', 'skip')).toBe('skip');
    expect(setCmaReactionVerdict('CMA00999', 'want')).toBeNull();
    expect(cmaReactionVerdict('CMA00304')).toBe('want');
    expect(cmaReactionVerdict('CMA00305')).toBe('skip');
    expect(wantedCmaReactionCodes()).toEqual(['CMA00304']);
    expect(skippedCmaReactionCodes()).toEqual(['CMA00305']);
    const raw = store.get(CMA_REACTION_GALLERY_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toMatchObject({ CMA00304: 'want', CMA00305: 'skip' });
    setCmaReactionVerdict('CMA00304', 'undecided');
    expect(listCmaReactionPicks().CMA00304).toBeUndefined();
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
    setCmaReactionVerdict('CMA00304', 'want'); // female laugh
    setCmaReactionVerdict('CMA00305', 'skip'); // female laugh skipped
    setCmaReactionVerdict('CMA00320', 'want'); // female giggle
    setCmaReactionVerdict('CMA00335', 'want'); // female poke ouch
    setCmaReactionVerdict('CMA00317', 'skip'); // male poke skipped
    // CMA00319 undecided female laugh — not Wanted

    expect(wantedCmaReactionCodes()).toEqual(['CMA00304', 'CMA00320', 'CMA00335']);
    expect(skippedCmaReactionCodes()).toEqual(['CMA00305', 'CMA00317']);

    const laughPool = wantedCmaReactionClips({ gender: 'female', role: 'laugh' }).map((c) => c.code);
    expect(laughPool).toEqual(['CMA00304', 'CMA00320']);
    expect(laughPool).not.toContain('CMA00305');
    expect(laughPool).not.toContain('CMA00319');

    const pokePool = wantedCmaReactionClips({ gender: 'female', role: 'poke' }).map((c) => c.code);
    expect(pokePool).toEqual(['CMA00335']);
    expect(pokePool).not.toContain('CMA00317');

    const malePoke = wantedCmaReactionClips({ gender: 'male', role: 'poke' });
    expect(malePoke).toEqual([]);

    const path = pickWantedCmaReactionPath({ gender: 'female', role: 'laugh' });
    expect(path).toBe(cmaReactionPath(cmaReactionByCode('CMA00304')!.file));
    expect(path!.startsWith('/voice-clips/cma-reaction/')).toBe(true);
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
