import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CARD_GREET_PHRASES,
  nextCardGreetPhrase,
  resetCardGreetRotation,
} from '../lib/voice-clips';

afterEach(() => resetCardGreetRotation());

describe('card press greet rotation', () => {
  it('ships a short rotating bank per language', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      const bank = CARD_GREET_PHRASES[lang];
      expect(bank.length).toBeGreaterThanOrEqual(4);
      for (const phrase of bank) {
        expect(phrase.trim().length).toBeGreaterThan(0);
        expect(phrase.length).toBeLessThan(24);
      }
    }
  });

  it('cycles phrases on successive presses and wraps', () => {
    const bank = CARD_GREET_PHRASES.en;
    const first = bank.map(() => nextCardGreetPhrase('en'));
    expect(first).toEqual([...bank]);
    expect(nextCardGreetPhrase('en')).toBe(bank[0]);
  });

  it('shares one cursor across languages so presses keep advancing', () => {
    expect(nextCardGreetPhrase('en')).toBe(CARD_GREET_PHRASES.en[0]);
    expect(nextCardGreetPhrase('yue')).toBe(CARD_GREET_PHRASES.yue[1]);
    expect(nextCardGreetPhrase('zh')).toBe(CARD_GREET_PHRASES.zh[2]);
    expect(nextCardGreetPhrase('ja')).toBe(CARD_GREET_PHRASES.ja[3]);
  });

  it('includes hi/hello-style variety (en) and 你好/哈囉 (zh/yue)', () => {
    expect(CARD_GREET_PHRASES.en).toEqual(
      expect.arrayContaining(['Hi!', 'Hello!', 'Hey!', 'Good to see you!']),
    );
    expect(CARD_GREET_PHRASES.yue.some((p) => p.includes('哈囉'))).toBe(true);
    expect(CARD_GREET_PHRASES.yue.some((p) => p.includes('你好'))).toBe(true);
    expect(CARD_GREET_PHRASES.zh.some((p) => p.includes('你好'))).toBe(true);
  });

  it('playVoiceGreeting and voice previews use the rotating bank', () => {
    const voice = readFileSync(join(__dirname, '../lib/voice.ts'), 'utf8');
    const greet = voice.slice(
      voice.indexOf('export function playVoiceGreeting'),
      voice.indexOf('export function previewLibraryClip'),
    );
    expect(greet).toContain('nextCardGreetPhrase(lang)');
    expect(greet).not.toMatch(/greetingText\(lang, 'hello'\)/);

    const preview = voice.slice(
      voice.indexOf('export function previewVoiceChoice'),
      voice.indexOf('export function previewOsVoice'),
    );
    expect(preview).toContain('nextCardGreetPhrase(locale)');
    expect(preview).not.toContain('edgeSampleText(locale)');
  });

  it('character and voice cards call playVoiceGreeting without a fixed line', () => {
    const board = readFileSync(join(__dirname, '../components/SelectionBoard.tsx'), 'utf8');
    const row = readFileSync(join(__dirname, '../components/TtsVoiceRow.tsx'), 'utf8');
    expect(board).toContain('playVoiceGreeting(chosen.id, lang, activeVoiceChoice(lang).id)');
    expect(board).not.toContain('introText(');
    expect(row).toContain('playVoiceGreeting(characterId, button.locale, button.id)');
  });
});
