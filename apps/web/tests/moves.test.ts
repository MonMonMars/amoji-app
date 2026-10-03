import { describe, it, expect } from 'vitest';
import {
  MOVE_DUR, MOVE_TRIGGERS, detectMove, moveDeltas, moveEnvelope, type MoveKind,
} from '../lib/moves';

const KINDS: MoveKind[] = [
  'sing', 'jump', 'kungfu', 'taichi',
  'violin', 'piano',
  'dine', 'eat',
  'jog',
];

describe('dialogue-triggered movement library (r.39 + r.41)', () => {
  it('every move has a sane duration and a trigger regex', () => {
    for (const k of KINDS) {
      expect(MOVE_DUR[k]).toBeGreaterThanOrEqual(2000);
      expect(MOVE_DUR[k]).toBeLessThanOrEqual(9000);
      expect(MOVE_TRIGGERS[k]).toBeInstanceOf(RegExp);
    }
  });

  it('detects each move from dialogue in every language', () => {
    const cases: Array<[string, MoveKind]> = [
      ['sing me a song~', 'sing'],
      ['唱首歌俾我好唔好？', 'sing'],
      ['一齊唱啦！', 'sing'],
      ['歌を歌って！', 'sing'],
      ['jump!', 'jump'],
      ['跳一下睇睇！', 'jump'],
      ['跳舞呀！', 'jump'],
      ['ジャンプして！', 'jump'],
      ['show me some kung fu', 'kungfu'],
      ['識唔識功夫㗎？', 'kungfu'],
      ['武打好有型！', 'kungfu'],
      ['カンフー見せて！', 'kungfu'],
      ['do some tai chi', 'taichi'],
      ['打太極好唔好？', 'taichi'],
      ['拉小提琴俾我聽~', 'violin'],
      ['play the violin for me', 'violin'],
      ['バイオリンを弾いて！', 'violin'],
      ['violin 同鋼琴邊個難啲？', 'violin'],
      ['play the piano for me', 'piano'],
      ['彈琴俾我聽~', 'piano'],
      ['鋼琴好難學', 'piano'],
      ['ピアノ弾いて！', 'piano'],
      ['fine dining tonight', 'dine'],
      ['燭光晚餐好浪漫～', 'dine'],
      ['一齊食大餐！', 'dine'],
      ['dinner date with me', 'dine'],
      ['食雪糕呀！', 'eat'],
      ['一齊食飯好唔好？', 'eat'],
      ['請你食嘢～', 'eat'],
      ['eat ice cream together', 'eat'],
      ['go for a run together', 'jog'],
      ['一齊跑步！', 'jog'],
      ['ジョギング行こう！', 'jog'],
    ];
    for (const [text, kind] of cases) {
      expect(detectMove(text), `${text} → ${kind}`).toBe(kind);
    }
  });

  it('leaves ordinary conversation alone', () => {
    for (const text of [
      'hello', 'how are you feeling', '今天天气怎么样', '我愛你', 'おはよう',
      'what should we eat', 'yes please', 'tell me a story',
    ]) {
      expect(detectMove(text), text).toBeUndefined();
    }
  });

  it('move envelopes fade in and out, full strength mid-move', () => {
    expect(moveEnvelope(0)).toBe(0);
    expect(moveEnvelope(1)).toBe(0);
    expect(moveEnvelope(-1)).toBe(0);
    expect(moveEnvelope(2)).toBe(0);
    expect(moveEnvelope(0.5)).toBe(1);
    expect(moveEnvelope(0.06)).toBeCloseTo(0.5, 1);
  });

  it('choreography stays bounded and actually moves something, for every move', () => {
    for (const k of KINDS) {
      let peak = 0;
      for (let i = 0; i <= 40; i++) {
        const d = moveDeltas(k, i / 40);
        for (const v of Object.values(d)) {
          expect(Number.isFinite(v), `${k}@${i / 40}`).toBe(true);
          peak = Math.max(peak, Math.abs(v));
        }
      }
      expect(peak, `${k} should move something`).toBeGreaterThan(0.05);
      expect(peak, `${k} stays gentle`).toBeLessThanOrEqual(1.0);
    }
  });
});
