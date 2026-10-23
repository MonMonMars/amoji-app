import { describe, expect, it } from 'vitest';
import {
  buildEdgeSsml, edgeStyleFor, getTtsProxy, resolveEdgeVoice, resolveTtsProxy, setTtsProxy,
} from '../lib/edge-tts';
import { isFemaleNeuralVoice, isMaleNeuralVoice } from '../lib/voice-catalog';

// r2026-10-06.131 — the free readaloud socket accepts mstts:express-as
// emotional styles; these tests pin the SSML the app actually sends:
// style choice per voice+emotion, styledegree only on zh voices, the mstts
// namespace appearing only when a style is used, escaping, melody + style
// coexistence, and the proxy URL round-trip.

describe('edgeStyleFor — voice × emotion style resolution (r131)', () => {
  it('want-list Cantonese uses a zh-HK voice and keeps male characters male', () => {
    const female = buildEdgeSsml('你好呀', { lang: 'yue', gender: 'female', character: 'a01-shino' });
    expect(female).toContain("voice name='zh-HK-HiuGaaiNeural'");
    expect(female).toContain("xml:lang='zh-HK'");
    const male = buildEdgeSsml('你好呀', { lang: 'yue', gender: 'female', character: 'a98-ethan' });
    expect(male).toContain("voice name='zh-HK-WanLungNeural'");
    expect(male).not.toContain('HiuMaan');
    expect(male).not.toContain('HiuGaai');
  });

  it('joy on a zh-CN female voice resolves to cheerful', () => {
    expect(edgeStyleFor('zh-CN-XiaoxiaoNeural', 'joy')).toBe('cheerful');
  });

  it('excitement prefers excited over cheerful', () => {
    expect(edgeStyleFor('zh-CN-XiaoxiaoNeural', 'excitement')).toBe('excited');
  });

  it('Cantonese voices get the HK style set — fear becomes worried', () => {
    expect(edgeStyleFor('zh-HK-HiuGaaiNeural', 'fear')).toBe('worried');
    expect(edgeStyleFor('zh-HK-HiuMaanNeural', 'sadness')).toBe('sad');
    expect(edgeStyleFor('zh-HK-WanLungNeural', 'anger')).toBeNull(); // WanLung has no express-as set
  });

  it('embarrassment on a shy-capable voice resolves to shy', () => {
    expect(edgeStyleFor('zh-CN-XiaoyiNeural', 'embarrassment')).toBe('shy');
  });

  it('fear on Xiaoxiao picks her terrified style', () => {
    expect(edgeStyleFor('zh-CN-XiaoxiaoNeural', 'fear')).toBe('terrified');
  });

  it('Japanese voices ship no styles — always null', () => {
    expect(edgeStyleFor('ja-JP-NanamiNeural', 'joy')).toBeNull();
    expect(edgeStyleFor('ja-JP-KeitaNeural', 'anger')).toBeNull();
  });

  it('neutral and unknown emotions never produce a style', () => {
    expect(edgeStyleFor('zh-CN-XiaoxiaoNeural', 'neutral')).toBeNull();
    expect(edgeStyleFor('zh-CN-XiaoxiaoNeural', 'cosmic_dread')).toBeNull();
  });

  it('unlisted voices stay style-free', () => {
    expect(edgeStyleFor('en-US-JennyNeural', 'joy')).toBeNull();
    expect(edgeStyleFor('en-HK-SamNeural', 'sadness')).toBeNull();
  });

  it('English Aria resolves only her documented set', () => {
    expect(edgeStyleFor('en-US-AriaNeural', 'joy')).toBe('cheerful');
    expect(edgeStyleFor('en-US-AriaNeural', 'sadness')).toBe('sad');
    expect(edgeStyleFor('en-US-AriaNeural', 'anger')).toBeNull(); // angry ∉ Aria's set
  });
});

describe('buildEdgeSsml — the SSML the socket receives (r131)', () => {
  const base = { lang: 'zh', gender: 'female' as const };

  it('wraps an emotional line in mstts:express-as with the mstts namespace', () => {
    const ssml = buildEdgeSsml('你今天好嗎？', { ...base, character: 'juno', emotion: 'joy' });
    expect(ssml).toContain("xmlns:mstts='http://www.w3.org/2001/mstts'");
    expect(ssml).toContain("<mstts:express-as style='cheerful'");
    expect(ssml).toContain("styledegree='");           // zh voice → degree present
    expect(ssml).toMatch(/styledegree='1\.\d\d'/);      // 1.0..2.0, two decimals
    expect(ssml).toContain("voice name='zh-CN-XiaoxiaoNeural'");
  });

  it('English Aria gets a style but NO styledegree', () => {
    const ssml = buildEdgeSsml('I missed you!', { lang: 'en', gender: 'female', character: 'sky', emotion: 'love' });
    // love prefs (tender, sweet, friendly, calm) ∩ Aria's set → friendly
    expect(ssml).toContain("<mstts:express-as style='friendly'");
    expect(ssml).not.toContain('styledegree'); // en voices reject the attribute
  });

  it('neutral lines carry no express-as and no mstts namespace', () => {
    const ssml = buildEdgeSsml('你好。', { ...base, character: 'juno' });
    expect(ssml).not.toContain('express-as');
    expect(ssml).not.toContain('xmlns:mstts');
  });

  it('Japanese lines stay prosody-only even when emotional', () => {
    const ssml = buildEdgeSsml('会えて嬉しい！', { lang: 'ja', gender: 'female', character: 'juno', emotion: 'excitement' });
    expect(ssml).not.toContain('express-as');
    expect(ssml).toContain('<prosody'); // the contour still rides
  });

  it('drops voiced symbols instead of escaping them into the audio', () => {
    const ssml = buildEdgeSsml("don't say A & B < C！", { ...base, character: 'juno', emotion: 'joy' });
    expect(ssml).toContain('don&apos;t say A B C！');
    expect(ssml).not.toContain('&amp;');
    expect(ssml).not.toContain('&lt;');
    expect(ssml).not.toContain('A & B');
  });

  it('omits commas and periods from spoken text but keeps the breath break', () => {
    const ssml = buildEdgeSsml('Haha, you got my head. Still playing?', {
      lang: 'en', gender: 'female', character: 'sky', emotion: 'joy',
    });
    const spoken = ssml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    expect(spoken).toContain('Haha');
    expect(spoken).toContain('you got my head');
    expect(spoken).toContain('Still playing?');
    expect(spoken).not.toMatch(/[,.]/);
    expect(ssml).toContain('<break');
  });

  it('keeps a poke laugh pitch on the laugh, not the line after it', () => {
    const ssml = buildEdgeSsml('Haha, you got my head. Still playing?', {
      lang: 'en', gender: 'female', character: 'sky', emotion: 'joy',
      pitchDelta: 0.16,
      lead: { text: 'Haha!', pitch: 0.33, rate: 0.08 },
    });
    expect(ssml).toContain("pitch='+8%'");
    expect(ssml).not.toContain("pitch='+33%'");
    const laughPitch = ssml.indexOf("pitch='+8%'");
    const lineAt = ssml.indexOf('you got my head');
    expect(laughPitch).toBeGreaterThan(-1);
    expect(lineAt).toBeGreaterThan(laughPitch);
    expect(ssml.slice(laughPitch, lineAt)).toContain('>Haha<');
    expect(ssml.slice(laughPitch, lineAt)).not.toContain('Haha!');
    expect(ssml.slice(lineAt)).not.toContain("pitch='+33%'");
  });

  it('singing mode (melody) composes with a style', () => {
    const ssml = buildEdgeSsml('啦啦啦，啦啦啦。', { ...base, character: 'juno', emotion: 'joy', melody: [0.1, 0.2, 0.15] });
    expect(ssml).toContain("style='cheerful'");
    expect(ssml.match(/<prosody/g)!.length).toBe(2); // one note per clause
  });

  it('a leading tic lands before the styled body, outside the style', () => {
    const ssml = buildEdgeSsml('真的嗎？', {
      ...base, character: 'juno', emotion: 'surprise',
      lead: { text: '哇！', pitch: 0.3, rate: 0.15 },
    });
    const ticAt = ssml.indexOf('>哇<');
    const bodyAt = ssml.indexOf('真的嗎？');
    const styleAt = ssml.indexOf('<mstts:express-as');
    expect(ticAt).toBeGreaterThan(-1);
    expect(ticAt).toBeLessThan(bodyAt);
    expect(ticAt).toBeLessThan(styleAt);
    expect(ssml).toContain("style='excited'"); // surprise → excited, on the line only
    expect(ssml).toContain("pitch='+8%'");
    expect(ssml).not.toContain("pitch='+30%'");
    expect(ssml).not.toContain("pitch='+50%'");
  });

  it('an English poke cheer is not spelled as punctuation and stays under a squeak', () => {
    const ssml = buildEdgeSsml('Haha, you got my head. I nearly sat down laughing — still playing?', {
      lang: 'en', gender: 'female', character: 'juno', emotion: 'joy',
      rateDelta: 0.15, pitchDelta: 0.3,
      lead: { text: 'Haha!', pitch: 0.18, rate: 0.08 },
    });
    expect(ssml).not.toMatch(/[~～—，]/);
    expect(ssml).not.toMatch(/tilde|ellipsis|exclamation/i);
    const pitches = [...ssml.matchAll(/pitch='([+-]?\d+)%'/g)].map((m) => Math.abs(Number(m[1])));
    expect(pitches.length).toBeGreaterThan(0);
    for (const p of pitches) expect(p).toBeLessThanOrEqual(18);
  });

  it('expressiveness scales styledegree within 1.00–2.00', () => {
    const calm = buildEdgeSsml('你好。', { ...base, character: 'juno', emotion: 'joy', expressiveness: 0.6 });
    const wild = buildEdgeSsml('你好。', { ...base, character: 'juno', emotion: 'joy', expressiveness: 1.8 });
    const d = (s: string) => Number(s.match(/styledegree='([\d.]+)'/)![1]);
    expect(d(calm)).toBeGreaterThanOrEqual(1.0);
    expect(d(wild)).toBeLessThanOrEqual(2.0);
    expect(d(wild)).toBeGreaterThan(d(calm));
  });
});

describe('per-character Edge voices', () => {
  it('gives neighboring companions different neural voices', () => {
    const shino = resolveEdgeVoice({ lang: 'en', gender: 'female', character: 'a01-shino' });
    const shibu = resolveEdgeVoice({ lang: 'en', gender: 'female', character: 'a02-shibu' });
    expect(shino.name).toBe('en-US-JennyNeural');
    expect(shibu.name).toBe('en-GB-SoniaNeural');
    expect(shino.name).not.toBe(shibu.name);
    expect(resolveEdgeVoice({ lang: 'zh', gender: 'female', character: 'a01-shino' }).name).toBe('zh-CN-XiaoxiaoNeural');
    expect(resolveEdgeVoice({ lang: 'zh', gender: 'female', character: 'a02-shibu' }).name).toBe('zh-CN-XiaoyiNeural');
    expect(resolveEdgeVoice({ lang: 'yue', gender: 'female', character: 'a02-shibu' }).name).toBe('zh-HK-HiuMaanNeural');
    expect(resolveEdgeVoice({ lang: 'en', gender: 'male', character: 'a24-hairsample-male' }).name).toBe('en-US-GuyNeural');
    expect(resolveEdgeVoice({ lang: 'en', gender: 'male', character: 'a459-chinesewarriormonk' }).name).toBe('en-GB-RyanNeural');
    expect(resolveEdgeVoice({ lang: 'en', gender: 'male', character: 'a468-eric' }).name).toBe('en-US-ChristopherNeural');
    expect(resolveEdgeVoice({ lang: 'en', gender: 'male', character: 'a98-ethan' }).name).toBe('en-HK-SamNeural');
    expect(resolveEdgeVoice({ lang: 'en', gender: 'female' }).name).toBe('en-US-JennyNeural');
  });

  it('speaks male companions with a male Edge voice and never styles WanLung', () => {
    const langs = ['yue', 'zh', 'ja', 'en'] as const;
    for (const lang of langs) {
      for (const id of ['a24-hairsample-male', 'a98-ethan']) {
        const voice = resolveEdgeVoice({ lang, gender: 'male', character: id });
        expect(isMaleNeuralVoice(voice.name), `${id} ${lang} ${voice.name}`).toBe(true);
        expect(isFemaleNeuralVoice(voice.name), `${id} ${lang}`).toBe(false);
        const ssml = buildEdgeSsml('你好呀', { lang, gender: 'male', character: id, emotion: 'joy' });
        expect(ssml).toContain(`voice name='${voice.name}'`);
        if (voice.name === 'zh-HK-WanLungNeural' || voice.name === 'ja-JP-KeitaNeural') {
          expect(ssml, `${id} ${lang}`).not.toContain('express-as');
        } else if (ssml.includes('express-as')) {
          const style = edgeStyleFor(voice.name, 'joy');
          expect(style, `${voice.name} joy`).toBeTruthy();
          expect(ssml).toContain(`style='${style}'`);
        }
      }
    }
  });

  it('separates the two Cantonese males by pitch when only WanLung exists', () => {
    const first = resolveEdgeVoice({ lang: 'yue', gender: 'male', character: 'a24-hairsample-male' });
    const second = resolveEdgeVoice({ lang: 'yue', gender: 'male', character: 'a98-ethan' });
    expect(first.name).toBe('zh-HK-WanLungNeural');
    expect(second.name).toBe('zh-HK-WanLungNeural');
    expect(first.pitch).not.toBe(second.pitch);
  });
});

describe('TTS proxy URL (r131)', () => {
  it('set/get round-trips, and null clears', () => {
    setTtsProxy('https://amoji-tts.example.workers.dev/');
    expect(getTtsProxy()).toBe('https://amoji-tts.example.workers.dev');
    setTtsProxy(null);
    expect(getTtsProxy()).toBeNull();
  });

  it('uses the Pages env URL only when nothing is saved or cleared', () => {
    expect(resolveTtsProxy(undefined, null, 'https://pages.example.workers.dev/')).toBe('https://pages.example.workers.dev');
    expect(resolveTtsProxy(null, null, 'https://pages.example.workers.dev/')).toBeNull();
    expect(resolveTtsProxy(undefined, '', 'https://pages.example.workers.dev/')).toBeNull();
    expect(resolveTtsProxy('https://saved.example/', null, 'https://pages.example.workers.dev')).toBe('https://saved.example');
    expect(resolveTtsProxy(undefined, null, '  ')).toBeNull();
  });
});
