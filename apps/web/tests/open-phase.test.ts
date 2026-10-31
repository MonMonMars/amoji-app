import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OPEN_PHASE_KEY,
  OPEN_SESSION_GAP_MS,
  isFreshOpenPhase,
  loadOpenPhaseState,
  markChatRoomClosed,
  markChatRoomOpened,
  markOpenIdleBriefDone,
  openIdleBriefAlreadyDone,
  openPhaseNewsAsk,
  openPhaseWeatherAsk,
  saveOpenPhaseState,
  summarizeOpenPhaseSpoken,
} from '../lib/open-phase';
import { buildDailyGreeting } from '../lib/memory';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  });
});

describe('OPEN_SESSION_GAP_MS', () => {
  it('is 2.5 hours (mid of Mon ~2–3h)', () => {
    expect(OPEN_SESSION_GAP_MS).toBe(2.5 * 60 * 60 * 1000);
  });
});

describe('isFreshOpenPhase', () => {
  it('returns true when no open phase is stored', () => {
    expect(isFreshOpenPhase(1_000_000)).toBe(true);
  });

  it('returns false when lastClosedAt is within the gap', () => {
    const now = 10_000_000;
    saveOpenPhaseState({ lastClosedAt: now - 30 * 60 * 1000 });
    expect(isFreshOpenPhase(now)).toBe(false);
  });

  it('returns true when lastClosedAt is older than the gap', () => {
    const now = 20_000_000;
    saveOpenPhaseState({ lastClosedAt: now - OPEN_SESSION_GAP_MS - 1 });
    expect(isFreshOpenPhase(now)).toBe(true);
  });

  it('falls back to lastOpenedAt when close is missing', () => {
    const now = 30_000_000;
    saveOpenPhaseState({ lastOpenedAt: now - OPEN_SESSION_GAP_MS - 5 });
    expect(isFreshOpenPhase(now)).toBe(true);
  });
});

describe('open idle brief flags', () => {
  it('markChatRoomOpened / markOpenIdleBriefDone gate remount repeats', () => {
    const t0 = 50_000_000;
    markChatRoomOpened(t0);
    expect(openIdleBriefAlreadyDone()).toBe(false);
    markOpenIdleBriefDone(t0 + 1000);
    expect(openIdleBriefAlreadyDone()).toBe(true);
    expect(loadOpenPhaseState().idleBriefAt).toBe(t0 + 1000);
  });

  it('markChatRoomClosed stores lastClosedAt', () => {
    markChatRoomClosed(60_000_000);
    expect(loadOpenPhaseState().lastClosedAt).toBe(60_000_000);
    expect(store.get(OPEN_PHASE_KEY)).toContain('lastClosedAt');
  });
});

describe('openPhase asks + spoken summary', () => {
  it('weather/news asks exist per UI language', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja']) {
      expect(openPhaseWeatherAsk(lang).length).toBeGreaterThan(3);
      expect(openPhaseNewsAsk(lang).length).toBeGreaterThan(3);
    }
  });

  it('summarizeOpenPhaseSpoken strips hashtags via cleanForSpeech', () => {
    const line = summarizeOpenPhaseSpoken('Nice day #sunny', 'Cheerful headline #news');
    expect(line.toLowerCase()).not.toContain('#');
    expect(line.toLowerCase()).toContain('nice day');
  });

  it('summarizeOpenPhaseSpoken drops empty parts', () => {
    expect(summarizeOpenPhaseSpoken('', null, undefined, 'Hello there')).toMatch(/hello there/i);
    expect(summarizeOpenPhaseSpoken('', '  ')).toBe('');
  });
});

describe('buildDailyGreeting skipThread', () => {
  it('omits lastThread resume when skipThread is true', () => {
    const info = {
      isNewDay: true,
      streak: 2,
      lastThreadUser: 'we talked about hiking',
      lastThreadReply: 'sounds fun',
      lastThreadDay: 'Thu Oct 30 2026',
    };
    const withThread = buildDailyGreeting('en', info);
    const without = buildDailyGreeting('en', info, { skipThread: true });
    expect(withThread.toLowerCase()).toContain('hiking');
    expect(without.toLowerCase()).not.toContain('hiking');
  });
});
