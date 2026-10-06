import { describe, expect, it } from 'vitest';
// Cast & scene data integrity — r2026-10-05.118 pins the trimmed 10-character
// cast (Master Simon's 22:35 cut: old #5–18, #21–29 and #33 deleted;
// kitagawa promoted to #1 + default). All survivors are local companions
// under /models/cast.
import { BACKGROUNDS, CHARACTERS, characterById, backgroundById, DEFAULT_PREFS, type Lang } from '../lib/prefs';
import { CAST_NO, castNo } from '../lib/castNo';

describe('cast roster', () => {
  it('has 10 characters with taglines in every language and personas', () => {
    expect(CHARACTERS.length).toBe(10);
    for (const c of CHARACTERS) {
      // local portraits under /portraits — the classic cast uses AI-painted
      // .jpg art, the flagship/rebadged cast uses agent3-rendered .png; the
      // remote community cast ships no portrait at all (the board renders a
      // runtime thumbnail straight from the model instead)
      const img = c.image ?? '';
      if (img === '') {
        // remote cast — no shipped portrait, thumbnail is runtime-rendered
      } else if (img.startsWith('/')) {
        expect(img).toMatch(/^\/portraits\/[a-z0-9-]+\.(jpg|png)$/);
      } else {
        expect(img).toMatch(/^https:\/\//);
      }
      for (const l of ['en', 'yue', 'zh', 'ja'] as Lang[]) expect(c.tagline[l].length).toBeGreaterThan(0);
      expect(c.persona.length).toBeGreaterThan(20);
      expect(['female', 'male']).toContain(c.gender);
    }
  });

  it('every character maps to a fetchable model — local cast/ or approved remote (r.104)', () => {
    for (const c of CHARACTERS) {
      expect(c.model).toMatch(/^(cast\/[a-z0-9-]+\.vrm|https:\/\/raw\.githubusercontent\.com\/test157t\/VRM-Assets-Pack-For-Silly-Tavern\/main\/model\/[A-Za-z]+\.vrm)$/);
    }
    // all 33 models are distinct — each character is her/his own person
    expect(new Set(CHARACTERS.map((c) => c.model)).size).toBe(CHARACTERS.length);
  });

  it('every character has a stable number — unique, 1..10 (r.118)', () => {
    const numbers = CHARACTERS.map((c) => castNo(c.id));
    for (const n of numbers) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(10);
    }
    expect(new Set(numbers).size).toBe(CHARACTERS.length);
    // the map and the roster cover exactly the same ids
    expect(Object.keys(CAST_NO).sort()).toEqual(CHARACTERS.map((c) => c.id).sort());
  });

  it('the whole roster resolves by id — kitagawa first, then the veterans', () => {
    expect(CHARACTERS[0]!.id).toBe('kitagawa');
    for (const c of CHARACTERS) {
      expect(characterById(c.id).id).toBe(c.id);
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
  it('at least 4 wholesome characters incl. dhahlia, and 4 sunny scenes incl. meadow', () => {
    const safe = CHARACTERS.filter((c) => c.kidSafe);
    expect(safe.length).toBeGreaterThanOrEqual(4);
    expect(safe.map((c) => c.id)).toContain('dhahlia');
    const sunny = BACKGROUNDS.filter((b) => b.kidSafe);
    expect(sunny.length).toBeGreaterThanOrEqual(4);
    expect(sunny.map((b) => b.id)).toContain('meadow');
  });
});
