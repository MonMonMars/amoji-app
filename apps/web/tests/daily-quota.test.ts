import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DAILY_QUOTA_STORAGE_KEY,
  DAILY_TURNS_DEFAULT,
  _resetDailyQuotaForTests,
  _setDailyQuotaForTests,
  checkChatTurnQuota,
  consumeChatTurn,
  dailyTurnsRemaining,
  dailyTurnsUsed,
} from '../lib/daily-quota';

function mockLocalStorage(): { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn>; removeItem: ReturnType<typeof vi.fn>; store: Map<string, string> } {
  const store = new Map<string, string>();
  const ls = {
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn((k: string) => { store.delete(k); }),
    store,
  };
  vi.stubGlobal('localStorage', ls);
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  return ls;
}

describe('daily-quota', () => {
  let ls: ReturnType<typeof mockLocalStorage>;

  beforeEach(() => {
    ls = mockLocalStorage();
    _resetDailyQuotaForTests();
  });

  afterEach(() => {
    _resetDailyQuotaForTests();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('starts fresh with full allowance', () => {
    expect(dailyTurnsUsed()).toBe(0);
    expect(dailyTurnsRemaining()).toBe(DAILY_TURNS_DEFAULT);
    expect(checkChatTurnQuota().ok).toBe(true);
  });

  it('consumes one turn per chat commit', () => {
    consumeChatTurn();
    expect(dailyTurnsUsed()).toBe(1);
    expect(dailyTurnsRemaining()).toBe(DAILY_TURNS_DEFAULT - 1);
  });

  it('blocks when the daily cap is reached', () => {
    const day = new Date().toISOString().slice(0, 10);
    _setDailyQuotaForTests(day, DAILY_TURNS_DEFAULT);
    const gate = checkChatTurnQuota();
    expect(gate.ok).toBe(false);
    expect(gate.remaining).toBe(0);
  });

  it('resets usage on a new UTC day', () => {
    _setDailyQuotaForTests('2000-01-01', DAILY_TURNS_DEFAULT);
    expect(dailyTurnsUsed()).toBe(0);
    expect(ls.getItem(DAILY_QUOTA_STORAGE_KEY)).toBeTruthy();
  });
});
