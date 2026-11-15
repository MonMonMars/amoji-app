/**
 * Soft Japanese mood INTERJECTIONS must speak via TTS, not fire ha/smile
 * burst MP3s. Broad /^は/ and /^ふ/ lead classifiers used to mis-route
 * はい / ふぅ / ふう / ふん.
 */
import { describe, expect, it } from 'vitest';
import { INTERJECTIONS } from '../lib/fillers';
import { emotionClipKind } from '../lib/voice-clips';

describe('ja soft mood tics — no burst misclass', () => {
  it('はい / ふぅ / ふう / ふん stay null leads (TTS)', () => {
    expect(emotionClipKind('はい。', 'lead')).toBeNull();
    expect(emotionClipKind('ふぅ……', 'lead')).toBeNull();
    expect(emotionClipKind('ふう……', 'lead')).toBeNull();
    expect(emotionClipKind('ふん！', 'lead')).toBeNull();
  });

  it('real ha/smile bursts still classify', () => {
    expect(emotionClipKind('はあ', 'lead')).toBe('ha');
    expect(emotionClipKind('はぁ', 'lead')).toBe('ha');
    expect(emotionClipKind('は……まあまあ、怒ってられない。', 'lead')).toBe('ha');
    expect(emotionClipKind('ふっ', 'lead')).toBe('smile');
    expect(emotionClipKind('ふ……これは笑える。', 'lead')).toBe('smile');
    expect(emotionClipKind('ふふ', 'lead')).toBe('giggle');
  });

  it('INTERJECTIONS soft ja moods are not burst leads', () => {
    for (const key of ['love', 'contentment', 'relief', 'pride'] as const) {
      const text = INTERJECTIONS[key]?.ja?.text;
      expect(text, key).toBeTruthy();
      expect(emotionClipKind(text!, 'lead'), `${key}:${text}`).toBeNull();
    }
  });
});
