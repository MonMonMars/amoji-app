// The Web Speech API re-reports the whole session's results on every
// `onresult`; only entries from `resultIndex` onward are new. Folding from 0
// re-emitted old finals as fresh utterances, so the chat re-sent the user's
// own message again and again (owner r298: "my message keeps looping").
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectSpeechUpdate, type SpeechResultLike } from '../lib/speech-finals';

const fin = (transcript: string): SpeechResultLike => ({ isFinal: true, 0: { transcript } });
const interim = (transcript: string): SpeechResultLike => ({ isFinal: false, 0: { transcript } });

const LISTEN = readFileSync(join(__dirname, '../lib/listen.ts'), 'utf8');

describe('speech finals — a final is announced once', () => {
  it('first final lands as the utterance', () => {
    const u = collectSpeechUpdate([fin('hello there')], 0);
    expect(u.finalText).toBe('hello there');
    expect(u.interim).toBe('');
  });

  it('a later interim for the NEXT sentence does not re-emit the old final', () => {
    // results still holds the previous final; only index 1 is new.
    const u = collectSpeechUpdate([fin('hello there'), interim('how are')], 1);
    expect(u.finalText).toBe('');
    expect(u.interim).toBe('how are');
  });

  it('a second final yields only the new sentence, never final1+final2', () => {
    const u = collectSpeechUpdate([fin('hello there'), fin('how are you')], 1);
    expect(u.finalText).toBe('how are you');
  });

  it('replaying the same results event is silent (no duplicate send)', () => {
    const results = [fin('loop me')];
    expect(collectSpeechUpdate(results, 0).finalText).toBe('loop me');
    // same event delivered again by the browser: resultIndex still 0, so the
    // caller would consider it new — the chat log guard is the second net.
    expect(collectSpeechUpdate(results, 1).finalText).toBe('');
  });

  it('falls back to the legacy fold when resultIndex is absent', () => {
    const u = collectSpeechUpdate([fin('legacy a'), fin('b')], undefined);
    expect(u.finalText).toBe('legacy ab');
  });

  it('handles an empty/absent result list', () => {
    expect(collectSpeechUpdate(null, 0)).toEqual({ finalText: '', interim: '' });
    expect(collectSpeechUpdate([], 3)).toEqual({ finalText: '', interim: '' });
  });
});

describe('listen.ts wiring', () => {
  it('folds results through collectSpeechUpdate(e.results, e.resultIndex)', () => {
    expect(LISTEN).toContain('collectSpeechUpdate(e.results, e.resultIndex)');
    expect(LISTEN).not.toMatch(/for \(let i = 0; i < e\.results\.length/);
  });
});
