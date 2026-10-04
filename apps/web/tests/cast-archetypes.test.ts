import { describe, expect, it } from 'vitest';
// r2026-10-04.74 — full-cast cry archetypes. The laugh/poke personality maps
// must cover every character in the roster: a cast member without an entry
// silently fell back to the cheerful bank, so 16 of the 29 companions all
// squeaked the same "Ah!" when poked and giggled the same "Haha!".
import { CHARACTERS } from '../lib/prefs';
import { ARCHETYPE as LAUGH_ARCHETYPE, pickLaugh } from '../lib/laugh';
import { ARCHETYPE as OUCH_ARCHETYPE, pickOuch } from '../lib/ouch';

const LANGS4 = ['yue', 'zh', 'ja', 'en'] as const;
const FLAVORS = ['playful', 'cheerful', 'gentle', 'cool', 'fiery'];

describe('full-cast cry archetypes (r2026-10-04.74)', () => {
  it('both maps cover exactly the cast — nobody silently shares cheerful', () => {
    const castIds = CHARACTERS.map((c) => c.id).sort();
    expect(Object.keys(LAUGH_ARCHETYPE).sort()).toEqual(castIds);
    expect(Object.keys(OUCH_ARCHETYPE).sort()).toEqual(castIds);
  });

  it('all five flavors are represented in both maps (no flavor dead-ends)', () => {
    for (const map of [LAUGH_ARCHETYPE, OUCH_ARCHETYPE]) {
      const used = Object.values(map);
      for (const f of FLAVORS) expect(used).toContain(f);
    }
  });

  it('unknown characters still fall back to the cheerful bank, deterministically', () => {
    for (const lang of LANGS4) {
      expect(pickLaugh('nobody', lang, 0)).toBe(pickLaugh('juno', lang, 0));
      expect(pickOuch('nobody', lang, 1)).toBe(pickOuch('juno', lang, 1));
    }
  });

  it('the five archetypes genuinely sound different (en, first pick)', () => {
    // mochi playful, nova cheerful, luna gentle, kai cool, blaze fiery
    const reps = ['mochi', 'nova', 'luna', 'kai', 'blaze'];
    const laughs = reps.map((id) => pickLaugh(id, 'en', 0));
    const ouches = reps.map((id) => pickOuch(id, 'en', 0));
    expect(new Set(laughs).size).toBe(FLAVORS.length);
    expect(new Set(ouches).size).toBe(FLAVORS.length);
  });
});
