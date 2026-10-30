import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INTERJECTIONS } from '../lib/fillers';
import { pickLaugh } from '../lib/laugh';
import { CHARACTERS, type Lang } from '../lib/prefs';
import { LOADING_STUBS } from '../lib/thinking-lines';
import { EDGE_VOICE_BUTTONS, browserVoicesForLang } from '../lib/voice-catalog';
import {
  BURST_CLIP_KINDS,
  BURST_CLIP_LABEL,
  EMOTION_CLIP_KINDS,
  FILLER_CLIP_TEXT,
  GREETING_CLIP_KINDS,
  GREETING_TEXT,
  VOICE_CLIP_GENDERS,
  VOICE_CLIP_KINDS,
  VOICE_CLIP_LANGS,
  CLIP_LIBRARY,
  burstSkipsTts,
  clipButtonLabel,
  clipFile,
  emotionKindForFile,
  clipLibraryFile,
  emotionClipKind,
  greetingText,
  nextGreetingKind,
  resetGreetingRotation,
} from '../lib/voice-clips';
import { emotionClipPath, resetEmotionClipPicks, saveEmotionClip } from '../lib/emotion-clip-picks';
import { TIER_A_COUNTS, selectTtsButtons, ttsButtonKey } from '../lib/tts-button-registry';

const here = path.dirname(fileURLToPath(import.meta.url));
const LANGS: Lang[] = ['yue', 'zh', 'ja', 'en'];

afterEach(() => resetGreetingRotation());

describe('emotion clips', () => {
  it('ships a file for every language, gender, and kind', () => {
    for (const lang of VOICE_CLIP_LANGS) {
      for (const gender of VOICE_CLIP_GENDERS) {
        for (const kind of VOICE_CLIP_KINDS) {
          const rel = clipFile(lang, gender, kind);
          const file = path.resolve(here, '../public', rel.slice(1));
          expect(fs.existsSync(file), rel).toBe(true);
          const min = (BURST_CLIP_KINDS as readonly string[]).includes(kind) ? 1500 : 400;
          expect(fs.statSync(file).size, rel).toBeGreaterThan(min);
        }
      }
    }
  });

  it('rotates the four default greetings', () => {
    expect(GREETING_CLIP_KINDS).toEqual(['hello', 'nice', 'hihi', 'pleasure']);
    expect([nextGreetingKind(), nextGreetingKind(), nextGreetingKind(), nextGreetingKind(), nextGreetingKind()])
      .toEqual(['hello', 'nice', 'hihi', 'pleasure', 'hello']);
    expect(greetingText('en', 'hello')).toBe('Hello!');
    expect(greetingText('en', 'nice')).toBe('Nice to meet you.');
    expect(greetingText('ja', 'pleasure')).toContain('どう');
    expect(GREETING_TEXT.yue.hihi).toBe('嗨嗨！');
    expect(FILLER_CLIP_TEXT.en.think).toBe('um…… let me think.');
    expect(FILLER_CLIP_TEXT.en.search).toBe('um…… let me search the web.');
  });

  it('maps loading stubs to short sounds or the think/search line', () => {
    for (const lang of LANGS) {
      for (const line of LOADING_STUBS[lang]) {
        const kind = emotionClipKind(line, 'line');
        expect(kind, `${lang} ${line}`).not.toBeNull();
        if (/think|諗下|想想|考え/.test(line)) expect(kind).toBe('think');
        else if (/search|上網|上网|調べ/.test(line)) expect(kind).toBe('search');
        else expect(['um', 'ha']).toContain(kind);
      }
    }
  });

  it('replaces laugh and smile leads, and leaves ordinary sentences alone', () => {
    for (const character of CHARACTERS) {
      for (const lang of LANGS) {
        for (let n = 0; n < 4; n++) {
          expect(emotionClipKind(pickLaugh(character.id, lang, n), 'lead')).not.toBeNull();
          for (const mood of ['happy', 'tired', 'sad', 'angry'] as const) {
            const moodLine = pickLaugh(character.id, lang, n, mood);
            expect(emotionClipKind(moodLine, 'lead'), moodLine).not.toBeNull();
          }
        }
      }
    }
    expect(emotionClipKind('hehe!', 'lead')).toBe('giggle');
    expect(emotionClipKind('哈哈！', 'lead')).toBe('laugh');
    expect(emotionClipKind('ooh!', 'lead')).toBe('wow');
    expect(emotionClipKind('oh!', 'lead')).toBe('oh');
    expect(emotionClipKind('嗯……', 'line')).toBe('um');
    expect(emotionClipKind('ha……', 'line')).toBe('ha');
    expect(emotionClipKind(INTERJECTIONS.joy?.en?.text ?? '', 'lead')).toBe('giggle');
    expect(emotionClipKind(INTERJECTIONS.excitement?.zh?.text ?? '', 'lead')).toBe('wow');
    expect(emotionClipKind('Cheers!', 'lead')).toBeNull();
    expect(emotionClipKind('So good, right?', 'lead')).toBeNull();
    expect(emotionClipKind('Oh I would love to hear that story tomorrow.', 'line')).toBeNull();
    expect(emotionClipKind('Let me tell you something funny about the park.', 'line')).toBeNull();
    expect(EMOTION_CLIP_KINDS).toContain('laugh');
    expect(EMOTION_CLIP_KINDS).toContain('smile');
    expect(BURST_CLIP_KINDS).toEqual(['laugh', 'smile', 'giggle', 'wow', 'um', 'oh', 'ha']);
    for (const kind of BURST_CLIP_KINDS) {
      expect(burstSkipsTts(kind)).toBe(true);
      expect(BURST_CLIP_LABEL.ja[kind].length).toBeGreaterThan(0);
      expect(BURST_CLIP_LABEL.en[kind].length).toBeGreaterThan(0);
    }
    expect(burstSkipsTts('think')).toBe(false);
    expect(burstSkipsTts('search')).toBe(false);
    expect(burstSkipsTts(null)).toBe(false);
    const voice = fs.readFileSync(path.resolve(here, '../lib/voice.ts'), 'utf8');
    expect(voice).toContain('burstSkipsTts');
    expect(voice).toContain('clipOnly: true');
    expect(voice).toContain('previewEmotionClip');
    for (const [folder, genders] of Object.entries(CLIP_LIBRARY)) {
      for (const [gender, files] of Object.entries(genders)) {
        for (const name of files) {
          const rel = clipLibraryFile(folder as 'yue', gender as 'female', name);
          const expected = `/voice-clips/${folder}/${gender}/${name}`;
          expect(rel).toBe(expected);
          const disk = path.resolve(here, '../public', expected.slice(1));
          expect(fs.existsSync(disk), expected).toBe(true);
          expect(fs.statSync(disk).size, expected).toBeGreaterThan(1500);
        }
      }
    }
    expect(clipLibraryFile('ja', 'female', '../hello.mp3')).toBeNull();
    expect(fs.existsSync(path.resolve(here, '../public/voice-clips/ATTRIBUTION.md'))).toBe(true);
  });

  it('labels every clip in a row differently, and never as Universal', () => {
    for (const [folder, genders] of Object.entries(CLIP_LIBRARY)) {
      for (const files of Object.values(genders)) {
        const labels = (files as readonly string[]).map((file) => clipButtonLabel('en', file));
        expect(new Set(labels).size, folder).toBe(labels.length);
        for (const label of labels) {
          expect(label.toLowerCase()).not.toBe('universal');
          expect(label.length).toBeGreaterThan(0);
        }
      }
    }
    expect(clipButtonLabel('en', 'laugh_anime.mp3')).toBe('Laugh · anime');
    expect(clipButtonLabel('en', 'giggle_en.mp3')).toBe('Giggle · en');
    expect(emotionKindForFile('hehe.mp3')).toBe('giggle');
    expect(emotionKindForFile('sigh.mp3')).toBe('sigh');
  });

  it('keeps a select-board clip for that emotion in chat', () => {
    resetEmotionClipPicks();
    saveEmotionClip('a01-shino', 'universal', 'female', 'laugh_anime.mp3');
    expect(emotionClipPath('a01-shino', 'yue', 'female', 'laugh')).toBe('/voice-clips/universal/female/laugh_anime.mp3');
    expect(emotionClipPath('a01-shino', 'yue', 'female', 'wow')).toBe('/voice-clips/yue/female/wow.mp3');
    expect(emotionClipPath('a02-shibu', 'yue', 'female', 'laugh')).toBe('/voice-clips/yue/female/laugh.mp3');
    saveEmotionClip('a01-shino', 'yue', 'female', 'giggle.mp3');
    expect(emotionClipPath('a01-shino', 'en', 'female', 'giggle')).toBe('/voice-clips/yue/female/giggle.mp3');
    resetEmotionClipPicks();
  });
});

describe('TTS button registry', () => {
  it('lists every shipping Edge voice with a unique sheet label', () => {
    const buttons = selectTtsButtons();
    expect(buttons.length).toBeGreaterThan(28);
    expect(buttons.map((b) => b.id)).toEqual(EDGE_VOICE_BUTTONS.map((b) => b.id));
    expect(buttons.map((b) => b.label)).toEqual(EDGE_VOICE_BUTTONS.map((b) => b.label));
    expect(buttons.map((b) => b.label)).toContain('Cantonese female 1');
    expect(buttons.map((b) => b.label)).toContain('Japanese male 1');
    expect(buttons.map((b) => b.label)).toContain('Mandarin male 4');
    expect(buttons.map((b) => b.label)).toContain('English female 6');
    expect(buttons.every((b) => b.engine === 'edge' && b.shipping)).toBe(true);
    expect(new Set(buttons.map(ttsButtonKey)).size).toBe(buttons.length);
    expect(selectTtsButtons('yue')).toHaveLength(TIER_A_COUNTS.yue);
    expect(selectTtsButtons('zh')).toHaveLength(TIER_A_COUNTS.zh);
    expect(selectTtsButtons('ja')).toHaveLength(TIER_A_COUNTS.ja);
    expect(selectTtsButtons('en')).toHaveLength(TIER_A_COUNTS.en);
    expect(selectTtsButtons('yue').map((b) => b.label)).toEqual([
      'Cantonese male 1',
      'Cantonese female 1',
      'Cantonese female 2',
    ]);
    expect(buttons.some((b) => b.id.startsWith('kokoro') || b.engine !== 'edge')).toBe(false);
  });

  it('filters browser voices by language tag and ignores the voice name', () => {
    const voices = [
      { lang: 'zh-HK', name: 'Whatever' },
      { lang: 'zh-CN', name: 'David' },
      { lang: 'ja-JP', name: 'Guy' },
      { lang: 'en-US', name: 'HiuMaan' },
      { lang: 'en-GB', name: 'Libby' },
      { lang: 'yue-HK', name: 'Local' },
    ];
    expect(browserVoicesForLang(voices, 'yue').map((v) => v.lang)).toEqual(['zh-HK', 'yue-HK']);
    expect(browserVoicesForLang(voices, 'zh').map((v) => v.lang)).toEqual(['zh-CN']);
    expect(browserVoicesForLang(voices, 'ja').map((v) => v.lang)).toEqual(['ja-JP']);
    expect(browserVoicesForLang(voices, 'en').map((v) => v.lang)).toEqual(['en-US', 'en-GB']);
  });
});
