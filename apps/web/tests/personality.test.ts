import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../lib/prefs';
import {
  FEMALE_PERSONALITIES, MALE_PERSONALITIES, personalityFor, personalityMotion,
} from '../lib/personality';
import { IDLE_POSES } from '@amoji/vrm-renderer';

const POSE_IDS = new Set(IDLE_POSES.map((p) => p.id));

function swapLs(): () => void {
  const g = globalThis as { localStorage?: Storage };
  const prev = g.localStorage;
  const map = new Map<string, string>();
  g.localStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  return () => { g.localStorage = prev; };
}

describe('auto personality', () => {
  it('keeps male and female pools disjoint and stable once cached', () => {
    const restore = swapLs();
    const females = CHARACTERS.filter((c) => c.gender === 'female');
    const males = CHARACTERS.filter((c) => c.gender === 'male');
    expect(males.length).toBeGreaterThan(0);
    for (const c of females) {
      const tag = personalityFor(c.id, 'female');
      expect(FEMALE_PERSONALITIES).toContain(tag);
      expect(MALE_PERSONALITIES).not.toContain(tag);
      expect(personalityFor(c.id, 'female')).toBe(tag);
    }
    for (const c of males) {
      const tag = personalityFor(c.id, 'male');
      expect(MALE_PERSONALITIES).toContain(tag);
      expect(FEMALE_PERSONALITIES).not.toContain(tag);
      expect(personalityFor(c.id, 'male')).toBe(tag);
    }
    const femaleTag = personalityFor(males[0]!.id, 'female');
    expect(FEMALE_PERSONALITIES).not.toContain(personalityFor(males[0]!.id, 'male'));
    expect(FEMALE_PERSONALITIES).toContain(femaleTag);
    restore();
  });

  it('motion poses are real idle ids and differ by pool', () => {
    const restore = swapLs();
    const f = personalityMotion('a01-shino', 'female');
    const m = personalityMotion('a98-ethan', 'male');
    expect(f.poses.length).toBeGreaterThanOrEqual(3);
    expect(m.poses.length).toBeGreaterThanOrEqual(3);
    for (const id of [...f.poses, ...m.poses]) expect(POSE_IDS.has(id)).toBe(true);
    expect(f.id).not.toBe(m.id);
    restore();
  });

  it('leads calm personalities with IdleBreathCalm', () => {
    const restore = swapLs();
    const g = globalThis as { localStorage: Storage };
    g.localStorage.setItem('amoji.personality.v1', JSON.stringify({
      'p-shy': 'shy',
      'p-gentle': 'gentle',
      'p-dreamy': 'dreamy',
      'p-quiet': 'quiet',
      'p-sporty': 'sporty',
    }));
    expect(personalityMotion('p-shy', 'female').idleClips[0]).toBe('IdleBreathCalm');
    expect(personalityMotion('p-gentle', 'female').idleClips[0]).toBe('IdleBreathCalm');
    expect(personalityMotion('p-dreamy', 'female').idleClips[0]).toBe('IdleBreathCalm');
    expect(personalityMotion('p-quiet', 'male').idleClips[0]).toBe('IdleBreathCalm');
    expect(personalityMotion('p-sporty', 'male').idleClips.includes('IdleBreathCalm')).toBe(false);
    restore();
  });
});
