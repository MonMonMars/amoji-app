import { describe, expect, it } from 'vitest';
import { INTERJECTION_AT, dominant, pickInterjection, pickThinkingFiller } from '../lib/fillers';

describe('fillers', () => {
  it('rotates thinking fillers per call', () => {
    const a = pickThinkingFiller('en');
    const b = pickThinkingFiller('en');
    expect(a.length).toBeGreaterThan(0);
    expect(a).not.toBe(b);
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
