import { describe, expect, it } from 'vitest';
import { echoCompareKey, looksLikeSpeechEcho } from '../lib/speech-echo';
import { speechRemainder } from '../lib/speech-queue';
import { cleanForSpeech, stripLaughTokens } from '../lib/speak-text';

const normalize = (s: string) => stripLaughTokens(cleanForSpeech(s)).trim();

describe('looksLikeSpeechEcho', () => {
  it('flags mic bleed of her Cantonese line', () => {
    const spoken = '今日天氣幾好呀，不如去行街？';
    expect(looksLikeSpeechEcho('今日天氣幾好呀', spoken)).toBe(true);
    expect(looksLikeSpeechEcho(spoken, spoken)).toBe(true);
  });

  it('flags mic bleed of her English line', () => {
    const spoken = 'The weather looks great today, want to take a walk?';
    expect(looksLikeSpeechEcho('The weather looks great today', spoken)).toBe(true);
  });

  it('allows a short real barge-in', () => {
    expect(looksLikeSpeechEcho('yes', 'The weather looks great today, want to take a walk?')).toBe(false);
    expect(looksLikeSpeechEcho('嗯', '今日天氣幾好呀，不如去行街？')).toBe(false);
  });

  it('allows an unrelated user turn', () => {
    expect(looksLikeSpeechEcho('What should we eat for dinner?', 'The weather looks great today.')).toBe(false);
  });

  it('allows a longer user turn that quotes her', () => {
    const spoken = 'The weather looks great today.';
    expect(
      looksLikeSpeechEcho('You said the weather looks great today but I disagree', spoken),
    ).toBe(false);
  });

  it('echoCompareKey drops punctuation and case', () => {
    expect(echoCompareKey('Hello, World!')).toBe('helloworld');
  });
});

describe('speechRemainder normalized first-sentence skip', () => {
  it('strips an opening that only matches after cleanForSpeech', () => {
    const first = 'Hello — I am here.';
    const full = 'Hello — I am here. Want to chat?';
    expect(speechRemainder(full, first)).toBe('Want to chat?');
    expect(speechRemainder(full, first, normalize)).toBe('Want to chat?');
    const cleanedFirst = normalize(first);
    expect(full.startsWith(cleanedFirst)).toBe(false);
    expect(speechRemainder(full, cleanedFirst, normalize)).toBe(normalize('Want to chat?'));
  });

  it('returns empty when the whole reply was the first sentence', () => {
    const line = 'Hello — I am here.';
    expect(speechRemainder(line, line, normalize)).toBe('');
    expect(speechRemainder(normalize(line), line, normalize)).toBe('');
  });
});
