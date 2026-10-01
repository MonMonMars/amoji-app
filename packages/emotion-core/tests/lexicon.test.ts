import { describe, expect, it } from 'vitest';
import { analyzeText } from '../src/lexicon';

describe('lexicon', () => {
  it('detects English joy', () => {
    const r = analyzeText('I am so happy and excited!');
    expect(r.joy).toBeGreaterThan(0.5);
    expect(r.excitement).toBeGreaterThan(0.3);
  });
  it('detects Chinese sadness', () => {
    const r = analyzeText('我今日好唔開心，覺得好難過');
    expect(r.sadness).toBeGreaterThan(0.4);
  });
  it('detects Chinese anger and fear', () => {
    expect(analyzeText('我好嬲！').anger).toBeGreaterThan(0.5);
    expect(analyzeText('好可怕').fear).toBeGreaterThan(0.5);
  });
  it('detects love in both languages', () => {
    expect(analyzeText('我愛你').love).toBeGreaterThan(0.5);
    expect(analyzeText('I love you').love).toBeGreaterThan(0.5);
  });
  it('returns empty object on no match and on empty string', () => {
    expect(analyzeText('The weather is 72 degrees')).toEqual({});
    expect(analyzeText('')).toEqual({});
  });
  it('weights are clamped to (0,1]', () => {
    const r = analyzeText('happy happy happy love love 我愛你 我愛你');
    for (const v of Object.values(r)) { expect(v).toBeGreaterThan(0); expect(v).toBeLessThanOrEqual(1); }
  });
});
