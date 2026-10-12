import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../lib/prefs';
import { lookFor } from '../lib/persona';

describe('character looks', () => {
  it('every character has a look via lookFor (curated or neutral default)', () => {
    for (const c of CHARACTERS) {
      const look = lookFor(c.id);
      expect(look, c.id).toBeTruthy();
      expect(look.tint).toMatch(/^#[0-9a-f]{6}$/i);
      expect(look.height).toBeGreaterThan(0.85);
      expect(look.height).toBeLessThan(1.15);
      expect(look.width).toBeGreaterThan(0.85);
      expect(look.width).toBeLessThan(1.15);
    }
  });

  it('male builds run broader than the average female build (when curated)', () => {
    const avg = (g: string) => {
      const ws = CHARACTERS.filter((c) => c.gender === g).map((c) => lookFor(c.id).width);
      return ws.reduce((a, b) => a + b, 0) / ws.length;
    };
    expect(avg('male')).toBeGreaterThan(avg('female'));
  });

  it('unknown ids fall back to the neutral look', () => {
    expect(lookFor('nobody')).toEqual({ tint: '#ffffff', height: 1, width: 1 });
  });
});
