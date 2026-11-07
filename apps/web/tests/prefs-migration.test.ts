import { describe, expect, it } from 'vitest';
import {
  CHARACTERS, DEFAULT_PREFS, characterById, femaleLibraryId, loadPrefs, retiredReplacement,
} from '../lib/prefs';
import { RETIRED_CAST_IDS, castNo } from '../lib/castNo';
import { resolveMiniGameCompanion } from '../lib/minigames/companion';

const PREFS_KEY = 'amoji.prefs.v1';

/** The localStorage the app actually sees on a returning user's device. */
function withPrefs(stored: Record<string, unknown>) {
  const g = globalThis as { localStorage?: Storage };
  const prev = g.localStorage;
  const map = new Map<string, string>([[PREFS_KEY, JSON.stringify(stored)]]);
  g.localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  return {
    load: () => loadPrefs(),
    raw: () => map.get(PREFS_KEY) ?? '',
    restore: () => { g.localStorage = prev; },
  };
}

describe('loadPrefs migration', () => {
  it('rewrites stale roster ids to a01-shino and persists', () => {
    const h = withPrefs({ character: 'juno', background: 'void', lang: 'yue', kidMode: false });
    const p = h.load();
    expect(p.character).toBe(DEFAULT_PREFS.character);
    expect(CHARACTERS.some((c) => c.id === p.character)).toBe(true);
    expect(h.raw()).toContain('"character":"a01-shino"');
    expect(p.lastFemale).toBe('a01-shino');
    h.restore();
  });

  it('keeps a male pick and remembers the last female library companion', () => {
    const h = withPrefs({
      character: 'a98-ethan', background: 'void', lang: 'yue', kidMode: false, lastFemale: 'a02-shibu',
    });
    const p = h.load();
    expect(p.character).toBe('a98-ethan');
    expect(p.lastFemale).toBe('a02-shibu');
    h.restore();
  });
});

describe('a pick that was removed from the roster', () => {
  // a04/a05 were pulled on 2026-11-08 (VRoidPreset originals, not
  // redistributable for a fee). Someone who picked one before that must still
  // get a working companion, not a blank character or a crash.
  const RETIRED = ['a04-avatarsample-a', 'a05-avatarsample-c'];

  it('only lists ids that really are gone from the roster', () => {
    expect([...RETIRED_CAST_IDS].sort()).toEqual([...RETIRED].sort());
    for (const id of RETIRED_CAST_IDS) {
      expect(CHARACTERS.some((c) => c.id === id), id).toBe(false);
    }
  });

  it('migrates the saved pick to a companion the app still ships, and persists', () => {
    for (const id of RETIRED) {
      const h = withPrefs({ character: id, background: 'void', lang: 'yue', kidMode: false });
      const p = h.load();
      expect(p.character, id).not.toBe(id);
      // Not merely "some character" — a real, pickable one.
      expect(CHARACTERS.some((c) => c.id === p.character), id).toBe(true);
      expect(p.character).toBe(retiredReplacement(id));
      expect(characterById(p.character).model).toMatch(/^want\//);
      // and the migration is written back, so it happens once
      expect(h.raw(), id).toContain(`"character":"${p.character}"`);
      h.restore();
    }
  });

  it('does not send the user all the way back to the default', () => {
    // A silent reset to a01-shino is the lazy fallback; the migration should
    // land on the nearest still-shipping sample instead.
    for (const id of RETIRED) expect(retiredReplacement(id)).not.toBe(DEFAULT_PREFS.character);
  });

  it('preserves the gender of the pick it replaces', () => {
    // a04 was female, a05 was male. Landing a male pick on a female companion
    // would also silently rewrite lastFemale.
    expect(characterById(retiredReplacement('a04-avatarsample-a')).gender).toBe('female');
    expect(characterById(retiredReplacement('a05-avatarsample-c')).gender).toBe('male');
  });

  it('keeps lastFemale consistent with the migrated pick', () => {
    // a04 lands on a female companion, so lastFemale follows the pick — the same
    // rule any female selection follows.
    const female = withPrefs({
      character: 'a04-avatarsample-a', background: 'void', lang: 'yue', kidMode: false, lastFemale: 'a16-vita',
    });
    expect(female.load().lastFemale).toBe('a02-shibu');
    female.restore();

    // a05 lands on a male companion, so the remembered female must survive
    // rather than be overwritten by the replacement.
    const male = withPrefs({
      character: 'a05-avatarsample-c', background: 'void', lang: 'yue', kidMode: false, lastFemale: 'a16-vita',
    });
    const p = male.load();
    expect(p.character).toBe('a24-hairsample-male');
    expect(p.lastFemale).toBe('a16-vita');
    male.restore();
  });

  it('still resolves the retired id to a real character through characterById', () => {
    for (const id of RETIRED) {
      expect(characterById(id).id).not.toBe(id);
      expect(CHARACTERS.some((c) => c.id === characterById(id).id)).toBe(true);
    }
  });

  it('keeps the retired badge number so it never reads as an unknown id', () => {
    expect(castNo('a04-avatarsample-a')).toBe(4);
    expect(castNo('a05-avatarsample-c')).toBe(5);
  });

  it('gives a minigame a playable companion instead of the removed mesh', () => {
    for (const id of RETIRED) {
      const companion = resolveMiniGameCompanion(id);
      expect(CHARACTERS.some((c) => c.id === companion.id), id).toBe(true);
      expect(companion.gender, id).toBe('female');
      expect(companion.model, id).toMatch(/^want\//);
    }
  });

  it('a retired id is not a female library id either', () => {
    for (const id of RETIRED) expect(femaleLibraryId(id)).toBeUndefined();
  });
});
