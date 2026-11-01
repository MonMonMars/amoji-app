import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EDGE_VOICE_BUTTONS,
  VOICE_CATALOG,
  edgeSampleText,
  edgeVoiceId,
  isFemaleNeuralVoice,
  isMaleNeuralVoice,
  isShippingEdgeVoice,
} from '../lib/voice-catalog';
import { resetVoicePicks, saveVoicePick, voicePickFor } from '../lib/voice-picks';
import { buildEdgeSsml, resolveEdgeVoice } from '../lib/edge-tts';
import { selectTtsButtons } from '../lib/tts-button-registry';

const here = path.dirname(fileURLToPath(import.meta.url));

afterEach(() => resetVoicePicks());

describe('Edge voice bake-off buttons', () => {
  it('lists the 28 shortest-sheet voices with exact labels', () => {
    expect(EDGE_VOICE_BUTTONS.length).toBeGreaterThan(28);
    expect(EDGE_VOICE_BUTTONS.map((b) => b.label)).toEqual(
      EDGE_VOICE_BUTTONS.map((b) => `${b.language} ${b.gender} ${b.n}`),
    );
    expect(new Set(EDGE_VOICE_BUTTONS.map((b) => b.label)).size).toBe(EDGE_VOICE_BUTTONS.length);
    expect(new Set(EDGE_VOICE_BUTTONS.map((b) => b.id)).size).toBe(EDGE_VOICE_BUTTONS.length);
    expect(EDGE_VOICE_BUTTONS.map((b) => b.label).some((label) => label.toLowerCase() === 'universal')).toBe(false);
    const shipping = VOICE_CATALOG.filter((v) => v.engine === 'edge' && v.shipping);
    expect(shipping).toHaveLength(EDGE_VOICE_BUTTONS.length);
    for (const button of EDGE_VOICE_BUTTONS) {
      expect(isShippingEdgeVoice(button.id)).toBe(true);
      const row = shipping.find((v) => v.id === button.id);
      expect(row?.locale).toBe(button.locale);
      expect(row?.gender).toBe(button.gender);
      expect(button.gender === 'male' ? isMaleNeuralVoice(button.id) : isFemaleNeuralVoice(button.id)).toBe(true);
    }
    expect(EDGE_VOICE_BUTTONS.some((b) => b.id === 'zh-CN-liaoning-XiaobeiNeural')).toBe(true);
    expect(EDGE_VOICE_BUTTONS.some((b) => /MultilingualNeural/.test(b.id) && /Andrew|Ava|Brian|Emma/.test(b.id))).toBe(false);
    expect(EDGE_VOICE_BUTTONS.find((b) => b.id === 'zh-CN-YunxiaNeural')?.note).toBe('cute');
    expect(EDGE_VOICE_BUTTONS.find((b) => b.id === 'en-US-AnaNeural')?.note).toBe('child-like');
    expect(edgeSampleText('yue')).toBe('你好呀，今日天氣幾好。我係你嘅語音助手。');
    expect(edgeSampleText('zh')).toBe('你好，今天天气不错。我是你的语音助手。');
    expect(edgeSampleText('ja')).toBe('こんにちは。今日はいい天気ですね。私は音声アシスタントです。');
    expect(edgeSampleText('en')).toBe("Hi there. Nice to meet you. I'm your voice companion.");
  });

  it('keeps the unwired gender defaults ahead of the extra peers', () => {
    expect(edgeVoiceId('yue', 'female')).toBe('zh-HK-HiuMaanNeural');
    expect(edgeVoiceId('yue', 'male')).toBe('zh-HK-WanLungNeural');
    expect(edgeVoiceId('zh', 'female')).toBe('zh-CN-XiaoxiaoNeural');
    expect(edgeVoiceId('zh', 'male')).toBe('zh-CN-YunjianNeural');
    expect(edgeVoiceId('ja', 'female')).toBe('ja-JP-NanamiNeural');
    expect(edgeVoiceId('ja', 'male')).toBe('ja-JP-KeitaNeural');
    expect(edgeVoiceId('en', 'female')).toBe('en-US-JennyNeural');
    expect(edgeVoiceId('en', 'male')).toBe('en-US-GuyNeural');
  });


  it('filters bake-off buttons to the companion gender (voicePicks.v2 floor)', () => {
    const femaleEn = selectTtsButtons('en', 'female');
    const maleEn = selectTtsButtons('en', 'male');
    expect(femaleEn.length).toBeGreaterThan(0);
    expect(maleEn.length).toBeGreaterThan(0);
    expect(femaleEn.every((b) => b.gender === 'female')).toBe(true);
    expect(maleEn.every((b) => b.gender === 'male')).toBe(true);
    expect(femaleEn.some((b) => isMaleNeuralVoice(b.id))).toBe(false);
    expect(maleEn.some((b) => isFemaleNeuralVoice(b.id))).toBe(false);
    const allFemale = selectTtsButtons(undefined, 'female');
    expect(allFemale.every((b) => b.gender === 'female')).toBe(true);
    expect(allFemale.length).toBe(EDGE_VOICE_BUTTONS.filter((b) => b.gender === 'female').length);
  });

  it('keeps select row and settings picker from offering cross-gender samples', () => {
    const row = fs.readFileSync(path.resolve(here, '../components/TtsVoiceRow.tsx'), 'utf8');
    expect(row).toContain('selectTtsButtons(lang, companionGender)');
    expect(row).toContain('selectTtsButtons(undefined, companionGender)');
    expect(row).toContain('button.gender !== companionGender');
    const picker = fs.readFileSync(path.resolve(here, '../components/VoicePicker.tsx'), 'utf8');
    expect(picker).toContain('button.gender !== companionGender');
    expect(picker).toContain('([companionGender] as const)');
    expect(picker).not.toContain("(['male', 'female'] as const)");
  });

  it('pins a tapped voice for that companion gender only', () => {
    saveVoicePick('en', 'female', 'en-US-AriaNeural');
    expect(voicePickFor('en', 'female')).toBe('en-US-AriaNeural');
    expect(voicePickFor('en', 'male')).toBeNull();
    expect(voicePickFor('zh', 'female')).toBeNull();
    expect(resolveEdgeVoice({ lang: 'en', gender: 'female', character: 'a01-shino' }).name).toBe('en-US-AriaNeural');
    const maleUntouched = resolveEdgeVoice({ lang: 'en', gender: 'male', character: 'a24-hairsample-male' });
    expect(isMaleNeuralVoice(maleUntouched.name)).toBe(true);
    expect(maleUntouched.name).not.toBe('en-US-AriaNeural');
    expect(resolveEdgeVoice({
      lang: 'en', gender: 'female', character: 'a01-shino', ignoreVoicePick: true,
    }).name).toBe('en-US-JennyNeural');
  });

  it('refuses cross-gender neural pins after cast gender re-audit', () => {
    saveVoicePick('en', 'female', 'en-US-BrianNeural');
    expect(voicePickFor('en', 'female')).toBeNull();
    const femalePinned = resolveEdgeVoice({ lang: 'en', gender: 'female', character: 'a01-shino' });
    expect(femalePinned.name).not.toBe('en-US-BrianNeural');
    expect(isFemaleNeuralVoice(femalePinned.name)).toBe(true);
    saveVoicePick('zh', 'male', 'zh-CN-XiaoxiaoNeural');
    expect(voicePickFor('zh', 'male')).toBeNull();
  });

  it('gender-matches cast defaults when nothing is pinned', () => {
    resetVoicePicks();
    const female = resolveEdgeVoice({ lang: 'en', gender: 'female', character: 'a01-shino' });
    expect(isFemaleNeuralVoice(female.name)).toBe(true);
    expect(isMaleNeuralVoice(female.name)).toBe(false);
    const male = resolveEdgeVoice({ lang: 'zh', gender: 'male', character: 'a24-hairsample-male' });
    expect(isMaleNeuralVoice(male.name)).toBe(true);
  });

  it('keeps the three Cantonese pills on distinct gendered Edge ids', () => {
    const yue = EDGE_VOICE_BUTTONS.filter((b) => b.locale === 'yue');
    expect(yue.map((b) => b.id)).toEqual([
      'zh-HK-WanLungNeural',
      'zh-HK-HiuMaanNeural',
      'zh-HK-HiuGaaiNeural',
    ]);
    const male = buildEdgeSsml(edgeSampleText('yue'), {
      lang: 'yue', gender: 'female', voiceId: 'zh-HK-WanLungNeural',
    });
    const female1 = buildEdgeSsml(edgeSampleText('yue'), {
      lang: 'yue', gender: 'male', voiceId: 'zh-HK-HiuMaanNeural',
    });
    const female2 = buildEdgeSsml(edgeSampleText('yue'), {
      lang: 'yue', gender: 'male', voiceId: 'zh-HK-HiuGaaiNeural',
    });
    expect(male).toContain("voice name='zh-HK-WanLungNeural'");
    expect(male).not.toContain('HiuMaan');
    expect(male).not.toContain('HiuGaai');
    expect(female1).toContain("voice name='zh-HK-HiuMaanNeural'");
    expect(female2).toContain("voice name='zh-HK-HiuGaaiNeural'");
    expect(female1).not.toContain('HiuGaai');
    expect(female2).not.toContain('HiuMaan');
    expect(isMaleNeuralVoice('zh-HK-WanLungNeural')).toBe(true);
    expect(isFemaleNeuralVoice('zh-HK-HiuMaanNeural')).toBe(true);
    expect(isFemaleNeuralVoice('zh-HK-HiuGaaiNeural')).toBe(true);
  });

  it('builds the sample SSML with the tapped short name', () => {
    const ssml = buildEdgeSsml(edgeSampleText('en'), {
      lang: 'en', gender: 'female', voiceId: 'en-US-AndrewNeural',
    });
    expect(ssml).toContain("voice name='en-US-AndrewNeural'");
    expect(ssml).toContain('Nice to meet you');
    expect(ssml).toContain("xml:lang='en-US'");
  });

  it('renders one button per voice inside the voice settings panel', () => {
    const picker = fs.readFileSync(path.resolve(here, '../components/VoicePicker.tsx'), 'utf8');
    const settings = fs.readFileSync(path.resolve(here, '../components/SettingsSheet.tsx'), 'utf8');
    expect(picker).toContain('EDGE_VOICE_BUTTONS');
    expect(picker).toContain('aria-label={button.label}');
    expect(picker).toContain('previewEdgeVoice');
    expect(picker).toContain('saveVoicePick');
    expect(settings).toContain('VoicePicker');
  });
});
