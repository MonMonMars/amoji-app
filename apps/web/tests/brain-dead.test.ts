import { beforeEach, describe, expect, it } from 'vitest';
import { markBrainDead, pickBrain, resetBrainDead, setBrainKey } from '../lib/brain';

// minimal localStorage stand-in so brain keys can be "stored" in node
const mem = new Map<string, string>();
const ls = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v); },
  removeItem: (k: string) => { mem.delete(k); },
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
};

describe('session-dead brain parking (r2026-10-03.27)', () => {
  beforeEach(() => {
    mem.clear();
    resetBrainDead();
    (globalThis as { localStorage?: Storage }).localStorage = ls as unknown as Storage;
  });

  it('auto prefers a keyed provider, and parks it once it fails hard', () => {
    setBrainKey('moonshot', 'sk-test');
    expect(pickBrain().spec.id).toBe('moonshot');
    markBrainDead('moonshot');
    expect(pickBrain().spec.id).toBe('pollinations');
  });

  it('never dead-ends: even with every spec parked the free lane answers', () => {
    for (const id of ['moonshot', 'groq', 'openrouter', 'pollinations']) markBrainDead(id);
    expect(pickBrain().spec.id).toBe('pollinations');
  });
});
