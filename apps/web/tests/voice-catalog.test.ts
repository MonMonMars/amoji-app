import { describe, expect, it } from 'vitest';
import {
  HELD_GPU_ENGINES,
  SKIPPED_ENGINES,
  VOICE_APP_LOCALES,
  VOICE_CATALOG,
  catalogShippingHasBothGenders,
  edgeVoiceId,
  edgeVoiceIdForTier,
  localeCatalogGenderCounts,
  selectBrowserVoice,
  synthNameConflicts,
  voiceNameMatches,
  voicesForLocale,
  type VoiceLocale,
} from '../lib/voice-catalog';
import type { GttsPitchTier } from '../lib/gtts-timbre';

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
    expect(synthNameConflicts('male', 'Samantha (English America)')).toBe(true);
    expect(voiceNameMatches('Microsoft Ryan Online', 'Yan')).toBe(false);
    expect(synthNameConflicts('female', 'Microsoft Andrew Online')).toBe(true);
  });

  it('plays a matching-lang voice when the OS name does not say a gender', () => {
    expect(synthNameConflicts('male', 'Google US English')).toBe(false);
    expect(synthNameConflicts('female', 'Nicky')).toBe(false);
    expect(synthNameConflicts('male', 'Ting-Ting')).toBe(false);
    const unlabeled = [
      { name: 'Nicky' },
      { name: 'Eddy (English (United States))' },
    ];
    expect(selectBrowserVoice(unlabeled, 'female', ['Samantha', 'Female'])?.name).toBe('Nicky');
    expect(selectBrowserVoice(unlabeled, 'male', ['Alex', 'Male'])?.name).toBe('Nicky');
    expect(selectBrowserVoice(
      [{ name: 'Samantha' }, { name: 'Nicky' }],
      'female',
      ['Samantha', 'Female'],
    )?.name).toBe('Samantha');
    expect(selectBrowserVoice(
      [{ name: 'Samantha' }, { name: 'Nicky' }],
      'male',
      ['Alex', 'Male'],
    )?.name).toBe('Nicky');
    expect(selectBrowserVoice([{ name: 'Microsoft Zira Desktop - English Female' }], 'male', ['Male'])).toBeNull();
    expect(selectBrowserVoice(
      [{ name: 'Ting-Ting' }, { name: 'Mei-Jia' }],
      'male',
      ['Yunxi', 'Male'],
    )?.name).toBe('Ting-Ting');
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

describe('locale × gender catalog parity', () => {
  const tiers: GttsPitchTier[] = ['deep', 'mid', 'bright'];
  const genders = ['female', 'male'] as const;

  it('every app locale ships ≥1 female and ≥1 male in Edge + speech catalog', () => {
    expect(VOICE_APP_LOCALES).toEqual(['yue', 'zh', 'ja', 'en']);
    for (const locale of VOICE_APP_LOCALES) {
      expect(catalogShippingHasBothGenders(locale), locale).toBe(true);
      const row = localeCatalogGenderCounts(locale);
      expect(row.femaleShipping, `${locale} female shipping`).toBeGreaterThan(0);
      expect(row.maleShipping, `${locale} male shipping`).toBeGreaterThan(0);
      expect(voicesForLocale(locale).some((v) => v.shipping && v.engine === 'edge' && v.gender === 'female')).toBe(true);
      expect(voicesForLocale(locale).some((v) => v.shipping && v.engine === 'edge' && v.gender === 'male')).toBe(true);
      expect(voicesForLocale(locale).some((v) => v.shipping && v.engine === 'speech' && v.gender === 'female')).toBe(true);
      expect(voicesForLocale(locale).some((v) => v.shipping && v.engine === 'speech' && v.gender === 'male')).toBe(true);
    }
  });

  it('keeps distinct Edge tier ids for each gender × pitch (card/greet cast)', () => {
    for (const locale of VOICE_APP_LOCALES) {
      for (const gender of genders) {
        const ids = tiers.map((tier) => edgeVoiceIdForTier(locale, gender, tier));
        expect(ids.every((id) => id.length > 0), `${locale} ${gender}`).toBe(true);
        expect(new Set(ids).size, `${locale} ${gender} tier voices`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('documents default Edge neural ids per locale (male ≠ female)', () => {
    const matrix: Record<VoiceLocale, { female: string; male: string }> = {
      yue: { female: edgeVoiceId('yue', 'female'), male: edgeVoiceId('yue', 'male') },
      zh: { female: edgeVoiceId('zh', 'female'), male: edgeVoiceId('zh', 'male') },
      ja: { female: edgeVoiceId('ja', 'female'), male: edgeVoiceId('ja', 'male') },
      en: { female: edgeVoiceId('en', 'female'), male: edgeVoiceId('en', 'male') },
    };
    for (const locale of VOICE_APP_LOCALES) {
      expect(matrix[locale].female).not.toBe(matrix[locale].male);
    }
    expect(matrix.yue.female).toBe('zh-HK-HiuMaanNeural');
    expect(matrix.yue.male).toBe('zh-HK-WanLungNeural');
  });
});
