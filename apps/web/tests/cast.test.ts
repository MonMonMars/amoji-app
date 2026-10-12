import { describe, expect, it } from 'vitest';
import {
  BACKGROUNDS, CHARACTERS, characterById, backgroundById, DEFAULT_PREFS, KID_CHARACTER, WANT_CAST_RELEASE, type Lang,
} from '../lib/prefs';
import { CAST_NO, castNo } from '../lib/castNo';

const RELEASE =
  'https://github.com/MonMonMars/amoji-app/releases/download/free-library-want-2026-10-12/';

describe('cast roster', () => {
  it('has 46 free-library want-list characters with taglines in every language', () => {
    expect(CHARACTERS.length).toBe(46);
    expect(WANT_CAST_RELEASE).toBe('free-library-want-2026-10-12');
    for (const c of CHARACTERS) {
      const img = c.image ?? '';
      expect(img).toMatch(/^https:\/\/github\.com\/MonMonMars\/amoji-app\/releases\/download\//);
      for (const l of ['en', 'yue', 'zh', 'ja'] as Lang[]) expect(c.tagline[l].length).toBeGreaterThan(0);
      expect(c.persona.length).toBeGreaterThan(20);
      expect(['female', 'male']).toContain(c.gender);
      expect(c.kidSafe).toBe(true);
    }
  });

  it('every character maps to a GitHub release VRM (distinct models)', () => {
    for (const c of CHARACTERS) {
      expect(c.model).toMatch(new RegExp(`^${RELEASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-z0-9-]+\\.vrm$`));
    }
    expect(new Set(CHARACTERS.map((c) => c.model)).size).toBe(CHARACTERS.length);
  });

  it('male voice hints differ from female (A24, A98)', () => {
    const male = CHARACTERS.filter((c) => c.gender === 'male');
    expect(male.map((c) => c.id).sort()).toEqual(['a24-hairsample-male', 'a98-ethan'].sort());
    for (const c of male) {
      expect(c.voiceHint?.en).toBe('en-HK-SamNeural');
      expect(c.voiceHint?.yue).toBe('zh-HK-WanLungNeural');
    }
    for (const c of CHARACTERS.filter((x) => x.gender === 'female')) {
      expect(c.voiceHint?.en).toBe('en-HK-YanNeural');
      expect(c.voiceHint?.yue).toBe('zh-HK-HiuGaaiNeural');
    }
  });

  it('every character has a stable number — unique, 1..46', () => {
    const numbers = CHARACTERS.map((c) => castNo(c.id));
    for (const n of numbers) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(46);
    }
    expect(new Set(numbers).size).toBe(CHARACTERS.length);
    expect(Object.keys(CAST_NO).sort()).toEqual(CHARACTERS.map((c) => c.id).sort());
  });

  it('default is a01-shino; roster resolves by id', () => {
    expect(DEFAULT_PREFS.character).toBe('a01-shino');
    expect(CHARACTERS[0]!.id).toBe('a01-shino');
    for (const c of CHARACTERS) {
      expect(characterById(c.id).id).toBe(c.id);
    }
    expect(characterById('kitagawa').id).toBe('a01-shino');
    expect(characterById('nobody').id).toBe('a01-shino');
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
  it('kid fallback is a wholesome female from the want list', () => {
    const safe = CHARACTERS.filter((c) => c.kidSafe);
    expect(safe.length).toBeGreaterThanOrEqual(4);
    expect(KID_CHARACTER).toBe('a02-shibu');
    expect(safe.map((c) => c.id)).toContain(KID_CHARACTER);
    const sunny = BACKGROUNDS.filter((b) => b.kidSafe);
    expect(sunny.length).toBeGreaterThanOrEqual(4);
    expect(sunny.map((b) => b.id)).toContain('meadow');
  });
});
