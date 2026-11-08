import { describe, expect, it } from 'vitest';
import { pauseAfterClause, splitChunks } from '../lib/gtts';

describe('gTTS clause pauses', () => {
  it('keeps each punctuated clause as its own chunk', () => {
    expect(splitChunks('返工咁攰。想唔想傾吓？')).toEqual(['返工咁攰。', '想唔想傾吓？']);
    expect(splitChunks('你好，食咗飯未？')).toEqual(['你好，', '食咗飯未？']);
  });

  it('still hard-wraps a single oversize clause', () => {
    const long = `${'內容'.repeat(80)}。`;
    const chunks = splitChunks(long, 120);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(120);
  });

  it('gives a longer breath after sentence ends than after commas', () => {
    expect(pauseAfterClause('返工咁攰。')).toBeGreaterThanOrEqual(350);
    expect(pauseAfterClause('想唔想傾吓？')).toBeGreaterThanOrEqual(350);
    expect(pauseAfterClause('你好，')).toBeGreaterThanOrEqual(180);
    expect(pauseAfterClause('你好，')).toBeLessThan(pauseAfterClause('返工咁攰。'));
    expect(pauseAfterClause('no punctuation')).toBe(0);
  });
});
