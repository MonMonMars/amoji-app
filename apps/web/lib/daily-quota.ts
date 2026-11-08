'use client';
// Device-local daily chat turn budget (DimDik Phase 0: 40 user turns/day).
// Idle, poke, games, and crisis turns do not touch this counter — only the
// normal LLM chat path in ChatPanel calls consumeChatTurn().

import { t, type Lang } from './prefs';

export const DAILY_QUOTA_STORAGE_KEY = 'amoji.dailyTurns.v1';
export const DAILY_TURNS_DEFAULT = 40;

export const DAILY_QUOTA_EVENT = 'amoji:daily-quota';

export interface DailyTurnRecord {
  day: string;
  used: number;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function readRecord(): DailyTurnRecord {
  if (typeof localStorage === 'undefined') return { day: todayUtc(), used: 0 };
  try {
    const raw = localStorage.getItem(DAILY_QUOTA_STORAGE_KEY);
    if (!raw) return { day: todayUtc(), used: 0 };
    const parsed = JSON.parse(raw) as DailyTurnRecord;
    if (!parsed?.day || typeof parsed.used !== 'number') return { day: todayUtc(), used: 0 };
    return parsed;
  } catch {
    return { day: todayUtc(), used: 0 };
  }
}

function writeRecord(rec: DailyTurnRecord): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DAILY_QUOTA_STORAGE_KEY, JSON.stringify(rec));
  } catch { /* quota / private mode */ }
}

export function dailyTurnLimit(): number {
  return DAILY_TURNS_DEFAULT;
}

/** Turns already used today (resets at UTC midnight). */
export function dailyTurnsUsed(): number {
  const rec = readRecord();
  return rec.day === todayUtc() ? rec.used : 0;
}

export function dailyTurnsRemaining(limit = dailyTurnLimit()): number {
  return Math.max(0, limit - dailyTurnsUsed());
}

export function notifyDailyQuota(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DAILY_QUOTA_EVENT, {
    detail: { used: dailyTurnsUsed(), remaining: dailyTurnsRemaining(), limit: dailyTurnLimit() },
  }));
}

/** Call once when ChatPanel commits to the LLM path for this user message. */
export function consumeChatTurn(): { used: number; remaining: number; limit: number } {
  const day = todayUtc();
  const limit = dailyTurnLimit();
  const rec = readRecord();
  const used = rec.day === day ? rec.used + 1 : 1;
  writeRecord({ day, used });
  const remaining = Math.max(0, limit - used);
  notifyDailyQuota();
  return { used, remaining, limit };
}

export interface QuotaGate {
  ok: boolean;
  used: number;
  remaining: number;
  limit: number;
}

/** Soft stop before any LLM / live-brain work. */
export function checkChatTurnQuota(limit = dailyTurnLimit()): QuotaGate {
  const used = dailyTurnsUsed();
  const remaining = Math.max(0, limit - used);
  return { ok: remaining > 0, used, remaining, limit };
}

export function quotaExceededCopy(lang: Lang | string): string {
  return t(lang as Lang, 'dailyQuotaExceeded');
}

/** Test helper — not for production UI. */
export function _resetDailyQuotaForTests(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(DAILY_QUOTA_STORAGE_KEY);
  notifyDailyQuota();
}

/** Test helper — seed usage for a given UTC day. */
export function _setDailyQuotaForTests(day: string, used: number): void {
  writeRecord({ day, used });
  notifyDailyQuota();
}
