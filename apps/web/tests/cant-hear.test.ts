import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cantHearReply, isCantHearComplaint } from '../lib/cant-hear';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('cant-hear intercept', () => {
  it('detects Cantonese / English / Japanese no-sound complaints', () => {
    expect(isCantHearComplaint('聽唔到你講嘅故事嘅')).toBe(true);
    expect(isCantHearComplaint('听不到声音')).toBe(true);
    expect(isCantHearComplaint("I can't hear you")).toBe(true);
    expect(isCantHearComplaint('聞こえない')).toBe(true);
    expect(isCantHearComplaint('今日天氣點呀？')).toBe(false);
    expect(isCantHearComplaint('講個故事')).toBe(false);
  });

  it('replies with a short audio tip, not a story beat', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      const line = cantHearReply(lang);
      expect(line.length).toBeGreaterThan(10);
      expect(line).not.toMatch(/軍艦|极光|極光|warship|aurora/i);
      expect(line.toLowerCase()).toMatch(/volume|silent|音量|靜音|静音|サイレント|hear|聽|听|聞こえ/);
    }
  });

  it('ChatPanel intercepts before the LLM', () => {
    const panel = fs.readFileSync(path.join(ROOT, 'components/ChatPanel.tsx'), 'utf8');
    expect(panel).toContain('isCantHearComplaint');
    expect(panel).toContain('cantHearReply');
  });
});
