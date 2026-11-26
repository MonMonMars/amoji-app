import { describe, expect, it } from 'vitest';
import {
  formatClockInZone,
  spokenClockInZone,
  spokenWorldClock,
  worldClockFacetCount,
} from '../lib/world-clock';

const FIXED = new Date('2026-06-15T14:30:00.000Z');

/**
 * Deterministic instant: Hong Kong is Thursday 2026-11-26 00:31 (UTC+8, no DST).
 * At that same instant Tokyo is Thursday 01:31, London is Wednesday 16:31 (GMT)
 * and New York is Wednesday 11:31 (EST) — so London/New York are on the day before.
 */
const HK_MIDNIGHT_THURSDAY = new Date('2026-11-25T16:31:00.000Z');

/** Hong Kong Thursday 2026-11-26 23:31 — Tokyo has already crossed into Friday 00:31. */
const HK_LATE_THURSDAY = new Date('2026-11-26T15:31:00.000Z');

/** London Wednesday 16:33 GMT — must round back to "half past four". */
const LONDON_1633 = new Date('2026-11-25T16:33:00.000Z');

const HK = 'Asia/Hong_Kong';
const LANGS = ['yue', 'zh', 'ja', 'en'] as const;

describe('world-clock (Intl, no network)', () => {
  it('formats Hong Kong clock in yue (machine string keeps HH:MM contract)', () => {
    const clock = formatClockInZone(HK, 'yue', FIXED);
    expect(clock).toMatch(/\d/);
    expect(clock).not.toMatch(/invalid/i);
  });

  it('never speaks a colon digital time in any language', () => {
    for (const lang of LANGS) {
      const line = spokenWorldClock(lang, 0, HK_MIDNIGHT_THURSDAY, HK);
      expect(line).not.toMatch(/\d{1,2}:\d{2}/);
    }
  });

  it('names the part of day and the day boundary at HK 00:31 Thursday (yue)', () => {
    const line = spokenWorldClock('yue', 0, HK_MIDNIGHT_THURSDAY, HK);
    // Local lead: part of day, not bare digits.
    expect(line).toContain('你而家大約午夜十二點半');
    // Tokyo shares Thursday (HKT +1h) — same day, early hours.
    expect(line).toContain('東京而家係凌晨一點半');
    expect(line).not.toContain('東京已經係聽日');
    // London and New York are still on Wednesday.
    expect(line).toContain('倫敦仲係禮拜三下晝四點半');
    expect(line).toContain('紐約仲係禮拜三上午十一點半');
    // No machine clock fragments at all.
    expect(line).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('says Tokyo has crossed into tomorrow when it truly has (HK 23:31 Thursday)', () => {
    const line = spokenWorldClock('yue', 0, HK_LATE_THURSDAY, HK);
    expect(line).toContain('你而家大約夜晚十一點半');
    // Tokyo is Friday 00:31 while Hong Kong is still Thursday.
    expect(line).toContain('東京已經係聽日');
    expect(line).toContain('十二點半');
    expect(line).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('rounds to the nearest 5 minutes instead of reading minutes literally', () => {
    // 00:31 -> 00:30
    expect(spokenClockInZone(HK, 'yue', HK_MIDNIGHT_THURSDAY)).toBe('午夜十二點半');
    expect(spokenClockInZone(HK, 'en', HK_MIDNIGHT_THURSDAY)).toBe('half past midnight');
    // 16:33 -> 16:30
    expect(spokenClockInZone('Europe/London', 'yue', LONDON_1633)).toBe('下晝四點半');
    expect(spokenClockInZone('Europe/London', 'en', LONDON_1633)).toBe(
      'half past four in the afternoon',
    );
    // Not the literal minutes.
    expect(spokenClockInZone(HK, 'yue', HK_MIDNIGHT_THURSDAY)).not.toContain('三十一');
  });

  it('reads as prose in every language (no HH:MM, natural time word present)', () => {
    const keywords: Record<(typeof LANGS)[number], RegExp> = {
      yue: /點/,
      zh: /点/,
      ja: /時/,
      en: /o'clock|half past|quarter past|past|to/,
    };
    for (const lang of LANGS) {
      const line = spokenWorldClock(lang, 0, HK_MIDNIGHT_THURSDAY, HK);
      expect(line).not.toMatch(/\d{1,2}:\d{2}/);
      expect(line).toMatch(keywords[lang]);
    }
    // English should spell the time out, not print digits next to a colon.
    expect(spokenWorldClock('en', 0, HK_MIDNIGHT_THURSDAY, HK)).toContain('half past midnight');
  });

  it('keeps the tour labels for facet 0 when the listener is elsewhere', () => {
    const line = spokenWorldClock('en', 0, HK_MIDNIGHT_THURSDAY, 'Asia/Singapore');
    expect(line).toContain('Hong Kong');
    expect(line).toContain('Tokyo');
    expect(line).toContain('London');
    expect(line).toContain('New York');
    expect(line).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('does not repeat the listener-s own city as a second "city" clause', () => {
    const line = spokenWorldClock('yue', 0, HK_MIDNIGHT_THURSDAY, HK);
    expect(line).not.toContain('香港');
  });

  it('rotates facets on repeat taps and keeps every facet on prose', () => {
    const a = spokenWorldClock('en', 0, FIXED, 'Asia/Singapore');
    const b = spokenWorldClock('en', 1, FIXED, 'Asia/Singapore');
    expect(a).not.toBe(b);
    expect(worldClockFacetCount()).toBeGreaterThanOrEqual(4);
    expect(spokenWorldClock('en', worldClockFacetCount(), FIXED, 'Asia/Singapore')).toBe(a);

    expect(spokenWorldClock('en', 1, FIXED, 'Asia/Singapore')).toContain('Seoul');
    expect(spokenWorldClock('en', 2, FIXED, 'Asia/Singapore')).toContain('London');
    expect(spokenWorldClock('en', 3, FIXED, 'Asia/Singapore')).toContain('Sydney');

    for (let facet = 0; facet < worldClockFacetCount(); facet += 1) {
      expect(spokenWorldClock('yue', facet, FIXED, 'Asia/Singapore')).not.toMatch(/\d{1,2}:\d{2}/);
    }
  });
});
