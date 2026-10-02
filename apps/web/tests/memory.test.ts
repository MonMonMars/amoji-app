import { describe, expect, it } from 'vitest';
import {
  addEntry, buildDailyGreeting, buildMemoryBlock, deleteEntry, editEntry,
  rememberExchange, type Memory,
} from '../lib/memory';

function fresh(): Memory {
  return { facts: [], exchanges: 0, moods: [], updatedAt: '', entries: [] };
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
