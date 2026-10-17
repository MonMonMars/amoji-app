import { describe, expect, it } from 'vitest';
import { cantoNanoAvailable } from '../lib/canto-nano';
import { formatVoiceChain, freeVoiceHops } from '../lib/tts-chain';

describe('free TTS chain', () => {
  it('is Edge then speechSynthesis for English, Mandarin, and Japanese', () => {
    for (const locale of ['en', 'zh', 'ja']) {
      expect(freeVoiceHops(locale, { cantoNano: false })).toEqual(['edge', 'synth']);
    }
  });

  it('adds canto-tts-nano for Yue only when that runtime is present', () => {
    expect(cantoNanoAvailable()).toBe(false);
    expect(freeVoiceHops('yue', { cantoNano: cantoNanoAvailable() })).toEqual(['edge', 'synth']);
    expect(freeVoiceHops('yue', { cantoNano: true })).toEqual(['edge', 'synth', 'canto-nano']);
    expect(freeVoiceHops('zh', { cantoNano: true })).toEqual(['edge', 'synth']);
  });

  it('drops Edge when the neural toggle is off and can show an opt-in lead', () => {
    expect(formatVoiceChain(freeVoiceHops('en', { edge: false }))).toBe('synth');
    expect(formatVoiceChain(freeVoiceHops('yue', { cantoNano: true }), 'openai')).toBe('openai→edge→synth→canto-nano');
  });
});
