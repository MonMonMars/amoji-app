import { describe, expect, it } from 'vitest';
import {
  formatClockInZone,
  spokenClockInZone,
  spokenLocalClock,
  spokenWorldClock,
  spokenWorldClockTour,
  WORLD_CLOCK_TOUR,
  worldClockFacetCount,
} from '../lib/world-clock';
import {
  geolocationDeniedThisTab,
  markTimeLocationAsked,
  probeLocationForLocalTime,
  timeLocationGate,
  type GeoLike,
} from '../lib/live-tools';

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

function kv(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
  };
}

/** Every city name a time answer must never volunteer (owner 2026-11-26). */
function tourLabels(lang: (typeof LANGS)[number]): string[] {
  return WORLD_CLOCK_TOUR.map((city) => city.label[lang]);
}

describe('world-clock (Intl, no network)', () => {
  it('formats Hong Kong clock in yue (machine string keeps HH:MM contract)', () => {
    const clock = formatClockInZone(HK, 'yue', FIXED);
    expect(clock).toMatch(/\d/);
    expect(clock).not.toMatch(/invalid/i);
  });

  it('speaks the local time only — never another city', () => {
    for (const lang of LANGS) {
      const line = spokenWorldClock(lang, 0, HK_MIDNIGHT_THURSDAY, HK);
      expect(line).toBe(spokenLocalClock(lang, HK_MIDNIGHT_THURSDAY, HK));
      for (const label of tourLabels(lang)) {
        expect(line, `${label} leaked into ${lang}`).not.toContain(label);
      }
      expect(line).not.toMatch(/\d{1,2}:\d{2}/);
    }
  });

  it('names the part of day without asking the user for a city (yue)', () => {
    const line = spokenWorldClock('yue', 0, HK_MIDNIGHT_THURSDAY, HK);
    // Local lead only: part of day, not bare digits, no tour clause.
    expect(line).toContain('你而家大約午夜十二點半');
    expect(line).not.toContain('東京');
    expect(line).not.toContain('倫敦');
    expect(line).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('keeps the local day boundary in the prose (yue late Thursday)', () => {
    const line = spokenWorldClock('yue', 0, HK_LATE_THURSDAY, HK);
    expect(line).toContain('你而家大約夜晚十一點半');
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

  it('stays local-only for a listener outside the tour cities', () => {
    const line = spokenWorldClock('en', 0, HK_MIDNIGHT_THURSDAY, 'Asia/Singapore');
    for (const label of tourLabels('en')) expect(line).not.toContain(label);
    expect(line).not.toContain('Singapore');
    expect(line).toContain('Where you are');
    expect(line).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('does not resume the city tour on repeated facet taps', () => {
    for (let facet = 0; facet < worldClockFacetCount(); facet += 1) {
      const line = spokenWorldClock('en', facet, FIXED, 'Asia/Singapore');
      for (const label of tourLabels('en')) expect(line).not.toContain(label);
      expect(line).not.toMatch(/\d{1,2}:\d{2}/);
    }
  });

  it('keeps the decorative tour available without changing the time answer', () => {
    const line = spokenWorldClockTour('en', 0, HK_MIDNIGHT_THURSDAY, 'Asia/Singapore');
    expect(line).toContain('Hong Kong');
    expect(line).toContain('Tokyo');
    expect(line).toContain('London');
    expect(line).toContain('New York');
    expect(line).not.toMatch(/\d{1,2}:\d{2}/);
    expect(worldClockFacetCount()).toBeGreaterThanOrEqual(4);
    expect(spokenWorldClockTour('en', worldClockFacetCount(), FIXED, 'Asia/Singapore')).toBe(
      spokenWorldClockTour('en', 0, FIXED, 'Asia/Singapore'),
    );
    const tour = spokenWorldClockTour('en', 1, FIXED, 'Asia/Singapore');
    expect(tour).toContain('Seoul');
  });
});

describe('time question location consent', () => {
  it('asks in-app before the browser prompt on a fresh tab', () => {
    expect(timeLocationGate({ storage: kv(), session: kv(), permission: 'prompt' })).toBe('ask');
    expect(timeLocationGate({ storage: kv(), session: kv(), permission: 'unknown' })).toBe('ask');
  });

  it('goes straight to the local time when permission was already granted', () => {
    expect(
      timeLocationGate({ storage: kv(), session: kv(), permission: 'granted' }),
    ).toBe('ready');
    // A cached browser fix from the gate also counts as already granted.
    const storage = kv({
      'amoji.place.v1': JSON.stringify({
        latitude: 22.32,
        longitude: 114.17,
        city: 'Hong Kong',
        region: '',
        country: 'Hong Kong',
        source: 'browser',
        at: Date.now(),
      }),
    });
    expect(timeLocationGate({ storage, session: kv(), permission: 'prompt' })).toBe('ready');
  });

  it('remembers a skipped prompt and never re-asks in the same tab', () => {
    const session = kv();
    markTimeLocationAsked(session);
    expect(timeLocationGate({ storage: kv(), session, permission: 'prompt' })).toBe('ready');
  });

  it('still answers with the device-zone local time after a denial', () => {
    const session = kv({ 'amoji.geo.denied': '1' });
    expect(geolocationDeniedThisTab(session)).toBe(true);
    expect(timeLocationGate({ storage: kv(), session, permission: 'denied' })).toBe('skip');
    const line = spokenWorldClock('en', 0, HK_MIDNIGHT_THURSDAY, HK);
    expect(line).toContain('half past midnight');
    for (const label of tourLabels('en')) expect(line).not.toContain(label);
    expect(line).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('records a browser denial from the one-shot time probe', async () => {
    const session = kv();
    const geolocation: GeoLike = {
      getCurrentPosition(_success, error) {
        error?.({ code: 1 });
      },
    };
    await expect(
      probeLocationForLocalTime({ session, geolocation, timeoutMs: 200 }),
    ).resolves.toBe('denied');
    expect(session.getItem('amoji.geo.denied')).toBe('1');
    expect(timeLocationGate({ storage: kv(), session, permission: 'prompt' })).toBe('skip');
  });

  it('never blocks a hanging geolocation call', async () => {
    const session = kv();
    const geolocation: GeoLike = { getCurrentPosition() { /* never answers */ } };
    const started = Date.now();
    await expect(
      probeLocationForLocalTime({ session, geolocation, timeoutMs: 60 }),
    ).resolves.toBe('unavailable');
    expect(Date.now() - started).toBeLessThan(1_000);
    // The tab remembers it asked, so a repeat tap answers immediately.
    expect(timeLocationGate({ storage: kv(), session, permission: 'prompt' })).toBe('ready');
  });
});
