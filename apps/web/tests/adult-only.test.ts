import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { DEFAULT_PREFS, loadPrefs, savePrefs, type Prefs } from '../lib/prefs';

const web = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(web, rel), 'utf8');

function withStorage(initial?: Record<string, string>) {
  const g = globalThis as { localStorage?: Storage };
  const prev = g.localStorage;
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  g.localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  return { map, restore: () => { g.localStorage = prev; } };
}

const PREFS_KEY = 'amoji.prefs.v1';

describe('adult-only product — Kid Mode is unreachable', () => {
  it('a stored kidMode:true is forced false on load and rewritten', () => {
    const { map, restore } = withStorage({
      [PREFS_KEY]: JSON.stringify({
        character: 'a01-shino', background: 'void', lang: 'yue', kidMode: true, lastFemale: 'a01-shino',
      }),
    });
    const p = loadPrefs();
    expect(p.kidMode).toBe(false);
    // The field is RETAINED in storage (migration safety), just pinned false.
    expect(JSON.parse(map.get(PREFS_KEY)!).kidMode).toBe(false);
    restore();
  });

  it('the user keeps their character and scene instead of being swapped to kid defaults', () => {
    // The old behaviour rewrote a non-kidSafe pick back to the wholesome
    // defaults. An adult must keep what they actually chose.
    const { map, restore } = withStorage({
      [PREFS_KEY]: JSON.stringify({
        character: 'a98-ethan', background: 'rain', lang: 'en', kidMode: true,
      }),
    });
    const p = loadPrefs();
    expect(p.character).toBe('a98-ethan');
    expect(p.background).toBe('rain');
    expect(p.kidMode).toBe(false);
    expect(map.get(PREFS_KEY)).toContain('"kidMode":false');
    restore();
  });

  it('savePrefs refuses to persist kidMode:true even if a caller hands one in', () => {
    const { map, restore } = withStorage();
    const p: Prefs = { ...DEFAULT_PREFS, kidMode: true };
    savePrefs(p);
    expect(JSON.parse(map.get(PREFS_KEY)!).kidMode).toBe(false);
    restore();
  });

  it('the kidMode field still exists in the type (data retained for migration)', () => {
    expect(DEFAULT_PREFS.kidMode).toBe(false);
    expect('kidMode' in DEFAULT_PREFS).toBe(true);
  });

  it('an imported .aigf card carrying kidMode:true cannot re-enable it', () => {
    // Cards exported before the decision still say settings.kidMode. The
    // parser keeps accepting the format, but the field is never applied.
    const src = read('lib/companion-file.ts');
    expect(src).toContain('kidMode: false');
    expect(src).not.toContain('kidMode: !!f.settings?.kidMode');
  });
});

describe('adult-only product — no kid-mode UI remains', () => {
  it('Settings has no kid toggle and states the 18+ positioning', () => {
    const sheet = read('components/SettingsSheet.tsx');
    expect(sheet).not.toContain('toggleKid');
    expect(sheet).not.toContain("<Toggle label={t(lang, 'kidMode')}");
    expect(sheet).not.toContain('KID_CHARACTER');
    expect(sheet).not.toContain('KID_BACKGROUND');
    expect(sheet).toContain("t(lang, 'settingsAdultOnly')");
  });

  it('the selection board shows the whole cast and every scene', () => {
    const board = read('components/SelectionBoard.tsx');
    expect(board).not.toContain('kidSafe');
    expect(board).not.toContain('KID_CHARACTER');
    expect(board).toContain('// Every scene, in the fixed daytime');
    expect(board).toContain('const scenes = BACKGROUNDS;');
  });

  it('no surface still renders a 🧸 kid badge', () => {
    for (const rel of [
      'components/StatusPlate.tsx',
      'components/SelectionBoard.tsx',
      'components/SettingsSheet.tsx',
    ]) {
      expect(read(rel), rel).not.toContain('🧸');
    }
  });

  it('SelectTopBars keeps its chat/story chips and no kid control', () => {
    const bars = read('components/SelectTopBars.tsx');
    expect(bars).not.toContain('select-mode-kid');
    expect(bars).not.toContain('kidMode');
    expect(bars).toContain('select-mode-chat');
    expect(bars).toContain('select-mode-story');
  });
});
