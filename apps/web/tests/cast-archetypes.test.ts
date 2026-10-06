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
  it('both maps cover the whole cast — nobody silently shares cheerful', () => {
    // r2026-10-05.118: the maps keep entries for the deleted cast (the
    // face-lab page still demos them), so the check is roster ⊆ map, not
    // map == roster.
    const castIds = CHARACTERS.map((c) => c.id).sort();
    for (const id of castIds) {
      expect(LAUGH_ARCHETYPE[id], `laugh archetype for ${id}`).toBeTruthy();
      expect(OUCH_ARCHETYPE[id], `ouch archetype for ${id}`).toBeTruthy();
    }
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
    // r2026-10-05.118 survivors: marin playful, nova cheerful, kasumi gentle,
    // onyx cool, ember fiery
    const reps = ['marin', 'nova', 'kasumi', 'onyx', 'ember'];
    const laughs = reps.map((id) => pickLaugh(id, 'en', 0));
    const ouches = reps.map((id) => pickOuch(id, 'en', 0));
    expect(new Set(laughs).size).toBe(FLAVORS.length);
    expect(new Set(ouches).size).toBe(FLAVORS.length);
  });
});
