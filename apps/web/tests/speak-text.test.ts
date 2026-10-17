import { describe, expect, it } from 'vitest';
import {
  clampBrowserProsody, clampLaughDelivery, clampLeadProsody, cleanForDisplay, cleanForSpeech,
  joinSpeechLead, prepareSpokenLead, stripVoicedGlyphs,
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
    expect(spoken).toBe('Haha you got my head Email me x 1 for 5 10');
    expect(spoken).not.toMatch(/\b(comma|period|at|hash|dollar|percent|ampersand|and)\b/i);
  });

  it('keeps contractions and decimal points', () => {
    expect(stripVoicedGlyphs("don't stop. pi is 3.14.")).toBe("don't stop pi is 3.14");
  });

  it('cleans a poke laugh without substituting words for the bang', () => {
    expect(cleanForSpeech('Haha!')).toBe('Haha!');
    expect(stripVoicedGlyphs('哈哈！')).toBe('哈哈！');
    expect(stripVoicedGlyphs('呵呵……')).toBe('呵呵');
  });

  it('turns tildes and dashes into pauses instead of spoken marks', () => {
    expect(cleanForSpeech('哈哈～身中招啦')).toBe('哈哈 身中招啦');
    expect(cleanForSpeech('哈哈～身中招啦')).not.toMatch(/tilde|ellipsis/i);
    expect(cleanForSpeech('wait… still here')).toBe('wait… still here');
    expect(cleanForSpeech('laughing — still playing?')).toBe('laughing，still playing?');
    expect(cleanForSpeech('laughing — still playing?')).not.toContain('—');
    expect(stripVoicedGlyphs(cleanForSpeech('laughing — still playing?'))).toBe('laughing still playing?');
    expect(cleanForDisplay('哈哈～再嚟')).toContain('～');
  });

  it('keeps a poke laugh inside a normal speaking range', () => {
    const lead = prepareSpokenLead({ text: 'Haha!', pitch: 0.32, rate: 0.18 });
    expect(lead?.text).toBe('Haha');
    expect(lead && Math.abs(lead.pitch)).toBeLessThanOrEqual(0.08);
    expect(lead && Math.abs(lead.rate)).toBeLessThanOrEqual(0.06);
    expect(joinSpeechLead('Haha!', 'you got my head', 'en')).toBe('Haha, you got my head');
    expect(joinSpeechLead('哈哈', '你戳到我', 'yue')).toContain('，');
    expect(joinSpeechLead('哈哈', '你戳到我', 'yue')).not.toMatch(/[!！]/);
    const browser = clampBrowserProsody(1.08 * 1.34, 1.02 * 1.14);
    expect(browser.pitch).toBeLessThanOrEqual(1.18);
    expect(browser.rate).toBeLessThanOrEqual(1.12);
    const laugh = clampLaughDelivery(browser.pitch * (1 + 0.18), browser.rate * (1 + 0.08));
    expect(laugh.pitch).toBeLessThanOrEqual(1.08);
    expect(laugh.rate).toBeLessThanOrEqual(1.04);
    expect(clampLeadProsody(0.5, 0.4).pitch).toBe(0.08);
  });
});
