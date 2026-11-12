import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEMO_PHASE_BUTTONS,
  asDemoLang,
  demoPhaseLabel,
  demoPhasePrimaryPrompt,
  demoPhasePrompt,
  demoPhasePromptCount,
} from '../lib/demo-phase';
import { detectMove } from '../lib/moves';
import { detectExercise } from '../lib/exercises';
import { DUET_TRIGGER, MEAL_TOGETHER_TRIGGER } from '../lib/activities';
import { detectActionGame } from '../lib/minigames';
import { wantsLongCompanionReply } from '../lib/topic-suggestions';
import { detectMusicStyle } from '../lib/music-catalog';
import { detectWeatherFocus, planTools } from '../lib/live-tools';
import { isTopicalContentTurn } from '../lib/skill-offer-guard';

const PANEL = fs.readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../components/ChatPanel.tsx'),
  'utf8',
);

describe('demo-phase buttons', () => {
  it('ships a short horizontal tutorial set', () => {
    expect(DEMO_PHASE_BUTTONS.length).toBeGreaterThanOrEqual(14);
    expect(DEMO_PHASE_BUTTONS.map((b) => b.id)).toEqual(
      expect.arrayContaining([
        'weather',
        'news',
        'aiNews',
        'personalTalk',
        'secretTalk',
        'joke',
        'poem',
        'tip',
        'story',
        'music',
        'dance',
        'sing',
        'kungfu',
        'taichi',
        'stretch',
        'jog',
        'eat',
        'piano',
        'violin',
        'duet',
        'funScience',
        'tag',
      ]),
    );
  });

  it('AI news / personal / secret chips plan and mute like content turns', () => {
    const ai = demoPhasePrompt('aiNews', 'en', 0);
    expect(planTools(ai).news).toBe(true);
    expect(planTools(ai).newsQuery?.toLowerCase()).toMatch(/artificial intelligence|ai/);
    expect(isTopicalContentTurn(ai)).toBe(true);
    expect(isTopicalContentTurn(demoPhasePrompt('personalTalk', 'en'))).toBe(true);
    expect(isTopicalContentTurn(demoPhasePrompt('secretTalk', 'en'))).toBe(true);
    expect(isTopicalContentTurn(demoPhasePrompt('joke', 'en'))).toBe(true);
    expect(demoPhasePrompt('aiNews', 'en', 0)).not.toBe(demoPhasePrompt('aiNews', 'en', 1));
  });

  it('keeps chip labels tiny in every language', () => {
    for (const btn of DEMO_PHASE_BUTTONS) {
      for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
        expect(btn.label[lang].length).toBeLessThanOrEqual(12);
        expect(btn.prompts[lang].length).toBeGreaterThanOrEqual(2);
        for (const line of btn.prompts[lang]) {
          expect(line.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('rotates prompt facets on repeated taps of the same chip', () => {
    const a = demoPhasePrompt('weather', 'en', 0);
    const b = demoPhasePrompt('weather', 'en', 1);
    const c = demoPhasePrompt('weather', 'en', 2);
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(demoPhasePrompt('weather', 'en', demoPhasePromptCount('weather', 'en'))).toBe(a);
    expect(detectWeatherFocus(a)).toBe('now');
    expect(detectWeatherFocus(b)).toBe('temp');
    expect(detectWeatherFocus(c)).toBe('forecast');
    expect(detectWeatherFocus(demoPhasePrompt('weather', 'en', 3))).toBe('wind');
    expect(planTools(c).weather).toBe(true);
    expect(planTools(demoPhasePrompt('weather', 'en', 3)).weather).toBe(true);

    const m0 = demoPhasePrompt('music', 'en', 0);
    const m1 = demoPhasePrompt('music', 'en', 1);
    expect(m0).not.toBe(m1);
    expect(detectMusicStyle(m1)).toBe('jazz');
  });

  it('dance / sing / yoga prompts hit the move detector', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      expect(detectMove(demoPhasePrompt('dance', lang))).toBe('dance');
      expect(detectMove(demoPhasePrompt('sing', lang))).toBe('sing');
      expect(detectMove(demoPhasePrompt('yoga', lang))).toBe('yoga');
    }
  });

  it('new move chips hit their detectors', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      expect(detectExercise(demoPhasePrompt('kungfu', lang))).toBe('kungfu');
      // Tai chi demo plays the library move with general encouragement
      // (ChatPanel one-shot path) — detector still tags the prompt.
      expect(detectExercise(demoPhasePrompt('taichi', lang))).toBe('taichi');
      expect(detectMove(demoPhasePrompt('taichi', lang))).toBe('taichi');
      expect(detectExercise(demoPhasePrompt('stretch', lang))).toBe('warmup');
      expect(detectMove(demoPhasePrompt('jog', lang))).toBe('jog');
      expect(detectMove(demoPhasePrompt('piano', lang))).toBe('piano');
      expect(detectMove(demoPhasePrompt('violin', lang))).toBe('violin');
    }
  });

  it('ChatPanel wires tai chi as a one-shot library move, not cue sync', () => {
    expect(PANEL).toContain("x === 'taichi'");
    expect(PANEL).toContain("triggerMove('taichi')");
  });

  it('together chips hit duet / meal / tag intercepts', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      expect(DUET_TRIGGER.test(demoPhasePrompt('duet', lang))).toBe(true);
      expect(MEAL_TOGETHER_TRIGGER.test(demoPhasePrompt('eat', lang))).toBe(true);
      expect(detectActionGame(demoPhasePrompt('tag', lang))).toBe('tag');
    }
  });

  it('fun science prompts ask for a longer teach turn', () => {
    for (const lang of ['en', 'yue', 'zh', 'ja'] as const) {
      expect(wantsLongCompanionReply(demoPhasePrompt('funScience', lang))).toBe(true);
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
    expect(demoPhasePrimaryPrompt(DEMO_PHASE_BUTTONS[0]!, 'en')).toMatch(/weather/i);
  });
});
