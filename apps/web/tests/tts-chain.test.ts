import { describe, expect, it } from 'vitest';
import { cantoNanoAvailable } from '../lib/canto-nano';
import { formatVoiceChain, freeVoiceHops } from '../lib/tts-chain';

describe('free TTS chain', () => {
  it('is Edge, then the HTTP MP3 tier, then speechSynthesis', () => {
    for (const locale of ['en', 'zh', 'ja']) {
      expect(freeVoiceHops(locale, { cantoNano: false })).toEqual(['edge', 'gtts', 'synth']);
    }
  });

  it('adds canto-tts-nano for Yue only when that runtime is present', () => {
    expect(cantoNanoAvailable()).toBe(false);
    expect(freeVoiceHops('yue', { cantoNano: cantoNanoAvailable() })).toEqual(['edge', 'gtts', 'synth']);
    expect(freeVoiceHops('yue', { cantoNano: true })).toEqual(['edge', 'gtts', 'synth', 'canto-nano']);
    expect(freeVoiceHops('zh', { cantoNano: true })).toEqual(['edge', 'gtts', 'synth']);
  });

  it('drops Edge when the neural toggle is off and can show an opt-in lead', () => {
    expect(formatVoiceChain(freeVoiceHops('en', { edge: false }))).toBe('gtts→synth');
    expect(formatVoiceChain(freeVoiceHops('yue', { cantoNano: true }), 'openai')).toBe(
      'openai→edge→gtts→synth→canto-nano',
    );
  });

  it('keeps the HTTP MP3 tier ahead of speechSynthesis', () => {
    // Order matters: speechSynthesis is muted by the iOS hardware silent switch
    // and ships no voice on some devices, so the HTTP tier must be tried first.
    const hops = freeVoiceHops('yue', { cantoNano: true });
    expect(hops.indexOf('gtts')).toBeLessThan(hops.indexOf('synth'));
  });

  it('can be told to skip the HTTP tier', () => {
    expect(freeVoiceHops('en', { gtts: false })).toEqual(['edge', 'synth']);
  });
});
