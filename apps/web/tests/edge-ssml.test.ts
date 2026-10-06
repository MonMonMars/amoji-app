import { describe, expect, it } from 'vitest';
import {
  buildEdgeSsml, edgeStyleFor, getTtsProxy, setTtsProxy,
} from '../lib/edge-tts';

// r2026-10-06.131 — the free readaloud socket accepts mstts:express-as
// emotional styles; these tests pin the SSML the app actually sends:
// style choice per voice+emotion, styledegree only on zh voices, the mstts
// namespace appearing only when a style is used, escaping, melody + style
// coexistence, and the proxy URL round-trip.

describe('edgeStyleFor — voice × emotion style resolution (r131)', () => {
  it('joy on a zh-CN female voice resolves to cheerful', () => {
    expect(edgeStyleFor('zh-CN-XiaoxiaoNeural', 'joy')).toBe('cheerful');
  });

  it('excitement prefers excited over cheerful', () => {
    expect(edgeStyleFor('zh-CN-XiaoxiaoNeural', 'excitement')).toBe('excited');
  });

  it('Cantonese voices get the HK style set — fear becomes worried', () => {
    expect(edgeStyleFor('zh-HK-HiuGaaiNeural', 'fear')).toBe('worried');
    expect(edgeStyleFor('zh-HK-HiuMaanNeural', 'sadness')).toBe('sad');
    expect(edgeStyleFor('zh-HK-WanLungNeural', 'anger')).toBe('serious'); // HK set has no angry → falls to serious
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

  it('escapeXml still guards user text inside styled SSML', () => {
    const ssml = buildEdgeSsml('A & B < C！', { ...base, character: 'juno', emotion: 'joy' });
    expect(ssml).toContain('A &amp; B &lt; C');
    expect(ssml).not.toContain('A & B');
  });

  it('singing mode (melody) composes with a style', () => {
    const ssml = buildEdgeSsml('啦啦啦，啦啦啦。', { ...base, character: 'juno', emotion: 'joy', melody: [0.1, 0.2, 0.15] });
    expect(ssml).toContain("style='cheerful'");
    expect(ssml.match(/<prosody/g)!.length).toBe(2); // one note per clause
  });

  it('a leading tic lands before the styled body', () => {
    const ssml = buildEdgeSsml('真的嗎？', {
      ...base, character: 'juno', emotion: 'surprise',
      lead: { text: '哇！', pitch: 0.3, rate: 0.15 },
    });
    const ticAt = ssml.indexOf('哇！');
    const bodyAt = ssml.indexOf('真的嗎？');
    expect(ticAt).toBeGreaterThan(-1);
    expect(ticAt).toBeLessThan(bodyAt);
    expect(ssml).toContain("style='excited'"); // surprise → excited
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

describe('TTS proxy URL (r131)', () => {
  it('set/get round-trips, and null clears', () => {
    setTtsProxy('https://amoji-tts.example.workers.dev/');
    expect(getTtsProxy()).toBe('https://amoji-tts.example.workers.dev/');
    setTtsProxy(null);
    expect(getTtsProxy()).toBeNull();
  });
});
