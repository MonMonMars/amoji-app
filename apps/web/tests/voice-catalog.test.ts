import { describe, expect, it } from 'vitest';
import {
  HELD_GPU_ENGINES,
  SKIPPED_ENGINES,
  VOICE_CATALOG,
  edgeVoiceId,
  synthNameConflicts,
  voiceNameMatches,
  voicesForLocale,
} from '../lib/voice-catalog';

describe('locale voice catalog', () => {
  it('ships Edge and speechSynthesis, and keeps the other free engines', () => {
    for (const v of VOICE_CATALOG) {
      if (v.shipping) expect(['edge', 'speech']).toContain(v.engine);
    }
    expect(edgeVoiceId('yue', 'female')).toBe('zh-HK-HiuMaanNeural');
    expect(edgeVoiceId('yue', 'male')).toBe('zh-HK-WanLungNeural');
    expect(voicesForLocale('yue').some((v) => v.id === 'zh-HK-HiuGaaiNeural' && v.shipping)).toBe(true);

    const engines = (locale: 'en' | 'ja' | 'zh') => voicesForLocale(locale).map((v) => v.engine);
    expect(engines('en')).toEqual(expect.arrayContaining(['kokoro', 'piper', 'melotts', 'speech', 'bark']));
    expect(engines('ja')).toEqual(expect.arrayContaining(['melotts', 'piper', 'speech']));
    expect(engines('zh')).toEqual(expect.arrayContaining(['melotts', 'kokoro', 'piper', 'speech']));
    expect(voicesForLocale('zh').some((v) => v.id === 'zm_yunxi' && v.gender === 'male' && !v.shipping)).toBe(true);
    expect(voicesForLocale('zh').some((v) => v.id === 'zh_CN-huayan-medium')).toBe(true);
  });

  it('leaves Kokoro, Piper, Melo, and Bark unwired', () => {
    const later = VOICE_CATALOG.filter((v) => ['kokoro', 'piper', 'melotts', 'bark'].includes(v.engine));
    expect(later.length).toBeGreaterThan(0);
    expect(later.every((v) => v.shipping === false)).toBe(true);
    expect(VOICE_CATALOG.filter((v) => v.engine === 'bark').every((v) => v.latency === 'high')).toBe(true);
  });

  it('keeps Yue Edge voices on zh-HK and does not ship canto-tts-nano', () => {
    const yueEdge = VOICE_CATALOG.filter((v) => v.locale === 'yue' && v.engine === 'edge' && v.shipping);
    expect(yueEdge.length).toBeGreaterThan(0);
    expect(yueEdge.every((v) => v.id.startsWith('zh-HK-'))).toBe(true);
    const nano = VOICE_CATALOG.filter((v) => v.engine === 'canto-nano');
    expect(nano.length).toBeGreaterThan(0);
    expect(nano.every((v) => v.shipping === false)).toBe(true);
  });

  it('does not ship held GPU engines', () => {
    const shipping = new Set(VOICE_CATALOG.filter((v) => v.shipping).map((v) => v.engine));
    for (const held of HELD_GPU_ENGINES) {
      expect(shipping.has(held.engine as never)).toBe(false);
    }
    expect(HELD_GPU_ENGINES.map((h) => h.engine)).toEqual(
      expect.arrayContaining(['voxcpm2', 'chatterbox', 'cosyvoice', 'qwen3-tts', 'kokoro', 'melotts']),
    );
  });

  it('does not treat Female as a Male voice name', () => {
    expect(voiceNameMatches('Microsoft Zira Desktop - English Female', 'Male')).toBe(false);
    expect(voiceNameMatches('Microsoft David Desktop - English Male', 'Male')).toBe(true);
    expect(synthNameConflicts('male', 'Microsoft Zira Desktop - English Female')).toBe(true);
    expect(synthNameConflicts('male', 'Microsoft David Desktop')).toBe(false);
  });

  it('does not select NC-licensed engines', () => {
    const engines = new Set(VOICE_CATALOG.map((v) => v.engine));
    expect(SKIPPED_ENGINES.map((s) => s.engine)).toEqual(['coqui', 'fish-speech', 'f5-tts']);
    for (const skipped of SKIPPED_ENGINES) {
      expect(engines.has(skipped.engine as never)).toBe(false);
      expect(skipped.license).toMatch(/CPML|NC/);
    }
  });
});
