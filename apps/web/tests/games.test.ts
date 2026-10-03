// r2026-10-04.42: mini-game engine + together-activity triggers
// r2026-10-04.43: word chain (shiritori), omikuji, which-hand, high-low
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

  it('detects the r.43 games', () => {
    expect(detectGame('玩接龍')).toBe('wordchain');
    expect(detectGame('しりとりしよう')).toBe('wordchain');
    expect(detectGame('抽籤')).toBe('omikuji');
    expect(detectGame('tell my fortune')).toBe('omikuji');
    expect(detectGame('估下我邊隻手')).toBe('hands');
    expect(detectGame('which hand')).toBe('hands');
    expect(detectGame('玩大細牌')).toBe('hilo');
    expect(detectGame('higher or lower')).toBe('hilo');
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

describe('word chain (shiritori / 接龍)', () => {
  it('ja: starts with さくら and answers a valid follow', () => {
    const { line, state } = startGame('wordchain', 'ja', () => 0);
    expect(line).toContain('さくら');
    expect(state.lastWord).toBe('さくら');
    const res = playTurn(state, 'らっこ', 'ja', () => 0); // starts with ら, ends こ
    expect(res.ended).toBe(false);
    expect(res.state.rounds).toBe(1);
    expect(res.line).toContain('こ');
  });

  it('ja: a word ending in ん loses instantly', () => {
    const { state } = startGame('wordchain', 'ja', () => 0);
    const res = playTurn(state, 'らん', 'ja', () => 0); // starts ら ✓, ends ん ✗
    expect(res.ended).toBe(true);
    expect(res.state.rounds).toBe(0);
  });

  it('user wins when she has no follow-up word', () => {
    const { state } = startGame('wordchain', 'ja', () => 0);
    const res = playTurn(state, 'らっぱ', 'ja', () => 0); // ends ぱ — not in her bank
    expect(res.ended).toBe(true);
    expect(res.move).toBe('jump');
  });

  it('mismatch teases and counts a fail', () => {
    const { state } = startGame('wordchain', 'yue', () => 0);
    const res = playTurn(state, '香蕉', 'yue', () => 0); // must start with 果
    expect(res.ended).toBe(false);
    expect(res.state.rounds).toBe(0);
    expect(res.state.fails).toBe(1);
    expect(res.line).toContain('果');
  });

  it('en: chain by last letter', () => {
    const { state } = startGame('wordchain', 'en', () => 0);
    expect(state.lastWord).toBe('star'); // requires "r"
    const res = playTurn(state, 'rabbit', 'en', () => 0);
    expect(res.ended).toBe(false);
    expect(res.line.toLowerCase()).toContain('tiger'); // her pick, starts with t
  });
});

describe('omikuji fortune', () => {
  it('a zero roll draws 大吉 and the game is done', () => {
    const { line, state } = startGame('omikuji', 'yue', () => 0);
    expect(line).toContain('大吉');
    expect(state.target).toBe(0);
    expect(state.rounds).toBeGreaterThanOrEqual(state.maxRounds);
  });

  it('a follow-up message explains one draw per day', () => {
    const { state } = startGame('omikuji', 'yue', () => 0.99);
    const res = playTurn(state, '再抽', 'yue', () => 0.5);
    expect(res.ended).toBe(true);
  });
});

describe('which hand', () => {
  it('guessing middle against a 0.99 roll wins the round', () => {
    const { state } = startGame('hands', 'yue', () => 0.5);
    const res = playTurn(state, '中間', 'yue', () => 0.99); // roll → middle (index 2)
    expect(res.ended).toBe(false);
    expect(res.state.userScore).toBe(1);
    expect(res.line).toContain('中');
  });

  it('unknown guess asks again', () => {
    const { state } = startGame('hands', 'en', () => 0.5);
    const res = playTurn(state, 'I dunno', 'en', () => 0.5);
    expect(res.state.rounds).toBe(0);
    expect(res.ended).toBe(false);
  });
});

describe('high-low', () => {
  it('correct call extends the streak and turns the card', () => {
    const { state } = startGame('hilo', 'yue', () => 0); // card = 1
    expect(state.card).toBe(1);
    const res = playTurn(state, '大', 'yue', () => 0.99); // next = 13
    expect(res.ended).toBe(false);
    expect(res.state.userScore).toBe(1);
    expect(res.state.card).toBe(13);
  });

  it('a matching card is a push — no streak change', () => {
    const { state } = startGame('hilo', 'yue', () => 0); // card = 1
    const res = playTurn(state, '大', 'yue', () => 0); // next = 1 again
    expect(res.ended).toBe(false);
    expect(res.state.userScore).toBe(0);
  });

  it('a wrong call ends the run and celebrates the streak', () => {
    const { state } = startGame('hilo', 'yue', () => 0); // card = 1
    const res = playTurn(state, '細', 'yue', () => 0.99); // next 13 > 1 → wrong
    expect(res.ended).toBe(true);
    expect(res.state.botScore).toBe(1);
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
