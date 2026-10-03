// r2026-10-04.42: mini-game engine + together-activity triggers
import { describe, expect, it } from 'vitest';
import { detectGame, playTurn, startGame } from '../lib/games';
import { DUET_TRIGGER, MEAL_TOGETHER_TRIGGER, QUIT_RE } from '../lib/activities';
import { pickDuet } from '../lib/songs';

describe('detectGame', () => {
  it('detects game requests in all languages', () => {
    expect(detectGame('同我玩猜拳')).toBe('rps');
    expect(detectGame('guess the number')).toBe('guess');
    expect(detectGame('擲骰')).toBe('dice');
  });

  it('detects stop requests', () => {
    expect(detectGame('唔玩')).toBe('stop');
  });

  it('ignores plain sing requests', () => {
    expect(detectGame('唱首歌俾我')).toBeUndefined();
  });
});

describe('rock-paper-scissors', () => {
  it('user rock beats bot scissors', () => {
    const { state } = startGame('rps', 'yue', () => 0.99); // bot picks scissors (index 2)
    const res = playTurn(state, '石頭', 'yue', () => 0.99);
    expect(res.state.userScore).toBe(1);
    expect(res.state.botScore).toBe(0);
    expect(res.ended).toBe(false);
    expect(res.move).toBe('jump');
  });

  it('best-of-five ends after five drawn rounds', () => {
    let { state } = startGame('rps', 'yue', () => 0); // bot always rock
    let res = playTurn(state, '石頭', 'yue', () => 0); // both rock
    for (let i = 0; i < 4; i++) {
      res = playTurn(res.state, '石頭', 'yue', () => 0);
    }
    expect(res.ended).toBe(true);
    expect(res.state.rounds).toBe(5);
    expect(res.state.userScore).toBe(0);
    expect(res.state.botScore).toBe(0);
  });

  it('asks again when the move is not understood', () => {
    const { state } = startGame('rps', 'yue', () => 0.5);
    const res = playTurn(state, '我唔知講咩', 'yue', () => 0.5);
    expect(res.ended).toBe(false);
    expect(res.state.rounds).toBe(0);
  });
});

describe('guess-the-number', () => {
  it('narrows the window and ends on a hit', () => {
    const { state } = startGame('guess', 'yue', () => 0); // target 1
    expect(state.target).toBe(1);
    const res = playTurn(state, '10', 'yue');
    expect(res.ended).toBe(false);
    expect(res.state.hi).toBe(9);
    const hit = playTurn(res.state, '1', 'yue');
    expect(hit.ended).toBe(true);
    expect(hit.move).toBe('jump');
  });
});

describe('together activities', () => {
  it('duet trigger fires for together-singing only', () => {
    expect(DUET_TRIGGER.test('一齊唱歌')).toBe(true);
    expect(DUET_TRIGGER.test('sing with me')).toBe(true);
    expect(DUET_TRIGGER.test('唱首歌俾我')).toBe(false);
  });

  it('meal-together trigger and quit regex', () => {
    expect(MEAL_TOGETHER_TRIGGER.test('同我一齊食飯')).toBe(true);
    expect(QUIT_RE.test('唔玩')).toBe(true);
  });

  it('duet bank has four lines ending in the together-finale', () => {
    const duet = pickDuet('yue', 0);
    expect(duet).toHaveLength(4);
  });
});
