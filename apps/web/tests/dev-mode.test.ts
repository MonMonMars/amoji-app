import { describe, expect, it } from 'vitest';
import { devMark, isDevMode } from '../lib/dev-mode';

describe('dev mode marks', () => {
  it('builds NUMBER+ALPHABET marks for Momoto', () => {
    expect(devMark('V', 12)).toBe('V12');
    expect(devMark('R', 94)).toBe('R94');
    expect(devMark('A', 1)).toBe('A1');
  });

  it('stays off without a flag', () => {
    expect(isDevMode()).toBe(false);
  });
});
