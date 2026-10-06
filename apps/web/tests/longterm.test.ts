import { describe, expect, it } from 'vitest';
import {
  buildDailyGreeting, buildMemoryBlock, daysTogether, pendingMilestone,
  recallRelevant, recordVisit, rememberExchange, type Memory,
} from '../lib/memory';

function fresh(): Memory {
  return { facts: [], exchanges: 0, moods: [], updatedAt: '', entries: [] };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toDateString();
}

// ---------- r2026-10-06.125: relationship timeline ----------

describe('relationship timeline (v5)', () => {
  it('stamps firstMet on the first-ever visit and counts day 1', () => {
    const m = fresh();
    const info = recordVisit(m);
    expect(m.firstMet).toBe(new Date().toDateString());
    expect(daysTogether(m)).toBe(1);
    expect(info.daysTogether).toBe(1);
  });

  it('day 1 is a milestone and it fires exactly once', () => {
    const m = fresh();
    const first = recordVisit(m);
    expect(first.milestone).toBe(1);
    // same-day re-entry: nothing new to celebrate
    const again = recordVisit(m);
    expect(again.milestone).toBeUndefined();
    expect(pendingMilestone(m)).toBeUndefined();
  });

  it('reaches the right milestone for a 30-day relationship, once', () => {
    const m = fresh();
    m.firstMet = daysAgo(29);
    m.lastVisit = daysAgo(1);
    m.lastMilestone = 14; // celebrated up to day 14 previously
    const info = recordVisit(m);
    expect(info.milestone).toBe(30);
    expect(m.lastMilestone).toBe(30);
    expect(pendingMilestone(m)).toBeUndefined();
  });

  it('a fresh relationship celebrates day 1, then 3, then 7 in order', () => {
    const m = fresh();
    m.firstMet = daysAgo(6);
    expect(pendingMilestone(m)).toBe(7);
    m.lastMilestone = 7;
    expect(pendingMilestone(m)).toBeUndefined();
  });

  it('milestone line outranks the plain visit streak in the greeting', () => {
    const line = buildDailyGreeting('en', { isNewDay: true, streak: 5, milestone: 100 });
    expect(line).toContain('day 100 of us');
    expect(line).not.toContain('Day 5 in a row');
    // no milestone → streak still shows
    const plain = buildDailyGreeting('en', { isNewDay: true, streak: 5 });
    expect(plain).toContain('Day 5 in a row');
  });

  it('milestone line speaks all four languages', () => {
    expect(buildDailyGreeting('yue', { isNewDay: true, streak: 1, milestone: 30 })).toContain('第 30 日');
    expect(buildDailyGreeting('zh', { isNewDay: true, streak: 1, milestone: 30 })).toContain('第 30 天');
    expect(buildDailyGreeting('ja', { isNewDay: true, streak: 1, milestone: 30 })).toContain('30 日目');
    expect(buildDailyGreeting('en', { isNewDay: true, streak: 1, milestone: 30 })).toContain('day 30');
  });
});

// ---------- r2026-10-06.125: topic-relevant recall ----------

describe('topic-relevant recall (v5)', () => {
  it('surfaces an old memory that shares ≥2 content tokens with the message', () => {
    const m = fresh();
    m.entries = [{ id: '1', type: 'event', text: 'went hiking with my dog at sunrise', day: daysAgo(20) }];
    const hits = recallRelevant('hiking with the dog this weekend', m);
    expect(hits.length).toBe(1);
    expect(hits[0]).toContain('hiking');
  });

  it('needs two distinct tokens — one shared word is coincidence', () => {
    const m = fresh();
    m.entries = [{ id: '1', type: 'event', text: 'went hiking with my dog', day: daysAgo(20) }];
    expect(recallRelevant('hiking', m)).toEqual([]);
  });

  it('recalls CJK memories from CJK messages', () => {
    const m = fresh();
    m.entries = [{ id: '1', type: 'event', text: '上個禮拜去咗日本旅行', day: daysAgo(15) }];
    const hits = recallRelevant('日本旅行開唔開心呀？', m);
    expect(hits.length).toBe(1);
    expect(hits[0]).toContain('日本旅行');
  });

  it('returns nothing for an unrelated message', () => {
    const m = fresh();
    m.entries = [{ id: '1', type: 'event', text: 'went hiking with my dog', day: daysAgo(20) }];
    expect(recallRelevant('what should I cook for dinner tonight', m)).toEqual([]);
  });

  it('injects the recalled memory into the block, deduped against standard bits', () => {
    const m = fresh();
    m.userName = 'Simon';
    m.exchanges = 5;
    rememberExchange('yesterday I went hiking with my dog', m);
    // older, on-topic entry NOT in the standard recent/plan/moment slices
    m.entries.push({ id: 'old', type: 'preference', text: 'dreams of hiking the Alps one day', day: daysAgo(40) });
    const block = buildMemoryBlock('en', m, 'I bought new hiking boots for our Alps trip!')!;
    expect(block).toContain('older memories related');
    expect(block).toContain('Alps');
    // the standard bits still present, and the recalled line appears exactly once
    expect(block.match(/Alps/g)!.length).toBe(1);
  });

  it('without userText the block stays exactly as before', () => {
    const m = fresh();
    m.userName = 'Simon';
    m.exchanges = 5;
    rememberExchange('yesterday I went hiking with my dog', m);
    const block = buildMemoryBlock('en', m)!;
    expect(block).not.toContain('older memories related');
  });
});
