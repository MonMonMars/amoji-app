import { describe, expect, it } from 'vitest';
import { cantHearReply, isCantHearComplaint } from '../lib/cant-hear';

describe('cant-hear intercept', () => {
  it('detects common cant-hear / no-sound complaints', () => {
    expect(isCantHearComplaint('聽唔到')).toBe(true);
    expect(isCantHearComplaint('听不到你')).toBe(true);
    expect(isCantHearComplaint("I can't hear you")).toBe(true);
    expect(isCantHearComplaint('no sound')).toBe(true);
    expect(isCantHearComplaint('聞こえない')).toBe(true);
    expect(isCantHearComplaint('今日好攰')).toBe(false);
    expect(isCantHearComplaint('')).toBe(false);
  });

  it('returns a grounded audio tip, never a new story beat', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      const tip = cantHearReply(lang);
      expect(tip.length).toBeGreaterThan(8);
      expect(tip).not.toMatch(/軍艦|極光|story\s+continues|once upon/i);
      expect(tip.toLowerCase()).toMatch(/volume|音量|サイレント|silent|hear|聽|听|聞こえ/);
    }
  });
});
