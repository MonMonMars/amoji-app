import { INTERJECTIONS } from '../lib/fillers';
import { describe, expect, it } from 'vitest';
import { INTERJECTION_AT, MOOD_FILLERS, THINKING_FILLERS, dominant, pickInterjection, pickThinkingFiller } from '../lib/fillers';

describe('fillers', () => {
  it('rotates thinking fillers per call', () => {
    const a = pickThinkingFiller('en');
    const b = pickThinkingFiller('en');
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
  });
  it('keeps loading fillers to a sound or one tiny think/search line', () => {
    const langs = ['yue', 'zh', 'ja', 'en'] as const;
    expect(THINKING_FILLERS.en).toContain('um……');
    expect(THINKING_FILLERS.en).toContain('um…… let me search the web.');
    for (const lang of langs) {
      for (const line of THINKING_FILLERS[lang]) {
        expect(line.length, line).toBeLessThanOrEqual(32);
      }
    }
    for (const bank of Object.values(MOOD_FILLERS)) {
      for (const lang of langs) {
        for (const line of bank[lang]) expect(line.length, line).toBeLessThanOrEqual(32);
      }
    }
  });
  it('falls back to English fillers for unknown languages', () => {
    expect(pickThinkingFiller('fr').length).toBeGreaterThan(0);
  });
  it('gives an interjection only for strong emotions', () => {
    expect(pickInterjection('joy', INTERJECTION_AT + 0.1, 'en')?.text).toBeTruthy();
    expect(pickInterjection('joy', INTERJECTION_AT - 0.1, 'en')).toBeUndefined();
    expect(pickInterjection('boredom', 0.95, 'en')).toBeUndefined(); // no tic mapped
  });
  it('has Cantonese tics for the default language', () => {
    expect(pickInterjection('surprise', 0.9, 'yue')?.text).toContain('咦');
    expect(pickInterjection('sadness', 0.9, 'yue')?.text).toContain('唉');
  });
  it('dominant picks the strongest hint above the cutoff', () => {
    expect(dominant({ joy: 0.8, neutral: 0.4 }).emotion).toBe('joy');
    expect(dominant({ joy: 0.3 }).emotion).toBe('neutral');
    expect(dominant(undefined).emotion).toBe('neutral');
  });
});

describe('t771 joy interjection', () => {
  it('does not TTS hehe/haha for joy', () => {
    const joy = INTERJECTIONS.joy!;
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      const text = (joy[lang]?.text ?? '').toLowerCase();
      expect(text).not.toMatch(/hehe|haha|哈哈|ふふ/);
    }
  });
});

describe('soft mood interjections', () => {
  it('maps love/relief/contentment/pride without laugh tokens', () => {
    for (const emotion of ['love', 'relief', 'contentment', 'pride'] as const) {
      const hit = pickInterjection(emotion, 0.9, 'en');
      expect(hit?.text, emotion).toBeTruthy();
      expect((hit?.text ?? '').toLowerCase()).not.toMatch(/hehe|haha|hey\s*hey/);
    }
  });
});
