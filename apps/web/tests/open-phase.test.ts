import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OPEN_PHASE_KEY,
  OPEN_SESSION_GAP_MS,
  isFreshOpenPhase,
  loadOpenPhaseState,
  markChatRoomClosed,
  markChatRoomOpened,
  markOpenIdleBriefDone,
  markOpenCheerDone,
  openCheerAlreadyDone,
  openIdleBriefAlreadyDone,
  shouldPlayOpenCheer,
  buildOpenCheerLine,
  openPhaseNewsAsk,
  openPhaseTopicAsk,
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

  it('openPhaseTopicAsk exists per UI language', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja']) {
      expect(openPhaseTopicAsk(lang).length).toBeGreaterThan(4);
    }
  });

  it('buildOpenCheerLine orders hi + intro before duplicate topic ask', () => {
    const line = buildOpenCheerLine('yue', {
      nameHello: '夜安，阿明',
      personaIntro: '你好，我係Shino！我鍾意茶。今日想傾咩呀？',
      topicAsk: openPhaseTopicAsk('yue'),
    });
    expect(line).toContain('阿明');
    expect(line).toContain('Shino');
    const asks = (line.match(/傾咩/g) ?? []).length;
    expect(asks).toBeLessThanOrEqual(2);
  });
});


describe('open cheer / name-greet once latch', () => {
  it('openCheerAlreadyDone gates Strict Mode remount before markChatRoomOpened', () => {
    const t0 = 70_000_000;
    const char = 'nova';
    markChatRoomOpened(t0);
    expect(openCheerAlreadyDone(char)).toBe(false);
    markOpenCheerDone(t0, char);
    expect(openCheerAlreadyDone(char)).toBe(true);
    // Simulate leave: close does not clear openCheerAt.
    markChatRoomClosed(t0 + 500);
    // Remount path checks latch BEFORE bumping lastOpenedAt.
    expect(isFreshOpenPhase(t0 + 1000)).toBe(false);
    expect(openCheerAlreadyDone(char)).toBe(true);
  });

  it('fresh gap open allows cheer again', () => {
    const t0 = 80_000_000;
    const char = 'nova';
    markChatRoomOpened(t0);
    markOpenCheerDone(t0, char);
    markChatRoomClosed(t0 + 1000);
    const later = t0 + OPEN_SESSION_GAP_MS + 5_000;
    expect(isFreshOpenPhase(later)).toBe(true);
    // After a fresh open bump, prior cheerAt is older than lastOpenedAt.
    markChatRoomOpened(later);
    expect(openCheerAlreadyDone(char)).toBe(false);
  });

  it('different character within gap is not gated by prior cheer latch', () => {
    const t0 = 90_000_000;
    markChatRoomOpened(t0);
    markOpenCheerDone(t0, 'nova');
    expect(openCheerAlreadyDone('nova')).toBe(true);
    expect(openCheerAlreadyDone('luna')).toBe(false);
    expect(shouldPlayOpenCheer('luna', t0 + 1000)).toBe(true);
    expect(shouldPlayOpenCheer('nova', t0 + 1000)).toBe(false);
  });

  it('idle brief latch is per character', () => {
    const t0 = 91_000_000;
    markChatRoomOpened(t0);
    markOpenIdleBriefDone(t0 + 500, 'nova');
    expect(openIdleBriefAlreadyDone('nova')).toBe(true);
    expect(openIdleBriefAlreadyDone('luna')).toBe(false);
  });
});
describe('buildDailyGreeting short / skipThread', () => {
  it('short mode is only the time-of-day hello', () => {
    const info = { isNewDay: true, streak: 9, planToday: '面試', lastThreadUser: 'hiking' };
    const line = buildDailyGreeting('yue', info, { skipThread: true, short: true });
    expect(line.length).toBeLessThan(24);
    expect(line).not.toContain('面試');
    expect(line.toLowerCase()).not.toContain('hiking');
  });
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
