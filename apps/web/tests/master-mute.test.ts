import { describe, expect, it, vi, beforeEach } from 'vitest';

function swapLs(): () => void {
  const g = globalThis as { localStorage?: Storage; window?: Window & typeof globalThis };
  const prev = g.localStorage;
  const prevWin = g.window;
  const map = new Map<string, string>();
  const ls = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  g.localStorage = ls;
  g.window = {
    localStorage: ls,
    dispatchEvent: () => true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  } as unknown as Window & typeof globalThis;
  return () => {
    g.localStorage = prev;
    if (prevWin === undefined) delete (g as { window?: unknown }).window;
    else g.window = prevWin;
  };
}

describe('master-mute', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('defaults to unmuted and persists on/off', async () => {
    const restore = swapLs();
    const m = await import('../lib/master-mute');
    expect(m.isMasterMuted()).toBe(false);
    m.setMasterMuted(true);
    expect(m.isMasterMuted()).toBe(true);
    expect(localStorage.getItem('amoji.mute.v1')).toBe('on');
    m.setMasterMuted(false);
    expect(m.isMasterMuted()).toBe(false);
    expect(localStorage.getItem('amoji.mute.v1')).toBe('off');
    restore();
  });

  it('toggle flips and returns the new state', async () => {
    const restore = swapLs();
    const m = await import('../lib/master-mute');
    expect(m.toggleMasterMute()).toBe(true);
    expect(m.isMasterMuted()).toBe(true);
    expect(m.toggleMasterMute()).toBe(false);
    restore();
  });
});
