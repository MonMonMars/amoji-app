// r2026-10-04.45: follow-the-trainer exercise lessons (yoga / tai chi /
// kung fu / warm-up) — detection, the step-by-step flow, language coverage
// and the continuity rule (every spoken line ends with a question).
import { describe, expect, it } from 'vitest';
import {
  detectExercise, startExercise, advanceExercise, exerciseFarewellLine,
  EXERCISE_KINDS, ROUTINES,
} from '../lib/exercises';
import { MOVE_DUR } from '../lib/moves';

const LANGS = ['yue', 'zh', 'ja', 'en'] as const;

describe('detectExercise', () => {
  it('detects each routine in every language', () => {
    expect(detectExercise('做瑜伽好唔好？')).toBe('yoga');
    expect(detectExercise("let's do yoga")).toBe('yoga');
    expect(detectExercise('ヨガしよう')).toBe('yoga');
    expect(detectExercise('打太極')).toBe('taichi');
    expect(detectExercise('tai chi please')).toBe('taichi');
    expect(detectExercise('教我功夫')).toBe('kungfu');
    expect(detectExercise('show me kung fu')).toBe('kungfu');
    expect(detectExercise('カンフー見せて')).toBe('kungfu');
    expect(detectExercise('熱身先')).toBe('warmup');
    expect(detectExercise('warm up')).toBe('warmup');
    expect(detectExercise('ストレッチしたい')).toBe('warmup');
  });

  it('the umbrella maps generic exercise talk to a gentle warm-up', () => {
    expect(detectExercise('follow me')).toBe('warmup');
    expect(detectExercise('一齊做運動')).toBe('warmup');
    expect(detectExercise('exercise time')).toBe('warmup');
  });

  it('leaves ordinary chat alone', () => {
    for (const text of ['你好', '唱首歌俾我', 'what should we eat', '今天天气怎么样', 'おはよう']) {
      expect(detectExercise(text), text).toBeUndefined();
    }
  });
});

describe('a lesson runs step by step, then closes', () => {
  it('yoga in Cantonese: intro → four cues → closer, then the state is null', () => {
    const t0 = startExercise('yoga', 'yue');
    expect(t0.state).toEqual({ kind: 'yoga', step: 0 });
    expect(t0.line).toContain('瑜伽');
    let turn = t0;
    const seen = [t0.line];
    for (let i = 0; i < 4; i++) {
      turn = advanceExercise(turn.state!, 'yue');
      seen.push(turn.line);
    }
    expect(seen).toHaveLength(5);
    expect(turn.state).toBeNull();
    expect(turn.line).toContain('聽日');
    // idempotent: an over-run cursor still lands on the closer, never crashes
    const again = advanceExercise({ kind: 'yoga', step: 99 }, 'yue');
    expect(again.state).toBeNull();
  });

  it('kung fu in English walks the whole form', () => {
    let turn = startExercise('kungfu', 'en');
    const lines = [turn.line];
    while (turn.state) {
      turn = advanceExercise(turn.state, 'en');
      lines.push(turn.line);
    }
    expect(lines.length).toBe(ROUTINES.kungfu.steps.length + 2);
    expect(lines.some((l) => l.includes('horse stance'))).toBe(true);
  });

  it('every start/step move exists in the movement library with a duration', () => {
    for (const kind of EXERCISE_KINDS) {
      const r = ROUTINES[kind];
      expect(MOVE_DUR[r.startMove], `${kind} startMove`).toBeGreaterThan(0);
      for (const s of r.steps) {
        expect(MOVE_DUR[s.move], `${kind} step move`).toBeGreaterThan(0);
      }
    }
  });

  it('every line exists in all four languages and ends with a question', () => {
    for (const kind of EXERCISE_KINDS) {
      const r = ROUTINES[kind];
      const lines: string[] = [];
      for (const l of LANGS) {
        lines.push(r.start[l], r.done[l], r.quit[l]);
        for (const s of r.steps) lines.push(s.cue[l]);
      }
      for (const line of lines) {
        const tail = line.trim();
        expect(tail.endsWith('？') || tail.endsWith('?'), line).toBe(true);
      }
    }
  });

  it('the quit line exists per routine per language', () => {
    for (const kind of EXERCISE_KINDS) {
      for (const l of LANGS) {
        expect(exerciseFarewellLine(kind, l).length).toBeGreaterThan(4);
      }
    }
  });
});
