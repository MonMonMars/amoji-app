import { describe, expect, it } from 'vitest';
import { CHARACTERS, type Lang } from '../lib/prefs';
import {
  FEMALE_PERSONALITIES, MALE_PERSONALITIES,   cannedOpener, personalityFor,
  personalityMotion, personalityProfile, personalityPrompt, personalityTutorTip, profilePokeLine,
} from '../lib/personality';
import { VOICE_IDS } from '../lib/personality-voice';
import { pickIdleLine, pickPokeLine } from '../lib/persona-chatter';
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

const LANGS: Lang[] = ['en', 'yue', 'zh', 'ja'];
const UNSAFE = /痛|討厭|讨厌|angry|hate|sex|nude|kiss|flirt|裸|吻/i;

describe('per-character personality profiles', () => {
  it('covers every voice the gender pools can assign', () => {
    expect(new Set(VOICE_IDS)).toEqual(new Set([...FEMALE_PERSONALITIES, ...MALE_PERSONALITIES]));
  });

  it('gives every cast member a distinct cached voice', () => {
    const restore = swapLs();
    const seen = new Set<string>();
    for (const c of CHARACTERS) {
      const profile = personalityProfile(c.id, c.gender);
      expect(profile.personality.length).toBeGreaterThan(0);
      expect(profile.tone.length).toBeGreaterThan(8);
      expect(profile.catchphrases.en.length).toBeGreaterThan(0);
      expect(profile.idleLines.en.length).toBeGreaterThanOrEqual(10);
      expect(profile.promptHint.length).toBeGreaterThan(8);
      const slot = `${c.gender}:${profile.motif}:${profile.frame}`;
      expect(seen.has(slot), slot).toBe(false);
      seen.add(slot);
      expect(personalityProfile(c.id, c.gender).tone).toBe(profile.tone);
      const raw = globalThis.localStorage.getItem('amoji.personality.v2');
      expect(raw).toContain(c.id);
    }
    restore();
  });

  it('keeps a cached motif when the profile is read again', () => {
    const restore = swapLs();
    globalThis.localStorage.setItem('amoji.personality.v2', JSON.stringify({ 'a01-shino': { m: 'maps', f: 3 } }));
    const profile = personalityProfile('a01-shino', 'female');
    expect(profile.motif).toBe('maps');
    expect(profile.frame).toBe(3);
    expect(personalityProfile('a01-shino', 'female').catchphrases.en[0]).toBe(profile.catchphrases.en[0]);
    restore();
  });

  it('switching characters changes idle talk, poke talk, opener, and chat hint', () => {
    const restore = swapLs();
    for (const lang of LANGS) {
      const idle = CHARACTERS.map((c) => pickIdleLine(c.id, lang, 0));
      const poke = CHARACTERS.map((c) => pickPokeLine(c.id, lang, 0));
      const openers = CHARACTERS.map((c) => cannedOpener(c.id, c.gender, lang, c.name));
      const prompts = CHARACTERS.map((c) => personalityPrompt(c.id, c.gender));
      expect(new Set(idle).size, `idle ${lang}`).toBe(CHARACTERS.length);
      expect(new Set(poke).size, `poke ${lang}`).toBe(CHARACTERS.length);
      expect(new Set(openers).size, `opener ${lang}`).toBe(CHARACTERS.length);
      expect(new Set(prompts).size, `prompt ${lang}`).toBe(CHARACTERS.length);
      for (const line of [...idle, ...poke, ...openers]) {
        expect(line).not.toMatch(/\{/);
        expect(line).not.toMatch(UNSAFE);
      }
      openers.forEach((line, i) => {
        expect(line).toContain(CHARACTERS[i]!.name);
        expect(line).toMatch(/[.。!！?？]/);
        expect(line).not.toMatch(/sunshine!|plot twist|スパーク/);
      });
      for (const line of idle) expect(line.trim()).toMatch(/[?？]$/);
    }
    const head = profilePokeLine('a01-shino', 'en', 0, 'head', 'female');
    const hand = profilePokeLine('a01-shino', 'en', 0, 'hand', 'female');
    expect(head).not.toBe(hand);
    expect(head.toLowerCase()).toContain('head');
    expect(hand.toLowerCase()).toContain('hand');
    const a = pickIdleLine('a01-shino', 'en', 0);
    const b = pickIdleLine('a02-shibu', 'en', 0);
    expect(a).not.toBe(b);
    expect(personalityPrompt('a01-shino', 'female')).not.toBe(personalityPrompt('a02-shibu', 'female'));
    expect(cannedOpener('a98-ethan', 'male', 'en', 'ETHAN')).toContain('ETHAN');
    const tipA = personalityTutorTip('a01-shino', 'female', 'en', 0);
    const tipB = personalityTutorTip('a02-shibu', 'female', 'en', 0);
    expect(tipA).not.toBe(tipB);
    const tour = Array.from({ length: 8 }, (_, i) => personalityTutorTip('a01-shino', 'female', 'en', i));
    expect(new Set(tour).size).toBe(8);
    expect(personalityTutorTip('a01-shino', 'female', 'en', 8)).toBe(tour[0]);
    const blob = tour.join(' ').toLowerCase();
    for (const kw of ['poke', 'hand', 'volume', 'name plate', 'sing', 'dance', 'mic']) {
      expect(blob).toContain(kw);
    }
    for (const line of tour) expect(line.trim()).toMatch(/[?？]$/);
    const yue = Array.from({ length: 8 }, (_, i) => personalityTutorTip('a98-ethan', 'male', 'yue', i)).join(' ');
    for (const kw of ['隻手', '音量', '名牌', '唱歌', '跳舞', '咪']) {
      expect(yue).toContain(kw);
    }
    restore();
  });
});
