/**
 * R10 after #406/#410/#413: male still female because (1) resolveEdgeVoice
 * ignored delivery gender whenever character was set, and (2) free chain ran
 * gTTS (one speaker/tl) before Edge/synth. Pitch buttons also need distinct
 * Edge voice ids where the catalog has them.
 */
import { describe, expect, it } from 'vitest';
import { resolveEdgeVoice } from '../lib/edge-tts';
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

describe('R10 Edge pitch-tier voice ids', () => {
  it('en/zh male deep/mid/bright use distinct neural speakers', () => {
    expect(edgeVoiceIdForTier('en', 'male', 'deep')).toBe('en-US-ChristopherNeural');
    expect(edgeVoiceIdForTier('en', 'male', 'mid')).toBe('en-US-GuyNeural');
    expect(edgeVoiceIdForTier('en', 'male', 'bright')).toBe('en-US-BrianNeural');
    expect(edgeVoiceIdForTier('zh', 'male', 'deep')).toBe('zh-CN-YunyangNeural');
    expect(edgeVoiceIdForTier('zh', 'male', 'mid')).toBe('zh-CN-YunjianNeural');
    expect(edgeVoiceIdForTier('zh', 'male', 'bright')).toBe('zh-CN-YunxiNeural');
    expect(new Set([
      edgeVoiceIdForTier('en', 'male', 'deep'),
      edgeVoiceIdForTier('en', 'male', 'mid'),
      edgeVoiceIdForTier('en', 'male', 'bright'),
    ]).size).toBe(3);
  });

  it('yue/ja male tiers share WanLung/Keita but get audible prosody deltas', () => {
    expect(edgeVoiceIdForTier('yue', 'male', 'deep')).toBe('zh-HK-WanLungNeural');
    expect(edgeVoiceIdForTier('ja', 'male', 'bright')).toBe('ja-JP-KeitaNeural');
    expect(edgeProsodyForTier('deep').pitch).toBeLessThan(edgeProsodyForTier('mid').pitch);
    expect(edgeProsodyForTier('bright').pitch).toBeGreaterThan(edgeProsodyForTier('mid').pitch);
    expect(edgeProsodyForTier('bright').rate - edgeProsodyForTier('deep').rate).toBeGreaterThanOrEqual(0.20);
  });
});

describe('R10 male hop order + gTTS fallback gaps', () => {
  it('preferMale runs edge→synth→gtts', () => {
    expect(freeVoiceHops('en', { preferMale: true })).toEqual(['edge', 'synth', 'gtts']);
  });

  it('gTTS deep vs bright gap is obviously wide for both genders', () => {
    const deepF = gttsCharacterPitchBias('female', undefined, 'en', 'deep');
    const brightF = gttsCharacterPitchBias('female', undefined, 'en', 'bright');
    const deepM = gttsCharacterPitchBias('male', undefined, 'en', 'deep');
    const brightM = gttsCharacterPitchBias('male', undefined, 'en', 'bright');
    expect(brightF - deepF).toBeGreaterThanOrEqual(0.50);
    expect(brightM - deepM).toBeGreaterThanOrEqual(0.50);
    expect(FEMALE_TIER_OFFSET.bright - FEMALE_TIER_OFFSET.deep).toBeGreaterThanOrEqual(0.50);
    expect(MALE_TIER_OFFSET.bright - MALE_TIER_OFFSET.deep).toBeGreaterThanOrEqual(0.50);
    expect(PITCH_BIAS_MALE).toBeLessThanOrEqual(0.66);
    expect(PITCH_BIAS_FEMALE - PITCH_BIAS_MALE).toBeGreaterThanOrEqual(0.60);
  });
});
