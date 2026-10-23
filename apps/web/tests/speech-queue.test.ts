import { describe, expect, it } from 'vitest';
import { LineQueue, speechRemainder } from '../lib/speech-queue';

describe('LineQueue', () => {
  it('plays one line at a time and keeps the rest', () => {
    const q = new LineQueue<string>();
    q.enqueue('one');
    q.enqueue('two');
    expect(q.pending()).toBe(true);
    const first = q.begin();
    expect(first?.item).toBe('one');
    expect(q.begin()).toBeNull();
    expect(q.includes((s) => s === 'two')).toBe(true);
    q.finished(first!.epoch);
    const second = q.begin();
    expect(second?.item).toBe('two');
    q.finished(second!.epoch);
    expect(q.pending()).toBe(false);
    expect(q.begin()).toBeNull();
  });

  it('drops the queue on interrupt and ignores a stale finish', () => {
    const q = new LineQueue<string>();
    q.enqueue('one');
    q.enqueue('two');
    const live = q.begin();
    const epoch = q.interrupt();
    expect(epoch).not.toBe(live!.epoch);
    expect(q.pending()).toBe(false);
    expect(q.includes((s) => s === 'two')).toBe(false);
    q.finished(live!.epoch);
    expect(q.begin()).toBeNull();
    q.enqueue('three');
    expect(q.begin()?.item).toBe('three');
  });
});

describe('speechRemainder', () => {
  it('returns only the text after a leading first sentence', () => {
    expect(speechRemainder('Hello there. How are you?', 'Hello there.')).toBe('How are you?');
    expect(speechRemainder('Hello there.', 'Hello there.')).toBe('');
    expect(speechRemainder('A different reply.', 'Hello there.')).toBe('A different reply.');
    expect(speechRemainder('  Hello.  ', '')).toBe('Hello.');
  });
});
