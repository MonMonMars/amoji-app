import { describe, expect, it } from 'vitest';
import { cantoNanoAvailable } from '../lib/canto-nano';
import { formatVoiceChain, freeVoiceHops } from '../lib/tts-chain';

describe('free TTS chain', () => {
  it('is HTTP MP3 first, then speechSynthesis, then Edge as an upside', () => {
    for (const locale of ['en', 'zh', 'ja']) {
      expect(freeVoiceHops(locale, { cantoNano: false })).toEqual(['gtts', 'synth', 'edge']);
    }
  });

  it('adds canto-tts-nano for Yue only when that runtime is present', () => {
    expect(cantoNanoAvailable()).toBe(false);
    expect(freeVoiceHops('yue', { cantoNano: cantoNanoAvailable() })).toEqual(['gtts', 'synth', 'edge']);
    expect(freeVoiceHops('yue', { cantoNano: true })).toEqual(['gtts', 'synth', 'canto-nano', 'edge']);
    expect(freeVoiceHops('zh', { cantoNano: true })).toEqual(['gtts', 'synth', 'edge']);
  });

  it('drops Edge when the neural toggle is off and can show an opt-in lead', () => {
    expect(formatVoiceChain(freeVoiceHops('en', { edge: false }))).toBe('gtts→synth');
    expect(formatVoiceChain(freeVoiceHops('yue', { cantoNano: true }), 'openai')).toBe(
      'openai→gtts→synth→canto-nano→edge',
    );
  });

  it('keeps the HTTP MP3 tier ahead of speechSynthesis', () => {
    const hops = freeVoiceHops('yue', { cantoNano: true });
    expect(hops.indexOf('gtts')).toBeLessThan(hops.indexOf('synth'));
  });

  it('can be told to skip the HTTP tier', () => {
    expect(freeVoiceHops('en', { gtts: false })).toEqual(['synth', 'edge']);
  });
});
