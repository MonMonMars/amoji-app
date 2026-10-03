import { describe, expect, it } from 'vitest';
import { WARMUP_BANKS, WARMUP_GAP_MS, WARMUP_MAX_LINES, pickWarmupLine } from '../lib/warmup';

describe('warm-up dialogue banks', () => {
  it('ships at least six warm lines per language', () => {
    for (const lang of ['yue', 'zh', 'ja', 'en']) {
      expect(WARMUP_BANKS[lang]!.length).toBeGreaterThanOrEqual(6);
    }
  });
  it('every line ends with an open hook (… or a question)', () => {
    for (const bank of Object.values(WARMUP_BANKS)) {
      for (const line of bank) {
        expect(/[…?？!！]$/.test(line)).toBe(true);
      }
    }
  });
  it('spacing buys time but stays conversational', () => {
    expect(WARMUP_GAP_MS).toBeGreaterThanOrEqual(2500);
    expect(WARMUP_GAP_MS).toBeLessThanOrEqual(6000);
    expect(WARMUP_MAX_LINES).toBeGreaterThanOrEqual(2);
  });
});

describe('pickWarmupLine', () => {
  it('is deterministic for the same inputs', () => {
    expect(pickWarmupLine('jun', 'yue', 1, 'hello')).toBe(pickWarmupLine('jun', 'yue', 1, 'hello'));
  });
  it('rotates lines as n advances', () => {
    const lines = new Set(Array.from({ length: 6 }, (_, n) => pickWarmupLine('jun', 'en', n, 'hello')));
    expect(lines.size).toBeGreaterThan(1);
  });
  it('falls back to the Cantonese bank for unknown languages', () => {
    expect(WARMUP_BANKS.fr).toBeUndefined();
    expect(WARMUP_BANKS.yue).toContain(pickWarmupLine('jun', 'fr', 0, 'salut'));
  });
  it('mood nudges the pick without breaking determinism', () => {
    const sad = pickWarmupLine('jun', 'zh', 2, '我唔開心', 'sad');
    expect(sad).toBe(pickWarmupLine('jun', 'zh', 2, '我唔開心', 'sad'));
    expect(WARMUP_BANKS.zh).toContain(sad);
  });
});
