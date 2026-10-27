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

const here = path.dirname(fileURLToPath(import.meta.url));

const LABELS = [
  'Cantonese male 1',
  'Cantonese female 1',
  'Cantonese female 2',
  'Mandarin male 1',
  'Mandarin male 2',
  'Mandarin male 3',
  'Mandarin male 4',
  'Mandarin female 1',
  'Mandarin female 2',
  'Japanese male 1',
  'Japanese female 1',
  'English male 1',
  'English male 2',
  'English male 3',
  'English male 4',
  'English male 5',
  'English male 6',
  'English male 7',
  'English male 8',
  'English male 9',
  'English female 1',
  'English female 2',
  'English female 3',
  'English female 4',
  'English female 5',
  'English female 6',
  'English female 7',
  'English female 8',
];

const IDS = [
  'zh-HK-WanLungNeural',
  'zh-HK-HiuMaanNeural',
  'zh-HK-HiuGaaiNeural',
  'zh-CN-YunjianNeural',
  'zh-CN-YunxiNeural',
  'zh-CN-YunyangNeural',
  'zh-CN-YunxiaNeural',
  'zh-CN-XiaoxiaoNeural',
  'zh-CN-XiaoyiNeural',
  'ja-JP-KeitaNeural',
  'ja-JP-NanamiNeural',
  'en-US-GuyNeural',
  'en-US-AndrewNeural',
  'en-US-BrianNeural',
  'en-US-ChristopherNeural',
  'en-US-EricNeural',
  'en-US-RogerNeural',
  'en-US-SteffanNeural',
  'en-US-AndrewMultilingualNeural',
  'en-US-BrianMultilingualNeural',
  'en-US-AriaNeural',
  'en-US-JennyNeural',
  'en-US-AvaNeural',
  'en-US-EmmaNeural',
  'en-US-MichelleNeural',
  'en-US-AnaNeural',
  'en-US-AvaMultilingualNeural',
  'en-US-EmmaMultilingualNeural',
];

afterEach(() => resetVoicePicks());

describe('Edge voice bake-off buttons', () => {
  it('lists the 28 shortest-sheet voices with exact labels', () => {
    expect(EDGE_VOICE_BUTTONS).toHaveLength(28);
    expect(EDGE_VOICE_BUTTONS.map((b) => b.label)).toEqual(LABELS);
    expect(EDGE_VOICE_BUTTONS.map((b) => b.id)).toEqual(IDS);
    expect(EDGE_VOICE_BUTTONS.map((b) => `${b.language} ${b.gender} ${b.n}`)).toEqual(LABELS);
    const shipping = VOICE_CATALOG.filter((v) => v.engine === 'edge' && v.shipping);
    expect(shipping).toHaveLength(28);
    for (const button of EDGE_VOICE_BUTTONS) {
      expect(isShippingEdgeVoice(button.id)).toBe(true);
      const row = shipping.find((v) => v.id === button.id);
      expect(row?.locale).toBe(button.locale);
      expect(row?.gender).toBe(button.gender);
      expect(button.gender === 'male' ? isMaleNeuralVoice(button.id) : isFemaleNeuralVoice(button.id)).toBe(true);
    }
    expect(EDGE_VOICE_BUTTONS.some((b) => /Xiaobei|Xiaoni/.test(b.id))).toBe(false);
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

  it('pins a tapped voice for that companion gender only', () => {
    saveVoicePick('en', 'female', 'en-US-BrianNeural');
    expect(voicePickFor('en', 'female')).toBe('en-US-BrianNeural');
    expect(voicePickFor('en', 'male')).toBeNull();
    expect(voicePickFor('zh', 'female')).toBeNull();
    expect(resolveEdgeVoice({ lang: 'en', gender: 'female', character: 'a01-shino' }).name).toBe('en-US-BrianNeural');
    expect(resolveEdgeVoice({ lang: 'en', gender: 'male', character: 'a24-hairsample-male' }).name).toBe('en-US-GuyNeural');
    expect(resolveEdgeVoice({
      lang: 'en', gender: 'female', character: 'a01-shino', ignoreVoicePick: true,
    }).name).toBe('en-US-JennyNeural');
  });

  it('keeps an explicit cross-gender pick and still gender-matches when nothing is pinned', () => {
    saveVoicePick('zh', 'female', 'zh-CN-YunxiNeural');
    const pinned = resolveEdgeVoice({ lang: 'zh', gender: 'female', character: 'a01-shino' });
    expect(pinned.name).toBe('zh-CN-YunxiNeural');
    expect(isMaleNeuralVoice(pinned.name)).toBe(true);
    const male = resolveEdgeVoice({ lang: 'zh', gender: 'male', character: 'a24-hairsample-male' });
    const maleCast = resolveEdgeVoice({
      lang: 'zh', gender: 'male', character: 'a24-hairsample-male', ignoreVoicePick: true,
    });
    expect(male.name).toBe(maleCast.name);
    expect(isMaleNeuralVoice(male.name)).toBe(true);
    resetVoicePicks();
    const female = resolveEdgeVoice({ lang: 'en', gender: 'female', character: 'a01-shino' });
    expect(isFemaleNeuralVoice(female.name)).toBe(true);
    expect(isMaleNeuralVoice(female.name)).toBe(false);
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
