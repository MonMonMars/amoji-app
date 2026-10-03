import { describe, expect, it } from 'vitest';
import {
  addEntry, buildDailyGreeting, buildMemoryBlock, deleteEntry, editEntry,
  diarySummary, rememberExchange, type Memory,
} from '../lib/memory';

function fresh(): Memory {
  return { facts: [], exchanges: 0, moods: [], updatedAt: '', entries: [] };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toDateString();
}

describe('memory v2 typed entries', () => {
  it('captures a plan with a due day (tomorrow → +1)', () => {
    const m = fresh();
    rememberExchange('聽日我要去日本旅行呀', m);
    const plan = m.entries.find((e) => e.type === 'plan');
    expect(plan).toBeDefined();
    expect(plan!.dueDay).toBe(new Date(Date.now() + 86_400_000).toDateString());
  });

  it('captures past moments', () => {
    const m = fresh();
    rememberExchange('yesterday I went hiking with my dog', m);
    expect(m.entries.some((e) => e.type === 'event')).toBe(true);
  });

  it('captures preferences into typed entries AND legacy facts', () => {
    const m = fresh();
    rememberExchange('I love ramen', m);
    expect(m.entries.some((e) => e.type === 'preference')).toBe(true);
    expect(m.facts.some((f) => f.startsWith('likes:'))).toBe(true);
  });

  it('dedupes identical entries', () => {
    const m = fresh();
    rememberExchange('聽日要去睇醫生', m);
    rememberExchange('聽日要去睇醫生', m);
    expect(m.entries.filter((e) => e.type === 'plan').length).toBe(1);
  });

  it('add / edit / delete entries', () => {
    const m = fresh();
    const e = addEntry('preference', 'likes: hiking', m);
    expect(e).toBeDefined();
    editEntry(e!.id, 'likes: trail running', m);
    expect(m.entries[0]!.text).toBe('likes: trail running');
    deleteEntry(e!.id, m);
    expect(m.entries.length).toBe(0);
  });

  it('injects plans and moments into the memory block', () => {
    const m = fresh();
    m.userName = 'Simon';
    rememberExchange('tomorrow I have a job interview', m);
    rememberExchange('yesterday I adopted a cat', m);
    const block = buildMemoryBlock('en', m)!;
    expect(block).toContain('job interview');
    expect(block).toContain('adopted a cat');
  });

  it('daily greeting cheers a plan due today', () => {
    const line = buildDailyGreeting('yue', { isNewDay: true, streak: 1, planToday: '去面試' });
    expect(line).toContain('去面試');
  });

  it('daily greeting asks about a plan that was due yesterday', () => {
    const line = buildDailyGreeting('en', { isNewDay: true, streak: 2, planMissed: 'see the dentist' });
    expect(line).toContain('see the dentist');
  });
});

// ---------- v3 emotion diary (r2026-10-03.14) ----------

describe('emotion diary', () => {
  it('writes a mood-tagged diary line per exchange', () => {
    const m = fresh();
    rememberExchange('今天好開心呀，覺得 happy', m);
    expect(m.diary?.length).toBe(1);
    expect(m.diary![0]!.mood).toBe('happy');
    expect(m.diary![0]!.text.length).toBeGreaterThan(0);
    expect(m.diary![0]!.exchangeNo).toBe(1);
  });

  it('skips an exact duplicate line on the same day', () => {
    const m = fresh();
    rememberExchange('hello there', m);
    rememberExchange('hello there', m);
    expect(m.diary?.length).toBe(1);
  });

  it('caps the diary and drops the oldest lines', () => {
    const m = fresh();
    for (let i = 0; i < 35; i++) rememberExchange(`message number ${i}`, m);
    expect(m.diary!.length).toBe(30);
  });

  it('summarises one line per day with moods', () => {
    const m = fresh();
    m.diary = [
      { id: '1', day: daysAgo(2), text: 'went hiking with the dog', mood: 'happy', exchangeNo: 1 },
      { id: '2', day: daysAgo(2), text: 'felt tired at night', mood: 'tired', exchangeNo: 2 },
      { id: '3', day: daysAgo(0), text: 'big interview today', exchangeNo: 3 },
    ];
    const lines = diarySummary(m);
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('felt tired at night'); // last line of that day
    expect(lines[0]).toContain('[happy/tired]');
    expect(lines[1]).toContain('big interview');
  });

  it('injects recent diary days into the memory block', () => {
    const m = fresh();
    m.userName = 'Simon';
    m.exchanges = 5;
    rememberExchange('yesterday I adopted a cat', m);
    const block = buildMemoryBlock('en', m)!;
    expect(block).toContain('adopted a cat');
  });

  it('daily greeting recalls this day last week from the diary', () => {
    const line = buildDailyGreeting('yue', { isNewDay: true, streak: 3, diaryWeekAgo: '去咗行山' });
    expect(line).toContain('去咗行山');
  });
});
