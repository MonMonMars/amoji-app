import { describe, expect, it } from 'vitest';
import { pickLine } from '../lib/chatter';

describe('startup chatter', () => {
  it('substitutes the companion name instead of a hardcoded Juno', () => {
    const line = pickLine('startup', 'en', 0, { name: 'Shino' });
    expect(line).toContain('Shino');
    expect(line).not.toMatch(/\bJuno\b/);
  });
});
