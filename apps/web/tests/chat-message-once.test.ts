// Owner 2026-11-25 (r298): "my message keeps looping on its own, it repeats
// and repeats on its own." The user bubble was appended again for the SAME
// turn. These tests pin the two invariants that make the loop impossible:
//   1. one user message → exactly ONE bubble, no matter how many times the
//      recognizer / queue re-delivers it;
//   2. every appended turn carries a stable, unique id used as the React key.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  appendUserTurn,
  hasPendingUserTurn,
  newMessageId,
  type ChatTurn,
} from '../lib/chat-turn-log';

const PANEL = readFileSync(join(__dirname, '../components/ChatPanel.tsx'), 'utf8');

const users = (msgs: readonly ChatTurn[]) => msgs.filter((m) => m.role === 'user');
const assistant = (content: string, extra?: Partial<ChatTurn>): ChatTurn => ({
  role: 'assistant',
  content,
  ...extra,
});

describe('chat log — one bubble per user message', () => {
  it('drops 25 re-deliveries of the same user turn (literal count: 1)', () => {
    const text = '你今日點呀？';
    let log: ChatTurn[] = [];
    for (let tick = 0; tick < 25; tick++) {
      log = appendUserTurn(log, text, { now: 1_700_000_000_000 + tick });
    }
    expect(users(log).length).toBe(1);
    expect(log.length).toBe(1);
    expect(log[0]!.content).toBe(text);
    expect(hasPendingUserTurn(log, text)).toBe(true);
  });

  it('returns the same array reference for a dropped repeat (no re-render churn)', () => {
    const first = appendUserTurn([], 'hello');
    const second = appendUserTurn(first, 'hello');
    expect(second).toBe(first);
  });

  it('a repeat AFTER an answer is a genuinely new turn (literal count: 2)', () => {
    let log: ChatTurn[] = [];
    log = appendUserTurn(log, 'repeat me');
    log = [...log, assistant('答咗你喇')];
    expect(hasPendingUserTurn(log, 'repeat me')).toBe(false);
    log = appendUserTurn(log, 'repeat me');
    expect(users(log).length).toBe(2);
  });

  it('the "…" wait placeholder does not count as an answer', () => {
    let log: ChatTurn[] = [];
    log = appendUserTurn(log, '等我答');
    log = [...log, assistant('…')];
    log = appendUserTurn(log, '等我答');
    expect(users(log).length).toBe(1);
  });

  it('a different user text still appends while an answer is pending', () => {
    let log: ChatTurn[] = [];
    log = appendUserTurn(log, 'first');
    log = appendUserTurn(log, 'second');
    expect(users(log).length).toBe(2);
  });

  it('empty/whitespace text never appends', () => {
    const log = appendUserTurn([], '   ');
    expect(log.length).toBe(0);
  });
});

describe('chat log — stable unique ids', () => {
  it('100 appends get 100 distinct ids', () => {
    let log: ChatTurn[] = [];
    for (let i = 0; i < 100; i++) log = appendUserTurn(log, `line ${i}`, { now: 1 });
    const ids = log.map((m) => m.id);
    expect(ids.length).toBe(100);
    expect(new Set(ids).size).toBe(100);
  });

  it('ids are stable across re-deliveries (same bubble, same key)', () => {
    const once = appendUserTurn([], 'stable');
    const again = appendUserTurn(once, 'stable');
    expect(again[0]!.id).toBe(once[0]!.id);
  });

  it('two ids minted in the same millisecond still differ', () => {
    expect(newMessageId('user', 42)).not.toBe(newMessageId('user', 42));
  });
});

describe('ChatPanel wiring', () => {
  it('renders each row with its stable id as the React key', () => {
    expect(PANEL).toContain('key={m.id ?? `row-${i}`}');
  });

  it('send() drops a repeat of a still-unanswered user turn before doing any work', () => {
    expect(PANEL).toContain('hasPendingUserTurn(historyRef.current, text)');
    const sendStart = PANEL.indexOf('const send = async');
    const guard = PANEL.indexOf('hasPendingUserTurn(historyRef.current, text)', sendStart);
    const busy = PANEL.indexOf('setBusy(true)', sendStart);
    expect(guard).toBeGreaterThan(sendStart);
    expect(guard).toBeLessThan(busy);
  });

  it('appends the user turn through the guarded helper (single path)', () => {
    expect(PANEL).toContain('appendUserTurn(historyRef.current, text, {');
    // every inline user append carries an id
    expect(PANEL).not.toMatch(/setHistory\(\(h\) => \[\.\.\.h, \{ role: 'user', content:/);
  });

  it('hydrated rows get a stable id instead of an index key', () => {
    expect(PANEL).toContain('loadHistory().map((m, i) => ({ ...m, id: `stored-${i}` }))');
  });
});
