import { describe, expect, it } from 'vitest';
import {
  DEMO_PHASE_BUTTONS,
  asDemoLang,
  demoPhaseLabel,
  demoPhasePrompt,
} from '../lib/demo-phase';
import { detectMove } from '../lib/moves';

describe('demo-phase buttons', () => {
  it('ships a short horizontal tutorial set', () => {
    expect(DEMO_PHASE_BUTTONS.length).toBeGreaterThanOrEqual(6);
    expect(DEMO_PHASE_BUTTONS.map((b) => b.id)).toEqual(
      expect.arrayContaining(['weather', 'news', 'story', 'music', 'dance', 'sing']),
    );
  });

  it('keeps chip labels tiny in every language', () => {
    for (const btn of DEMO_PHASE_BUTTONS) {
      for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
        expect(btn.label[lang].length).toBeLessThanOrEqual(12);
        expect(btn.prompt[lang].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('dance / sing / yoga prompts hit the move detector', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      expect(detectMove(demoPhasePrompt('dance', lang))).toBe('dance');
      expect(detectMove(demoPhasePrompt('sing', lang))).toBe('sing');
      expect(detectMove(demoPhasePrompt('yoga', lang))).toBe('yoga');
    }
  });

  it('music prompts match the play-music intercept shape', () => {
    const re = /\b(play (?:some )?music|put on (?:some )?music)\b|播音樂|播音乐|放音樂|放音乐|音楽をかけ/;
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      expect(re.test(demoPhasePrompt('music', lang))).toBe(true);
    }
  });

  it('helpers resolve language fallbacks', () => {
    expect(asDemoLang('yue')).toBe('yue');
    expect(asDemoLang('nope')).toBe('yue');
    expect(demoPhaseLabel('weather', 'en')).toBe('Weather');
    expect(demoPhasePrompt('weather', 'en')).toMatch(/weather/i);
  });
});
