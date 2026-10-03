import { describe, expect, it } from 'vitest';
// Cast & scene data integrity — r2026-10-04.50 pins the whole 22-character
// cast to LOCAL anime VRMs under /models/cast (the remote Polygonal Mind
// registry is retired: those models shipped no emotional presets and odd
// rest poses).
import { BACKGROUNDS, CHARACTERS, characterById, backgroundById, DEFAULT_PREFS, type Lang } from '../lib/prefs';
import { CAST_NO, castNo } from '../lib/castNo';

describe('cast roster', () => {
  it('has 22 characters with portraits, taglines in every language, and personas', () => {
    expect(CHARACTERS.length).toBe(22);
    for (const c of CHARACTERS) {
      // local portraits live under /portraits; the registry six carry remote thumbs
      const img = c.image ?? '';
      if (img.startsWith('/')) expect(img).toBe(`/portraits/${c.id}.jpg`);
      else expect(img).toMatch(/^https:\/\/arweave\.net\//);
      for (const l of ['en', 'yue', 'zh', 'ja'] as Lang[]) expect(c.tagline[l].length).toBeGreaterThan(0);
      expect(c.persona.length).toBeGreaterThan(20);
      expect(['female', 'male']).toContain(c.gender);
    }
  });

  it('every character maps to a local cast VRM — no remote models (r.50)', () => {
    for (const c of CHARACTERS) {
      expect(c.model).toMatch(/^cast\/[a-z0-9-]+\.vrm$/);
    }
    // all 22 local models are distinct — each character is her/his own person
    expect(new Set(CHARACTERS.map((c) => c.model)).size).toBe(CHARACTERS.length);
  });

  it('every character has a stable number — unique, 1..22 (r.51)', () => {
    const numbers = CHARACTERS.map((c) => castNo(c.id));
    for (const n of numbers) expect(n).toBeGreaterThanOrEqual(1);
    expect(new Set(numbers).size).toBe(CHARACTERS.length);
    // the map and the roster cover exactly the same ids
    expect(Object.keys(CAST_NO).sort()).toEqual(CHARACTERS.map((c) => c.id).sort());
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
