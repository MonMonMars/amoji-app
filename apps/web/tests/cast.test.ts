import { describe, expect, it } from 'vitest';
// Cast & scene data integrity for the r2026-10-03.01 expansion.
import { BACKGROUNDS, CHARACTERS, characterById, backgroundById, DEFAULT_PREFS, type Lang } from '../lib/prefs';

describe('cast roster', () => {
  it('has 15 characters with portraits, taglines in every language, and personas', () => {
    expect(CHARACTERS.length).toBe(15);
    for (const c of CHARACTERS) {
      expect(c.image).toBe(`/portraits/${c.id}.jpg`);
      for (const l of ['en', 'yue', 'zh', 'ja'] as Lang[]) expect(c.tagline[l].length).toBeGreaterThan(0);
      expect(c.persona.length).toBeGreaterThan(20);
      expect(['female', 'male']).toContain(c.gender);
    }
  });

  it('includes the extended cast from the rigmodels wishlist', () => {
    for (const id of ['tifa', 'aerith', 'cloud', 'kasumi', 'marin', 'ayane', 'hitomi']) {
      expect(characterById(id).id).toBe(id);
    }
  });

  it('falls back to the first character for unknown ids', () => {
    expect(characterById('nobody').id).toBe(CHARACTERS[0]!.id);
  });
});

describe('scene roster', () => {
  it('every scene ships a painted image, gradient fallback, and an fx layer', () => {
    expect(BACKGROUNDS.length).toBe(12);
    for (const b of BACKGROUNDS) {
      expect(b.image).toBe(`/backgrounds/${b.id}.jpg`);
      expect(b.fx).toBeTruthy();
      expect(b.css.length).toBeGreaterThan(10);
      expect(b.scene).toMatch(/^#/);
    }
  });

  it('scene ids stay unique and the default pref resolves', () => {
    expect(new Set(BACKGROUNDS.map((b) => b.id)).size).toBe(BACKGROUNDS.length);
    expect(backgroundById(DEFAULT_PREFS.background).id).toBe(DEFAULT_PREFS.background);
  });
});

describe('kid mode roster', () => {
  it('at least 4 wholesome characters incl. mochi, and 4 sunny scenes incl. meadow', () => {
    const safe = CHARACTERS.filter((c) => c.kidSafe);
    expect(safe.length).toBeGreaterThanOrEqual(4);
    expect(safe.map((c) => c.id)).toContain('mochi');
    const sunny = BACKGROUNDS.filter((b) => b.kidSafe);
    expect(sunny.length).toBeGreaterThanOrEqual(4);
    expect(sunny.map((b) => b.id)).toContain('meadow');
  });
});
