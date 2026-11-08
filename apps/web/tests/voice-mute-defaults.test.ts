import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const web = join(__dirname, '..');

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

describe('voice + master mute defaults', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('fresh storage: voice replies on, master not muted', async () => {
    const restore = swapLs();
    try {
      const voice = await import('../lib/voice');
      const master = await import('../lib/master-mute');
      expect(voice.voiceEnabled()).toBe(true);
      expect(master.isMasterMuted()).toBe(false);
    } finally {
      restore();
    }
  });

  it('one-click bootstrap unmutes stale voice + master flags', () => {
    const bootstrap = readFileSync(join(web, 'lib/one-click-setup.ts'), 'utf8');
    expect(bootstrap).toMatch(/if \(isMasterMuted\(\)\) setMasterMuted\(false\)/);
    expect(bootstrap).toMatch(/if \(!voiceEnabled\(\)\) setVoiceEnabled\(true\)/);
    expect(bootstrap).toContain('primeAudioForChatEnter');
  });
});
