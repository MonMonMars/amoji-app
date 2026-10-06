import { beforeEach, describe, expect, it } from 'vitest';
// r2026-10-05.122 — the Companion Card (.aigf): export must capture every
// store, and import must restore them bit-for-bit so she comes back on a
// new device with memory, voice settings and history intact.
import {
  buildCompanionFile, parseCompanionFile, applyCompanionFile,
  COMPANION_FORMAT, COMPANION_VERSION,
} from '../lib/companion-file';
import { savePrefs, loadPrefs } from '../lib/prefs';
import { saveHistory, loadHistory } from '../lib/companion-store';
import { addEntry, loadMemory } from '../lib/memory';
import { saveProfile, loadProfile } from '../lib/profile';

const mem = new Map<string, string>();
const ls = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
};

describe('companion card (.aigf) round-trip', () => {
  beforeEach(() => {
    mem.clear();
    (globalThis as { localStorage?: Storage }).localStorage = ls as unknown as Storage;
    // applyCompanionFile reloads the page — stub it out
    (globalThis as { window?: unknown }).window = { location: { reload: () => undefined } };
  });

  it('captures prefs, history, memory and profile', () => {
    savePrefs({ character: 'nova', background: 'sakura', lang: 'yue', kidMode: false });
    saveHistory([{ role: 'user', content: 'hi nova' }, { role: 'assistant', content: 'hey you!' }]);
    addEntry('event', 'Simon likes cantonese pop', loadMemory());
    saveProfile({ name: 'Simon', gender: 'male' });
    const card = buildCompanionFile('r-test');
    expect(card.format).toBe(COMPANION_FORMAT);
    expect(card.version).toBe(COMPANION_VERSION);
    expect(card.identity.characterId).toBe('nova');
    expect(card.history).toHaveLength(2);
    expect(card.human.name).toBe('Simon');
    expect(card.memory.entries?.length ?? 0).toBeGreaterThan(0);
  });

  it('export → wipe → import restores everything', () => {
    savePrefs({ character: 'ember', background: 'rain', lang: 'ja', kidMode: false });
    saveHistory([{ role: 'user', content: 'sing for me' }]);
    addEntry('event', 'First meeting at the café', loadMemory());
    saveProfile({ name: 'Simon', gender: 'male' });
    const json = JSON.stringify(buildCompanionFile('r-test'));

    // wipe the device
    mem.clear();
    expect(loadHistory()).toHaveLength(0);

    applyCompanionFile(parseCompanionFile(json));
    expect(loadPrefs().character).toBe('ember');
    expect(loadPrefs().background).toBe('rain');
    expect(loadPrefs().lang).toBe('ja');
    expect(loadPrefs().kidMode).toBe(false);
    expect(loadHistory()).toEqual([{ role: 'user', content: 'sing for me' }]);
    expect(loadProfile().name).toBe('Simon');
    const memoryText = JSON.stringify(loadMemory());
    expect(memoryText).toContain('café');
  });

  it('rejects garbage with a readable reason', () => {
    expect(() => parseCompanionFile('not json')).toThrow('not JSON');
    expect(() => parseCompanionFile('{"format":"something-else"}')).toThrow('wrong format');
    expect(() => parseCompanionFile('{"format":"amoji-companion","version":99,"identity":{"characterId":"x"},"history":[]}')).toThrow('unsupported version');
  });

  it('an unknown character id falls back to the current pick, soul intact', () => {
    savePrefs({ character: 'kizuna', background: 'void', lang: 'yue', kidMode: false });
    const card = buildCompanionFile('r-test');
    card.identity.characterId = 'someone-from-another-app';
    card.history = [{ role: 'assistant', content: 'I remember you.' }];
    applyCompanionFile(card);
    expect(loadPrefs().character).toBe('kizuna');
    expect(loadHistory()[0]!.content).toBe('I remember you.');
  });
});
