import { describe, expect, it } from 'vitest';
import { cleanForDisplay, cleanForSpeech } from '../lib/speak-text';

describe('speak text cleaner', () => {
  it('strips emotion labels and markup before speech', () => {
    const raw = '你好呀 [happy] *laughs* (微笑)\n[emotion:{"joy":0.9}] `code` https://example.com';
    expect(cleanForSpeech(raw)).toBe('你好呀');
    expect(cleanForDisplay(raw)).toBe('你好呀');
  });

  it('does not speak the names of punctuation marks', () => {
    expect(cleanForSpeech('等陣 hyphen 先 period')).toBe('等陣 先');
    expect(cleanForSpeech('我想清楚 — 先講')).toContain('，');
    expect(cleanForSpeech('我想清楚 — 先講')).not.toMatch(/hyphen|dash|period|full stop/i);
    expect(cleanForSpeech('你好. 再講')).toBe('你好。再講');
  });
});
