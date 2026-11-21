import { describe, expect, it } from 'vitest';
import {
  formatClockInZone,
  spokenWorldClock,
  worldClockFacetCount,
} from '../lib/world-clock';

const FIXED = new Date('2026-06-15T14:30:00.000Z');

describe('world-clock (Intl, no network)', () => {
  it('formats Hong Kong clock in yue', () => {
    const clock = formatClockInZone('Asia/Hong_Kong', 'yue', FIXED);
    expect(clock).toMatch(/\d/);
    expect(clock).not.toMatch(/invalid/i);
  });

  it('spokenWorldClock mentions local lead + Hong Kong for yue facet 0', () => {
    const line = spokenWorldClock('yue', 0, FIXED);
    expect(line).toMatch(/你而家大約/);
    expect(line).toMatch(/香港/);
    expect(line).toMatch(/東京/);
    expect(line).toMatch(/倫敦/);
    expect(line).toMatch(/紐約/);
  });

  it('rotates facets on repeat taps', () => {
    const a = spokenWorldClock('en', 0, FIXED);
    const b = spokenWorldClock('en', 1, FIXED);
    expect(a).not.toBe(b);
    expect(worldClockFacetCount()).toBeGreaterThanOrEqual(4);
    expect(spokenWorldClock('en', worldClockFacetCount(), FIXED)).toBe(a);
  });
});