import { describe, expect, it } from 'vitest';
import { adaptiveBlock, pickSceneLine, SCENE_LINES } from '../lib/adaptive';
import { BACKGROUNDS } from '../lib/prefs';

describe('adaptive scene lines', () => {
  it('covers every backdrop with ≥3 lines in every language', () => {
    for (const bg of BACKGROUNDS) {
      const banks = SCENE_LINES[bg.id];
      expect(banks, bg.id).toBeTruthy();
      for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
        expect(banks[lang]?.length ?? 0, `${bg.id}.${lang}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
  it('ends every line with a question or invitation (continuity)', () => {
    for (const banks of Object.values(SCENE_LINES)) {
      for (const lines of Object.values(banks)) {
        for (const line of lines) {
          expect(/[?？~〜…]$/.test(line.trim()), line).toBe(true);
        }
      }
    }
  });
  it('pickSceneLine is deterministic; unknown scenes return undefined', () => {
    expect(pickSceneLine('void', 'en', 0)).toBe(pickSceneLine('void', 'en', 0));
    expect(pickSceneLine('void', 'en', 3)).toBe(pickSceneLine('void', 'en', 0)); // 3 lines → wraps
    expect(pickSceneLine('nope-unknown', 'en', 0)).toBeUndefined();
  });
});

describe('adaptiveBlock', () => {
  const base = { sceneId: 'sakura', sceneName: 'Sakura', characterGender: 'female' as const, kidMode: false };
  it('always names the scene', () => {
    expect(adaptiveBlock({ ...base, userGender: 'secret' })).toContain('Sakura');
  });
  it('secret gender adds NO gender guidance at all', () => {
    const b = adaptiveBlock({ ...base, userGender: 'secret' });
    expect(b).not.toContain('user is a man');
    expect(b).not.toContain('user is a woman');
    expect(b).not.toContain('same gender');
  });
  it('opposite-sex pairing gets gentle-affection guidance', () => {
    const b = adaptiveBlock({ ...base, userGender: 'male' });
    expect(b).toContain('user is a man');
    expect(b.toLowerCase()).toContain('affection');
  });
  it('same-gender pairing gets best-mate tone', () => {
    const b = adaptiveBlock({ ...base, characterGender: 'male', userGender: 'male' });
    expect(b).toContain('same gender');
  });
  it('kid mode keeps everything friendship-only regardless of gender', () => {
    const b = adaptiveBlock({ ...base, userGender: 'male', kidMode: true });
    expect(b.toLowerCase()).toContain('friend');
    expect(b.toLowerCase()).toContain('no romance');
  });
});
