import { describe, expect, it } from 'vitest';
import { buildEdgeSsml } from '../lib/edge-tts';

/**
 * SSML prosody volume must never be emitted in decibels.
 *
 * The readaloud endpoint refuses `volume='±N.NdB'` with
 * `1007 … SSML parsing error: 0x80045003` and drops the whole utterance,
 * while the identical clause with `volume='±N%'` synthesizes normally.
 * `buildEdgeSsml` attaches a volume to every spoken clause, so one bad unit
 * silenced every line — and two failures trip the client's
 * EDGE_FAILURE_LIMIT=2 breaker, which parks the Edge tier for five minutes.
 *
 * These assertions are on the real output of the builder, not on a helper,
 * because the regression is about the units that reach the wire.
 */

const SPEAK = '你好呀，今日天氣好好。';

describe('Edge SSML prosody volume units', () => {
  it('never emits a dB volume for a plain line', () => {
    const ssml = buildEdgeSsml(SPEAK, { lang: 'yue', gender: 'female', character: 'a01-shino' });
    expect(ssml).toContain('<prosody');
    expect(ssml).not.toMatch(/volume\s*=\s*['"][^'"]*dB['"]/);
    expect(ssml).toMatch(/volume\s*=\s*['"][+-]?\d+%['"]/);
  });

  it('never emits a dB volume when an emotion style is applied', () => {
    // A styled utterance is the path that also wraps <mstts:express-as>; the
    // volume attribute sits on the inner prosody clauses either way.
    const ssml = buildEdgeSsml(SPEAK, {
      lang: 'yue',
      gender: 'female',
      character: 'a01-shino',
      emotion: 'joy',
    });
    expect(ssml).not.toMatch(/volume\s*=\s*['"][^'"]*dB['"]/);
  });

  it('never emits a dB volume for the forcePlain retry body', () => {
    // `speakEdge` retries once with forcePlain after a rejected styled body.
    // Both attempts must be sendable or the retry cannot rescue the tier.
    const ssml = buildEdgeSsml(SPEAK, {
      lang: 'yue',
      gender: 'female',
      character: 'a01-shino',
      forcePlain: true,
    });
    expect(ssml).not.toMatch(/volume\s*=\s*['"][^'"]*dB['"]/);
  });

  it('keeps volume as a percentage for every language in the picker', () => {
    const langs = ['yue', 'zh', 'ja', 'en'] as const;
    for (const lang of langs) {
      const ssml = buildEdgeSsml(
        lang === 'ja' ? 'こんにちは。' : lang === 'en' ? 'Hello there.' : SPEAK,
        { lang, gender: 'male', character: 'a01-shino' },
      );
      expect(ssml, lang).not.toMatch(/volume\s*=\s*['"][^'"]*dB['"]/);
    }
  });

  it('converts the 8x-dB scale to the equivalent percentage', () => {
    // A neutral clause asks for db(0) → 0 dB → +0%. A lifted clause asks for
    // db(0.2) → +1.6 dB → (10^(1.6/20) - 1) * 100 ≈ +20%. The exact value
    // depends on the emotion table, so assert the unit and the sign rather
    // than a brittle constant.
    const ssml = buildEdgeSsml(SPEAK, { lang: 'yue', gender: 'female', character: 'a01-shino' });
    expect(ssml).toContain("volume='+0%'");
  });
});
