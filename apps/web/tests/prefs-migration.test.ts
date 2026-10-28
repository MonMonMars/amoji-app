import { describe, expect, it } from 'vitest';
import { CHARACTERS, DEFAULT_PREFS, loadPrefs } from '../lib/prefs';

describe('loadPrefs migration', () => {
  it('rewrites stale roster ids to a01-shino and persists', () => {
    const g = globalThis as { localStorage?: Storage };
    const prev = g.localStorage;
    const map = new Map<string, string>([
      ['amoji.prefs.v1', JSON.stringify({ character: 'juno', background: 'void', lang: 'yue', kidMode: false })],
    ]);
    g.localStorage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => { map.set(k, v); },
      removeItem: (k: string) => { map.delete(k); },
      clear: () => map.clear(),
      key: () => null,
      length: 0,
    } as Storage;
    const p = loadPrefs();
    expect(p.character).toBe(DEFAULT_PREFS.character);
    expect(CHARACTERS.some((c) => c.id === p.character)).toBe(true);
    expect(map.get('amoji.prefs.v1')).toContain('"character":"a01-shino"');
    expect(p.lastFemale).toBe('a01-shino');
    g.localStorage = prev;
  });

  it('keeps a male pick and remembers the last female library companion', () => {
    const g = globalThis as { localStorage?: Storage };
    const prev = g.localStorage;
    const map = new Map<string, string>([
      ['amoji.prefs.v1', JSON.stringify({
        character: 'a98-ethan', background: 'void', lang: 'yue', kidMode: false, lastFemale: 'a02-shibu',
      })],
    ]);
    g.localStorage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => { map.set(k, v); },
      removeItem: (k: string) => { map.delete(k); },
      clear: () => map.clear(),
      key: () => null,
      length: 0,
    } as Storage;
    const p = loadPrefs();
    expect(p.character).toBe('a98-ethan');
    expect(p.lastFemale).toBe('a02-shibu');
    g.localStorage = prev;
  });
});
