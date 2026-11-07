import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { t } from '../lib/prefs';

const bars = readFileSync(join(__dirname, '../components/SelectTopBars.tsx'), 'utf8');

describe('SelectTopBars chat/story chips are localized', () => {
  it('renders both chips through t(lang, ...) instead of hardcoded English', () => {
    expect(bars).toContain("t(lang, 'modeChat')");
    expect(bars).toContain("t(lang, 'modeStory')");
  });

  it('drops the hardcoded uppercase CHAT / STORY text nodes', () => {
    // The chips used to ship the literal words, so yue/zh/ja users saw English
    // while every other label on the board was translated.
    expect(bars).not.toMatch(/>\s*CHAT\s*</);
    expect(bars).not.toMatch(/>\s*STORY\s*</);
  });

  it('keeps the all-caps chip look via CSS, so English is visually unchanged', () => {
    expect(bars).toMatch(/uppercase[^'"`]*text-white/);
  });

  it('has a translation in every shipped language', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      expect(t(lang, 'modeChat').length).toBeGreaterThan(0);
      expect(t(lang, 'modeStory').length).toBeGreaterThan(0);
    }
    expect(t('en', 'modeChat')).toBe('Chat');
    expect(t('en', 'modeStory')).toBe('Story');
    expect(t('yue', 'modeChat')).toBe('傾偈');
    expect(t('zh', 'modeChat')).toBe('聊天');
    expect(t('ja', 'modeChat')).toBe('チャット');
  });
});
