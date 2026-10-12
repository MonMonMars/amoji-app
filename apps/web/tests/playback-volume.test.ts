import { describe, expect, it } from 'vitest';
import { getPlaybackVolume, setPlaybackVolume } from '../lib/playback-volume';

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
  it('round-trips through localStorage', () => {
    const restore = swapLs();
    setPlaybackVolume(0.35);
    expect(getPlaybackVolume()).toBe(0.35);
    restore();
  });
});
