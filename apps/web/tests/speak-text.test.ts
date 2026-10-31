import { describe, expect, it } from 'vitest';
import {
  clampBrowserProsody,
  clampLaughDelivery,
  clampLeadProsody,
  cleanForDisplay,
  cleanForSpeech,
  joinSpeechLead,
  prepareSpokenLead,
  sanitizeWebForSpeech,
  stripLaughTokens,
  stripVoicedGlyphs,
} from '../lib/speak-text';

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
    expect(cleanForSpeech('say tilde then ellipsis please')).not.toMatch(/\b(tilde|ellipsis)\b/i);
  });

  it('leaves display punctuation in place when speech rewrites it', () => {
    const raw = 'Wait — really. hyphen next.';
    const shown = cleanForDisplay(raw);
    const spoken = cleanForSpeech(raw);
    expect(shown).toContain('—');
    expect(shown).toContain('hyphen');
    expect(shown).toContain('.');
    expect(spoken).not.toContain('—');
    expect(spoken).not.toMatch(/\bhyphen\b/i);
    expect(spoken).not.toBe(shown);
    expect(cleanForDisplay('你好. 再講')).toBe('你好. 再講');
    expect(cleanForSpeech('你好. 再講')).toBe('你好。再講');
  });

  it('keeps commas, periods, and symbols on screen', () => {
    const line = 'Haha, you got my head. Email me @ x #1 for $5 & 10%.';
    expect(cleanForDisplay(line)).toBe(line);
  });

  it('strips symbols from speech and pause glyphs from the audio string', () => {
    const line = 'Haha, you got my head. Email me @ x #1 for $5 & 10%.';
    const prepared = cleanForSpeech(line);
    expect(prepared).not.toMatch(/[@#$%^&*]/);
    expect(prepared).toContain(',');
    expect(prepared).toContain('.');
    const spoken = stripVoicedGlyphs(prepared);
    expect(spoken).toBe('you got my head Email me x 1 for 5 10'); // t771: Haha stripped
    expect(spoken).not.toMatch(/\b(comma|period|at|hash|dollar|percent|ampersand|and)\b/i);
  });

  it('keeps contractions and decimal points', () => {
    expect(stripVoicedGlyphs("don't stop. pi is 3.14.")).toBe("don't stop pi is 3.14");
  });

  it('strips TTS poke-laugh tokens (t771) without naming the bang', () => {
    expect(cleanForSpeech('Haha!')).toBe('!'); // laugh words gone; bang alone is not speakable
    expect(cleanForSpeech('Haha!')).not.toMatch(/haha/i);
    expect(stripVoicedGlyphs('哈哈！')).toBe('哈哈！');
    expect(stripVoicedGlyphs('呵呵…')).toBe('呵呵');
  });

  it('turns tildes and dashes into pauses instead of spoken marks', () => {
    expect(cleanForSpeech('你好～身中招啦')).toBe('你好 身中招啦');
    expect(cleanForSpeech('你好～身中招啦')).not.toMatch(/tilde|ellipsis/i);
    expect(cleanForSpeech('wait… still here')).toBe('wait… still here');
    expect(cleanForSpeech('laughing — still playing?')).toBe('laughing，still playing?');
    expect(cleanForSpeech('laughing — still playing?')).not.toContain('—');
    expect(stripVoicedGlyphs(cleanForSpeech('laughing — still playing?'))).toBe('laughing still playing?');
    expect(cleanForDisplay('哈哈～再嚟')).toContain('～');
  });

  it('drops TTS laugh leads (t771 — laughs are SFX only)', () => {
    const lead = prepareSpokenLead({ text: 'Haha!', pitch: 0.32, rate: 0.4 });
    expect(lead).toBeUndefined();
    const soft = prepareSpokenLead({ text: 'mm!', pitch: 0.32, rate: 0.4 });
    expect(soft?.text?.toLowerCase()).toMatch(/mm/);
    expect(soft && Math.abs(soft.pitch)).toBeLessThanOrEqual(0.08);
  });
});

describe('t773/t771 speech sanitize', () => {
  it('strips hashtags handles urls and chrome before TTS', () => {
    const raw = 'Breaking: cats win #CuteNews @DailyMeow https://example.com/x Read more | Google News';
    const out = sanitizeWebForSpeech(raw);
    expect(out.toLowerCase()).not.toMatch(/#cute/);
    expect(out).not.toMatch(/@Daily/);
    expect(out).not.toMatch(/https?:/);
    expect(out.toLowerCase()).not.toMatch(/read more/);
    expect(out.toLowerCase()).toMatch(/cats/);
  });

  it('stripLaughTokens removes hehe/haha for TTS', () => {
    expect(stripLaughTokens('hehe that was funny haha')).not.toMatch(/hehe|haha/i);
    expect(stripLaughTokens('哈哈 好棒')).not.toMatch(/哈哈/);
  });

  it('cleanForSpeech applies both', () => {
    const out = cleanForSpeech('hehe see https://x.test #tag @user Subscribe now');
    expect(out.toLowerCase()).not.toMatch(/hehe/);
    expect(out).not.toMatch(/https?:/);
    expect(out).not.toMatch(/#/);
    expect(out).not.toMatch(/@/);
  });
});

