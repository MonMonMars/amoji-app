import { describe, expect, it } from 'vitest';
import { MUSIC_THEMES, getTheme, noteFreq, melodyStep, bassStep } from '../lib/music';

describe('procedural backing-track themes (r2026-10-04.48)', () => {
  it('has a default theme plus per-character themes, all musically sane', () => {
    expect(MUSIC_THEMES.default).toBeDefined();
    expect(Object.keys(MUSIC_THEMES).length).toBeGreaterThanOrEqual(6);
    for (const theme of Object.values(MUSIC_THEMES)) {
      expect(theme.bpm).toBeGreaterThanOrEqual(60);
      expect(theme.bpm).toBeLessThanOrEqual(140);
      expect(['sine', 'triangle', 'square', 'sawtooth']).toContain(theme.wave);
      expect(theme.progression.length).toBeGreaterThanOrEqual(2);
      expect(theme.scale.length).toBeGreaterThanOrEqual(5);
      expect(theme.volume).toBeGreaterThan(0);
      expect(theme.volume).toBeLessThanOrEqual(0.2);
    }
  });

  it('A4 reference and octave math', () => {
    expect(noteFreq(0)).toBeCloseTo(440, 6);
    expect(noteFreq(12)).toBeCloseTo(880, 6);
    expect(noteFreq(-12)).toBeCloseTo(220, 6);
  });

  it('melody walks inside an audible, sane window and is deterministic', () => {
    const theme = getTheme('marin');
    for (let s = 0; s < 64; s++) {
      const m = melodyStep(theme, s);
      expect(m).toBeGreaterThanOrEqual(-24);
      expect(m).toBeLessThanOrEqual(48);
      expect(melodyStep(theme, s)).toBe(m);
      expect(noteFreq(m)).toBeGreaterThan(120);
      expect(noteFreq(m)).toBeLessThanOrEqual(4200);
    }
  });

  it('bass sits an octave-plus below the melody', () => {
    const theme = getTheme('juno');
    for (let s = 0; s < 32; s++) {
      expect(bassStep(theme, s)).toBeLessThanOrEqual(melodyStep(theme, s) - 12);
    }
  });

  it('unknown characters fall back to the default theme', () => {
    expect(getTheme('whoever')).toBe(MUSIC_THEMES.default);
  });
});
