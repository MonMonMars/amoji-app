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
  it('plays long UM lang+gender fillers and CLIP_LIBRARY poke hits', () => {
    // t722: loading/thinking fillers are long UM only (never short um / HA HA)
    expect(recordedFillerClip('female', 'um', 'yue')).toMatch(/\/voice-clips\/yue\/female\/um_long/);
    expect(recordedFillerClip('male', 'um', 'yue')).toMatch(/\/voice-clips\/yue\/male\/um_long/);
    expect(recordedFillerClip('female', 'um', 'en')).toMatch(/\/voice-clips\/en\/female\/um_long/);
    expect(recordedFillerClip('female', 'ha', 'yue')).toMatch(/\/voice-clips\/yue\/female\/um_long/);
    expect(recordedFillerClip('male', 'think', 'ja')).toMatch(/\/voice-clips\/ja\/male\/um_long/);
    expect(recordedFillerClip('male', 'think', 'ja')).not.toContain('think.mp3');
    // Female poke = CLIP #94; Male poke = CLIP #52
    expect(recordedPokeClip('female')).toBe('/voice-clips/universal/female/wow_woven.mp3');
    expect(recordedPokeClip('male')).toBe('/voice-clips/ja/male/oh.mp3');
    expect(loadingFillerKind('um……')).toBe('um');
    expect(loadingFillerKind('ha……')).toBe('um');
    expect(loadingFillerKind('um…… let me think.')).toBe('think');
    expect(loadingFillerKind('um…… let me search the web.')).toBe('search');
  });
});
