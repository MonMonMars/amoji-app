import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { introText, taglineArchetype } from '../lib/character-intro';
import { CHARACTERS_WANT } from '../lib/characters-want';

describe('character self-introduction', () => {
  it('names the character, so two cards do not sound identical', () => {
    const a = introText('Shino', 'gentle heart, steady cheer', 'en');
    const b = introText('Kara', 'warm friend, always listening', 'en');
    expect(a).toContain('Shino');
    expect(b).toContain('Kara');
    expect(a).not.toBe(b);
  });

  it('says more than a bare hello', () => {
    const line = introText('Rita', 'warm friend, always listening', 'en');
    // An introduction, not just a greeting.
    expect(line.length).toBeGreaterThan(20);
    expect(line.toLowerCase()).toMatch(/i'm|i am/);
  });

  it('varies by personality archetype', () => {
    const warm = introText('X', 'warm friend, always listening', 'en');
    const gentle = introText('X', 'gentle heart, steady cheer', 'en');
    const sunny = introText('X', 'sunny companion, kind voice', 'en');
    const calm = introText('X', 'calm buddy, curious and caring', 'en');
    const all = new Set([warm, gentle, sunny, calm]);
    expect(all.size).toBe(4);
  });

  it('classifies every archetype present in the real cast', () => {
    expect(taglineArchetype('warm friend, always listening')).toBe('warm');
    expect(taglineArchetype('gentle heart, steady cheer')).toBe('gentle');
    expect(taglineArchetype('sunny companion, kind voice')).toBe('sunny');
    expect(taglineArchetype('calm buddy, curious and caring')).toBe('calm');
  });

  it('falls back safely for an unknown tagline', () => {
    expect(taglineArchetype(undefined)).toBe('generic');
    expect(taglineArchetype('brand new thing')).toBe('generic');
    const line = introText('Nova', 'brand new thing', 'en');
    expect(line).toContain('Nova');
    expect(line.length).toBeGreaterThan(10);
  });

  it('is written in each shipped language, not English everywhere', () => {
    const en = introText('Shino', 'gentle heart, steady cheer', 'en');
    for (const lang of ['yue', 'zh', 'ja'] as const) {
      const line = introText('Shino', 'gentle heart, steady cheer', lang);
      expect(line).toContain('Shino');
      expect(line).not.toBe(en);
      // CJK output should actually contain CJK
      expect(/[\u3400-\u9fff\u3040-\u30ff]/.test(line)).toBe(true);
    }
  });

  it('every character in the real cast gets a usable intro in every language', () => {
    for (const c of CHARACTERS_WANT) {
      for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
        const tagline = (c.tagline as Record<string, string>)[lang] ?? (c.tagline as Record<string, string>).en;
        const line = introText(c.name, tagline, lang);
        expect(line.length).toBeGreaterThan(10);
        expect(line).toContain(c.name);
      }
    }
  });

  it('intro helper stays available for callers that want a named self-intro', () => {
    const line = introText('Shino', 'gentle heart, steady cheer', 'en');
    expect(line).toContain('Shino');
    expect(line.length).toBeGreaterThan(20);
  });

  it('playVoiceGreeting accepts an optional override line', () => {
    const voice = readFileSync(join(__dirname, '../lib/voice.ts'), 'utf8');
    expect(voice).toMatch(/line\?: string/);
    // Bare card taps rotate CARD_GREET_PHRASES instead of a fixed Hello.
    expect(voice).toMatch(/line\?\.trim\(\) \? line\.trim\(\) : nextCardGreetPhrase\(lang\)/);
  });

  it('HK / Mandarin intros open with Hello, not 你好', () => {
    const yue = introText('阿May', 'warm friend, always listening', 'yue');
    const zh = introText('阿May', 'warm friend, always listening', 'zh');
    expect(yue.startsWith('Hello')).toBe(true);
    expect(zh.startsWith('Hello')).toBe(true);
    expect(yue).not.toMatch(/^你好/);
    expect(zh).not.toMatch(/^你好/);
  });
});
