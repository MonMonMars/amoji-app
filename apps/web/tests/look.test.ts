import { describe, expect, it } from 'vitest';
// r2026-10-03.28: per-character look data — every cast member gets a
// material tint + build so the shared 3D model reads as a different person.
import { CHARACTERS } from '../lib/prefs';
import { CHARACTER_LOOKS, lookFor } from '../lib/persona';

describe('character looks', () => {
  it('every character has a curated look with sane values', () => {
    for (const c of CHARACTERS) {
      const look = CHARACTER_LOOKS[c.id];
      expect(look, c.id).toBeTruthy();
      expect(look!.tint).toMatch(/^#[0-9a-f]{6}$/i);
      expect(look!.height).toBeGreaterThan(0.85);
      expect(look!.height).toBeLessThan(1.15);
      expect(look!.width).toBeGreaterThan(0.85);
      expect(look!.width).toBeLessThan(1.15);
    }
  });

  it('male builds run broader than the average female build', () => {
    const avg = (g: string) => {
      const ws = CHARACTERS.filter((c) => c.gender === g).map((c) => CHARACTER_LOOKS[c.id]!.width);
      return ws.reduce((a, b) => a + b, 0) / ws.length;
    };
    expect(avg('male')).toBeGreaterThan(avg('female'));
  });

  it('unknown ids fall back to the neutral look', () => {
    expect(lookFor('nobody')).toEqual({ tint: '#ffffff', height: 1, width: 1 });
  });
});
