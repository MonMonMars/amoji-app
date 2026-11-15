/**
 * R10 after #406/#410/#413/#425: male still female / pitch still similar.
 * This suite locks delivery-gender wins, distinct Edge tier voice ids, and
 * VERY large deep≪mid≪bright gaps (gTTS + Edge prosody).
 */
import { describe, expect, it } from 'vitest';
import { buildEdgeSsml, resolveEdgeVoice } from '../lib/edge-tts';
import {
  edgeProsodyForTier,
  edgeVoiceIdForTier,
  isFemaleNeuralVoice,
  isMaleNeuralVoice,
} from '../lib/voice-catalog';
import { freeVoiceHops } from '../lib/tts-chain';
import {
  FEMALE_TIER_OFFSET,
  MALE_TIER_OFFSET,
  gttsCharacterPitchBias,
} from '../lib/gtts-timbre';
import { PITCH_BIAS_FEMALE, PITCH_BIAS_MALE } from '../lib/gtts';

describe('R10 delivery gender wins on Edge', () => {
  it('male pin on female companion resolves a male neural voice per lang', () => {
    for (const lang of ['yue', 'zh', 'ja', 'en'] as const) {
      const v = resolveEdgeVoice({ lang, gender: 'male', character: 'a01-shino' });
      expect(isMaleNeuralVoice(v.name), `${lang} ${v.name}`).toBe(true);
      expect(isFemaleNeuralVoice(v.name), `${lang} ${v.name}`).toBe(false);
    }
  });

  it('female pin on male companion resolves a female neural voice', () => {
    const v = resolveEdgeVoice({ lang: 'en', gender: 'female', character: 'a98-ethan' });
    expect(isFemaleNeuralVoice(v.name)).toBe(true);
    expect(isMaleNeuralVoice(v.name)).toBe(false);
  });
});

describe('R10 Edge pitch-tier voice ids — huge persona gaps', () => {
  it('en/zh/ja male+female deep/mid/bright use distinct neural speakers where available', () => {
    expect(edgeVoiceIdForTier('en', 'male', 'deep')).toBe('en-US-ChristopherNeural');
    expect(edgeVoiceIdForTier('en', 'male', 'mid')).toBe('en-US-GuyNeural');
    expect(edgeVoiceIdForTier('en', 'male', 'bright')).toBe('en-US-BrianNeural');
    expect(edgeVoiceIdForTier('en', 'female', 'deep')).toBe('en-US-MichelleNeural');
    expect(edgeVoiceIdForTier('en', 'female', 'mid')).toBe('en-US-JennyNeural');
    expect(edgeVoiceIdForTier('en', 'female', 'bright')).toBe('en-US-AnaNeural');
    expect(edgeVoiceIdForTier('zh', 'male', 'deep')).toBe('zh-CN-YunyangNeural');
    expect(edgeVoiceIdForTier('zh', 'male', 'mid')).toBe('zh-CN-YunjianNeural');
    expect(edgeVoiceIdForTier('zh', 'male', 'bright')).toBe('zh-CN-YunxiaNeural');
    expect(edgeVoiceIdForTier('zh', 'female', 'deep')).toBe('zh-CN-liaoning-XiaobeiNeural');
    expect(edgeVoiceIdForTier('zh', 'female', 'mid')).toBe('zh-CN-XiaoxiaoNeural');
    expect(edgeVoiceIdForTier('zh', 'female', 'bright')).toBe('zh-CN-XiaoyiNeural');
    expect(edgeVoiceIdForTier('ja', 'female', 'deep')).toBe('ja-JP-MayuNeural');
    expect(edgeVoiceIdForTier('ja', 'female', 'mid')).toBe('ja-JP-NanamiNeural');
    expect(edgeVoiceIdForTier('ja', 'female', 'bright')).toBe('ja-JP-AoiNeural');
    expect(edgeVoiceIdForTier('ja', 'male', 'deep')).toBe('ja-JP-DaichiNeural');
    expect(edgeVoiceIdForTier('ja', 'male', 'mid')).toBe('ja-JP-KeitaNeural');
    expect(edgeVoiceIdForTier('ja', 'male', 'bright')).toBe('ja-JP-NaokiNeural');
    for (const lang of ['en', 'zh', 'ja'] as const) {
      for (const gender of ['male', 'female'] as const) {
        const ids = [
          edgeVoiceIdForTier(lang, gender, 'deep'),
          edgeVoiceIdForTier(lang, gender, 'mid'),
          edgeVoiceIdForTier(lang, gender, 'bright'),
        ];
        expect(new Set(ids).size, `${lang} ${gender}`).toBe(3);
      }
    }
  });

  it('yue male shares WanLung but gets extreme prosody; yue female deep≠bright id', () => {
    expect(edgeVoiceIdForTier('yue', 'male', 'deep')).toBe('zh-HK-WanLungNeural');
    expect(edgeVoiceIdForTier('yue', 'male', 'bright')).toBe('zh-HK-WanLungNeural');
    expect(edgeVoiceIdForTier('yue', 'female', 'deep')).toBe('zh-HK-HiuMaanNeural');
    expect(edgeVoiceIdForTier('yue', 'female', 'bright')).toBe('zh-HK-HiuGaaiNeural');
    expect(edgeProsodyForTier('deep').pitch).toBeLessThanOrEqual(-0.34);
    expect(edgeProsodyForTier('bright').pitch).toBeGreaterThanOrEqual(0.38);
    expect(edgeProsodyForTier('bright').pitch - edgeProsodyForTier('deep').pitch).toBeGreaterThanOrEqual(0.70);
    expect(edgeProsodyForTier('bright').rate - edgeProsodyForTier('deep').rate).toBeGreaterThanOrEqual(0.50);
    expect(edgeProsodyForTier('mid').pitch).toBe(0);
    expect(edgeProsodyForTier('deep').pitch).toBeLessThan(edgeProsodyForTier('mid').pitch);
    expect(edgeProsodyForTier('bright').pitch).toBeGreaterThan(edgeProsodyForTier('mid').pitch);
  });

  it('SSML emits the huge deep vs bright gap (not crushed)', () => {
    const deep = buildEdgeSsml('今日天氣幾好。', {
      lang: 'yue', gender: 'male', voiceId: 'zh-HK-WanLungNeural', forcePlain: true,
      pitchDelta: edgeProsodyForTier('deep').pitch,
      rateDelta: edgeProsodyForTier('deep').rate,
    });
    const bright = buildEdgeSsml('今日天氣幾好。', {
      lang: 'yue', gender: 'male', voiceId: 'zh-HK-WanLungNeural', forcePlain: true,
      pitchDelta: edgeProsodyForTier('bright').pitch,
      rateDelta: edgeProsodyForTier('bright').rate,
    });
    const dp = Number(deep.match(/pitch='([+-]?\d+)%'/)![1]);
    const bp = Number(bright.match(/pitch='([+-]?\d+)%'/)![1]);
    expect(bp - dp).toBeGreaterThanOrEqual(60);
  });
});

describe('R10 male hop order + gTTS fallback gaps', () => {
  it('preferMale runs edge→synth→gtts', () => {
    expect(freeVoiceHops('en', { preferMale: true })).toEqual(['edge', 'synth', 'gtts']);
  });

  it('gTTS deep≪mid≪bright gaps stay wide without male crossing female', () => {
    const deepF = gttsCharacterPitchBias('female', undefined, 'en', 'deep');
    const midF = gttsCharacterPitchBias('female', undefined, 'en', 'mid');
    const brightF = gttsCharacterPitchBias('female', undefined, 'en', 'bright');
    const deepM = gttsCharacterPitchBias('male', undefined, 'en', 'deep');
    const midM = gttsCharacterPitchBias('male', undefined, 'en', 'mid');
    const brightM = gttsCharacterPitchBias('male', undefined, 'en', 'bright');
    // #437 male bright sat at 1.26 (female territory). Cap male < 1 < female.
    expect(brightM).toBeLessThan(1);
    expect(deepF).toBeGreaterThan(1);
    expect(brightM).toBeLessThan(deepF);
    expect(brightF - deepF).toBeGreaterThanOrEqual(0.55);
    expect(brightM - deepM).toBeGreaterThanOrEqual(0.50);
    expect(midF - deepF).toBeGreaterThanOrEqual(0.15);
    expect(brightF - midF).toBeGreaterThanOrEqual(0.35);
    expect(midM - deepM).toBeGreaterThanOrEqual(0.20);
    expect(brightM - midM).toBeGreaterThanOrEqual(0.20);
    expect(deepF).toBeLessThan(midF);
    expect(midF).toBeLessThan(brightF);
    expect(deepM).toBeLessThan(midM);
    expect(midM).toBeLessThan(brightM);
    expect(FEMALE_TIER_OFFSET.bright - FEMALE_TIER_OFFSET.deep).toBeGreaterThanOrEqual(0.55);
    expect(MALE_TIER_OFFSET.bright - MALE_TIER_OFFSET.deep).toBeGreaterThanOrEqual(0.50);
    expect(PITCH_BIAS_MALE).toBeLessThanOrEqual(0.66);
    expect(PITCH_BIAS_FEMALE - PITCH_BIAS_MALE).toBeGreaterThanOrEqual(0.60);
  });
});
