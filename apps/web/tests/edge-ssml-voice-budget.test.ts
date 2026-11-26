import { describe, expect, it } from 'vitest';
import { buildEdgeSsml } from '../lib/edge-tts';

/**
 * The readaloud endpoint rejects any SSML whose <voice> has THREE OR MORE
 * element children with `1007: SSML is invalid`, and answers with no audio.
 * Measured 2026-11-25 against the live relay (`amoji-voice.monmonmars.workers.dev`):
 *
 *   1 clause  (1 prosody)              → 200, X-Amoji-Attempts: 1
 *   2 clauses (2 prosody)              → 200, X-Amoji-Attempts: 1
 *   3 clauses (3 prosody + 2 break)    → 502 "upstream closed 1007: SSML is invalid"
 *   4 clauses (4 prosody + 3 break)    → 502, same
 *
 * That is the owner's "the third sentence has no voice": the builder emitted
 * one <prosody> per clause plus a <break> between them, so normal-length lines
 * failed outright, tripped EDGE_FAILURE_LIMIT=2 and parked the tier for 5 min.
 *
 * These tests assert the structural guarantee on the real builder output.
 */

const LANGS = ['yue', 'zh', 'ja', 'en'] as const;

/** 1..6 natural clauses per language. */
const LINES: Record<(typeof LANGS)[number], string[]> = {
  yue: ['你好呀。', '今日天氣好好。', '我真係好開心呀！', '你食咗飯未？', '我等咗你好耐喇。', '不如一齊出去行下？'],
  zh: ['你好。', '今天天气不错。', '我很开心见到你！', '你吃饭了吗？', '我等了你好久。', '要不要一起出去走走？'],
  ja: ['こんにちは。', '今日はいい天気ですね。', '会えて嬉しいです！', 'ご飯食べた？', 'ずっと待ってたよ。', '一緒に出かけない？'],
  en: ['Hello there.', 'How are you?', 'I am fine!', 'What about you?', 'I missed you.', 'Shall we go out?'],
};

/** Element children of <voice>, counted at depth 0 (self-closing counts once). */
function voiceChildren(ssml: string): string[] {
  const open = ssml.indexOf('<voice');
  const start = ssml.indexOf('>', open) + 1;
  const end = ssml.lastIndexOf('</voice>');
  const inner = ssml.slice(start, end);
  const names: string[] = [];
  let depth = 0;
  const re = /<(\/?)([A-Za-z][\w:.-]*)(?:\s[^>]*?)?(\/?)>/g;
  for (let m = re.exec(inner); m; m = re.exec(inner)) {
    const [, closing, name, selfClose] = m;
    if (closing) depth = Math.max(0, depth - 1);
    else {
      if (depth === 0) names.push(name!);
      if (!selfClose) depth += 1;
    }
  }
  return names;
}

/** Text actually inside <voice>, entities decoded. */
function spokenText(ssml: string): string {
  const start = ssml.indexOf('>', ssml.indexOf('<voice')) + 1;
  const end = ssml.lastIndexOf('</voice>');
  return ssml
    .slice(start, end)
    .replace(/<[^>]+>/g, '')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

/** Letters and digits only — punctuation/spacing may legitimately change. */
const words = (s: string) => s.normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '');

describe('SSML <voice> child budget (3+ elements = 1007 SSML is invalid)', () => {
  for (const lang of LANGS) {
    it(`${lang}: 1..6 clauses always emit at most two top-level elements`, () => {
      for (let n = 1; n <= 6; n++) {
        const line = LINES[lang].slice(0, n).join('');
        const ssml = buildEdgeSsml(line, { lang, gender: 'female', character: 'kizuna', emotion: 'joy' });
        const children = voiceChildren(ssml);
        expect(children.length, `${lang} ${n} clauses: ${children.join(' ')}`).toBeLessThanOrEqual(2);
        expect(children.length, `${lang} ${n} clauses`).toBeGreaterThan(0);
      }
    });
  }

  it('never emits a <break> tag (the relay strips it on a second attempt)', () => {
    for (const lang of LANGS) {
      for (let n = 1; n <= 6; n++) {
        const ssml = buildEdgeSsml(LINES[lang].slice(0, n).join(''), { lang, gender: 'male', character: 'kai' });
        expect(ssml, `${lang} ${n}`).not.toMatch(/<break/i);
      }
    }
  });

  it('preserves every word when merging clauses into two spans', () => {
    for (const lang of LANGS) {
      for (let n = 1; n <= 6; n++) {
        const line = LINES[lang].slice(0, n).join('');
        const ssml = buildEdgeSsml(line, { lang, gender: 'female', character: 'kizuna' });
        expect(words(spokenText(ssml)), `${lang} ${n} clauses`).toBe(words(line));
      }
    }
  });

  it('keeps clause-ending punctuation in the spoken text (the pause)', () => {
    const line = '你好呀，今日天氣好好。我真係好開心呀！你食咗飯未？';
    const ssml = buildEdgeSsml(line, { lang: 'yue', gender: 'female', character: 'kizuna' });
    const text = spokenText(ssml);
    for (const mark of ['，', '。', '！', '？']) expect(text, mark).toContain(mark);
  });

  it('folds a lead tic into the first span instead of spending a third element', () => {
    for (const lang of LANGS) {
      const ssml = buildEdgeSsml(LINES[lang].slice(0, 4).join(''), {
        lang, gender: 'female', character: 'kizuna',
        lead: { text: lang === 'en' ? 'Oh!' : lang === 'ja' ? 'あっ' : '哎呀', pitch: 0.25, rate: 0.12 },
      });
      expect(voiceChildren(ssml).length, lang).toBeLessThanOrEqual(2);
      expect(ssml, lang).not.toMatch(/<break/i);
    }
  });

  it('keeps melody mode inside the same budget', () => {
    const ssml = buildEdgeSsml(LINES.zh.slice(0, 6).join(''), {
      lang: 'zh', gender: 'female', character: 'juno', melody: [0.1, 0.2, 0.15, 0.05],
    });
    expect(voiceChildren(ssml).length).toBe(2);
  });

  it('never emits a dB volume and is deterministic', () => {
    for (const lang of LANGS) {
      const line = LINES[lang].slice(0, 5).join('');
      const opts = { lang, gender: 'female' as const, character: 'kizuna', emotion: 'joy' };
      const a = buildEdgeSsml(line, opts);
      const b = buildEdgeSsml(line, opts);
      expect(a, lang).toBe(b);
      expect(a, lang).not.toMatch(/volume\s*=\s*['"][^'"]*dB['"]/);
      expect(a, lang).toMatch(/volume\s*=\s*['"][+-]?\d+%['"]/);
    }
  });

  it('speaks with exactly one voice per line', () => {
    const ssml = buildEdgeSsml(LINES.yue.slice(0, 6).join(''), { lang: 'yue', gender: 'female', character: 'kizuna' });
    expect(ssml.match(/<voice\b/g)!.length).toBe(1);
    expect(ssml.match(/<\/voice>/g)!.length).toBe(1);
  });
});
