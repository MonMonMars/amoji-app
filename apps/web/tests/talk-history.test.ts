import { describe, expect, it } from 'vitest';
import { openTalk, sealTalk, summarizeTalk, talkMood } from '../lib/talk-history';
import { loadingFillerKind, recordedFillerClip, recordedPokeClip } from '../lib/voice-clips';

describe('talk history', () => {
  it('summarizes emotion without keeping the sentence in the summary object keys as text', () => {
    const summary = summarizeTalk('I am so happy and glad to see you');
    expect(summary.chars).toBeGreaterThan(10);
    expect(summary.emotions.joy).toBeGreaterThan(0);
    expect(JSON.stringify(summary)).not.toContain('happy');
  });

  it('seals and opens with a device key', async () => {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const seal = await sealTalk('hello there', secret);
    expect(seal.cipher).not.toContain('hello');
    expect(await openTalk(seal, secret)).toBe('hello there');
  });

  it('reads the user mood from recent rows', () => {
    expect(talkMood([
      { role: 'user', emotions: { sadness: 0.4 } },
      { role: 'assistant', emotions: { joy: 0.9 } },
      { role: 'user', emotions: { sadness: 0.5 } },
    ])).toBe('sadness');
  });
});

describe('recorded fillers and poke', () => {
  it('plays short lang+gender um clips and CLIP_LIBRARY poke hits', () => {
    // Yue F #5 / Yue M #12
    expect(recordedFillerClip('female', 'um', 'yue')).toBe('/voice-clips/yue/female/um.mp3');
    expect(recordedFillerClip('male', 'um', 'yue')).toBe('/voice-clips/yue/male/um.mp3');
    expect(recordedFillerClip('female', 'um', 'en')).toBe('/voice-clips/en/female/um.mp3');
    expect(recordedFillerClip('female', 'ha', 'yue')).toBe('/voice-clips/yue/female/ha.mp3');
    expect(recordedFillerClip('male', 'think', 'ja')).toBe('/voice-clips/ja/male/um.mp3');
    expect(recordedFillerClip('male', 'think', 'ja')).not.toContain('think.mp3');
    // Female poke = CLIP #94; Male poke = CLIP #52
    expect(recordedPokeClip('female')).toBe('/voice-clips/universal/female/wow_woven.mp3');
    expect(recordedPokeClip('male')).toBe('/voice-clips/ja/male/oh.mp3');
    expect(loadingFillerKind('um……')).toBe('um');
    expect(loadingFillerKind('ha……')).toBe('ha');
    expect(loadingFillerKind('um…… let me think.')).toBe('think');
    expect(loadingFillerKind('um…… let me search the web.')).toBe('search');
  });
});
