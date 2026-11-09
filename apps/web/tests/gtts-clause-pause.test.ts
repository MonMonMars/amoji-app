import { describe, expect, it } from 'vitest';
import { pauseAfterClause, splitChunks, splitClauses, ssmlBreakAfterClause } from '../lib/gtts';

describe('gTTS clause pauses', () => {
  it('keeps each punctuated clause as its own chunk', () => {
    expect(splitChunks('返工咁攰。想唔想傾吓？')).toEqual(['返工咁攰。', '想唔想傾吓？']);
    expect(splitChunks('你好，食咗飯未？')).toEqual(['你好，', '食咗飯未？']);
    expect(splitClauses('First: details here. Still going?')).toEqual([
      'First:',
      'details here.',
      'Still going?',
    ]);
  });

  it('marks paragraph breaks for yue/zh/en/ja blank lines', () => {
    expect(splitClauses('返工咁攰。\n\n想唔想傾吓？')).toEqual(['返工咁攰。\n\n', '想唔想傾吓？']);
    expect(splitClauses('今日好累。\n\n先休息一下。')).toEqual(['今日好累。\n\n', '先休息一下。']);
    expect(splitClauses('First beat.\n\nSecond beat.')).toEqual(['First beat.\n\n', 'Second beat.']);
    expect(splitClauses('会えたね。\n\n元気だった？')).toEqual(['会えたね。\n\n', '元気だった？']);
  });

  it('still hard-wraps a single oversize clause', () => {
    const long = `${'內容'.repeat(80)}。`;
    const chunks = splitChunks(long, 120);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(120);
  });

  it('gives a longer breath after sentence ends than after commas', () => {
    expect(pauseAfterClause('返工咁攰。')).toBeGreaterThanOrEqual(450);
    expect(pauseAfterClause('返工咁攰。')).toBeLessThanOrEqual(500);
    expect(pauseAfterClause('想唔想傾吓？')).toBeGreaterThanOrEqual(450);
    expect(pauseAfterClause('你好，')).toBeGreaterThanOrEqual(250);
    expect(pauseAfterClause('你好，')).toBeLessThanOrEqual(350);
    expect(pauseAfterClause('你好，')).toBeLessThan(pauseAfterClause('返工咁攰。'));
    expect(pauseAfterClause('no punctuation')).toBe(0);
  });

  it('pauses longer after paragraph breaks than after sentence ends', () => {
    const sentence = pauseAfterClause('返工咁攰。');
    const paragraph = pauseAfterClause('返工咁攰。\n\n');
    expect(paragraph).toBeGreaterThanOrEqual(600);
    expect(paragraph).toBeLessThanOrEqual(900);
    expect(paragraph).toBeGreaterThan(sentence);
    expect(ssmlBreakAfterClause('First beat.\n\n')).toBe(`<break time='${paragraph}ms'/>`);
    expect(ssmlBreakAfterClause('First beat.', true)).toBe('');
  });
});
