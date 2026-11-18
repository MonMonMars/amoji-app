import { afterEach, describe, expect, it } from 'vitest';
import {
  forgetOwnerPerfPicksCache,
  ownerDanceClipPrefs,
  ownerListenMvCodes,
  ownerSingClipPrefs,
  ownerSongClipIds,
  pickOwnerSongClipId,
  pickOwnerStreamTrack,
  resetOwnerPerfPicks,
  saveOwnerPerfPicks,
} from '../lib/owner-perf-picks';
import { resolveLibraryPerformance } from '../lib/music';
import { resolvePerfMotion } from '../lib/performance-motion';
import { listEnabledSingClipIds, resetIdleEnabled, setIdleEnabled, forgetIdleEnabledCache } from '../lib/idle-enabled';
import { resetIdlePicks, saveIdlePick, forgetIdlePickCache } from '../lib/idle-pick';

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
  resetOwnerPerfPicks();
  forgetOwnerPerfPicksCache();
  resetIdlePicks();
  resetIdleEnabled();
  forgetIdleEnabledCache();
  forgetIdlePickCache();
});

describe('owner perf picks resolution', () => {
  it('ships repo defaults when localStorage is empty', () => {
    mockStorage();
    expect(ownerListenMvCodes().length).toBeGreaterThan(0);
    expect(ownerSongClipIds().length).toBeGreaterThan(0);
    expect(ownerListenMvCodes()).toContain('MV069');
  });

  it('does not map a named hiphop ask to unrelated owner pop pins', () => {
    mockStorage();
    saveOwnerPerfPicks({ listenMvCodes: ['MV084'] });
    expect(pickOwnerStreamTrack('hiphop', 0)).toBeNull();
  });

  it('honors localStorage MV + song pins over rotation', () => {
    mockStorage();
    saveOwnerPerfPicks({
      listenMvCodes: ['MV084', 'MV069'],
      songClipIds: ['sing-f-twinkle'],
    });
    expect(pickOwnerStreamTrack('uspop', 0)?.ownerCode).toBe('MV084');
    expect(pickOwnerSongClipId({ kind: 'song', gender: 'female', n: 0 })).toBe('sing-f-twinkle');
    const resolved = resolveLibraryPerformance({ kind: 'song', gender: 'female', n: 0, ms: 12_000 });
    expect(resolved.id).toBe('sing-f-twinkle');
  });

  it('sing body uses enabled sing rails and dance uses dance rails', () => {
    mockStorage();
    setIdleEnabled(24, true);
    expect(listEnabledSingClipIds()).toContain('lib_C120');
    expect(ownerSingClipPrefs()[0]).toBe('lib_C120');
    setIdleEnabled(27, true);
    expect(ownerDanceClipPrefs()[0]).toBe('lib_C113');
    const singProfile = resolvePerfMotion(
      { id: 't', kind: 'song', style: 'soft ballad' },
      { ownerSingClips: ownerSingClipPrefs() },
    );
    expect(singProfile.preferredClipIds[0]).toBe('lib_C120');
  });

  it('per-character sing pin wins when category is sing', () => {
    mockStorage();
    saveIdlePick('a01-shino', 'lib_C120');
    expect(ownerSingClipPrefs('a01-shino')[0]).toBe('lib_C120');
  });
});