import { describe, expect, it } from 'vitest';
import { getPlaybackVolume } from '../lib/playback-volume';
import { DEFAULT_PREFS, savePrefs } from '../lib/prefs';

function swapLs(): () => void {
  const g = globalThis as { localStorage?: Storage };
  const prev = g.localStorage;
  const map = new Map<string, string>();
  g.localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  return () => { g.localStorage = prev; };
}

describe('playback volume', () => {
  it('reads the dialogue step from prefs', () => {
    const restore = swapLs();
    savePrefs({ ...DEFAULT_PREFS, voiceVol: 40 });
    expect(getPlaybackVolume()).toBe(0.4);
    savePrefs({ ...DEFAULT_PREFS, voiceVol: 100 });
    expect(getPlaybackVolume()).toBe(1);
    savePrefs({ ...DEFAULT_PREFS, voiceVol: 20 });
    expect(getPlaybackVolume()).toBe(0.2);
    savePrefs({ ...DEFAULT_PREFS, voiceVol: 0 as never });
    expect(getPlaybackVolume()).toBe(0.8);
    restore();
  });
});
