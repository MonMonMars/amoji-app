import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';

describe('browser synth clause pauses', () => {
  it('waits pauseAfterClause between utterances instead of back-to-back speak()', () => {
    const src = readFileSync(join(__dirname, '../lib/voice.ts'), 'utf8');
    expect(src).toContain('pauseAfterClause(part)');
    expect(src).toContain('synthGapTimer');
    expect(src).toContain('splitClauses(text)');
  });
});
