import { describe, expect, it, vi } from 'vitest';
import { interactionLines, maybeLaughLead, pickCharacterInteraction } from '../lib/interaction-lines';
import { FEMALE_PERSONALITIES, MALE_PERSONALITIES, profilePokeLine } from '../lib/personality';

const ZONES = ['head', 'torso', 'chest', 'side', 'back', 'hand'] as const;

describe('interaction lines', () => {
  it('has more than 10 cheerful lines per personality and zone', () => {
    for (const p of [...FEMALE_PERSONALITIES, ...MALE_PERSONALITIES]) {
      for (const zone of ZONES) {
        const lines = interactionLines(p, zone, 'yue');
        expect(lines.length).toBeGreaterThan(10);
        for (const line of lines) {
          expect(line).not.toMatch(/痛|討厭|讨厌|angry|hate/i);
          expect(/[?？]/.test(line)).toBe(true);
        }
      }
    }
  });

  it('poke laugh lead is a soft chuckle, not a yelped bang', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const lead = maybeLaughLead('en');
      expect(lead?.text).toBeTruthy();
      expect(lead!.text).not.toMatch(/[!！~～…]/);
      expect(lead!.pitch).toBeLessThanOrEqual(0.08);
      expect(lead!.rate).toBeLessThanOrEqual(0.06);
      expect(maybeLaughLead('yue')!.text).not.toMatch(/[!！]/);
    } finally {
      spy.mockRestore();
    }
  });

  it('poke talk is a short question, not a paragraph', () => {
    const line = pickCharacterInteraction('a01-shino', 'female', 'head', 'en');
    expect(line.length).toBeLessThan(48);
    expect(line.endsWith('?') || /[?？]/.test(line)).toBe(true);
    expect(line.split(/[.!?]/).filter(Boolean).length).toBeLessThan(3);
  });

  it('male and female personalities do not share the same opening vibe in English', () => {
    const a = pickCharacterInteraction('a01-shino', 'female', 'hand', 'en');
    const b = pickCharacterInteraction('a98-ethan', 'male', 'hand', 'en');
    expect(a.length).toBeGreaterThan(8);
    expect(b.length).toBeGreaterThan(8);
    expect(a).not.toBe(b);
  });

  it('switching characters changes the spoken poke line', () => {
    const a = profilePokeLine('a01-shino', 'en', 0, 'hand', 'female');
    const b = profilePokeLine('a02-shibu', 'en', 0, 'hand', 'female');
    const c = profilePokeLine('a98-ethan', 'en', 0, 'hand', 'male');
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });
});
