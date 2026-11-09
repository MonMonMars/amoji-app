import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rollingCaptionFromText } from '../lib/speech-caption';
import { pauseAfterClause } from '../lib/gtts';

describe('speech caption helpers', () => {
  it('shows the last one or two clauses of a streaming draft', () => {
    const draft = '第一句好長。第二句跟上。第三句收尾。';
    expect(rollingCaptionFromText(draft)).toContain('第三句收尾');
    expect(rollingCaptionFromText(draft)).toContain('第二句跟上');
    expect(rollingCaptionFromText(draft)).not.toContain('第一句');
  });

  it('clause pauses stay above the subtitle-sync floor', () => {
    expect(pauseAfterClause('你好，')).toBeGreaterThanOrEqual(250);
    expect(pauseAfterClause('返工咁攰。')).toBeGreaterThanOrEqual(450);
    expect(pauseAfterClause('返工咁攰。')).toBeGreaterThan(pauseAfterClause('你好，'));
    expect(pauseAfterClause('Note:')).toBeGreaterThanOrEqual(250);
  });

  it('caption roll uses raw clause markers so paragraph gaps stay in the clock', () => {
    const src = readFileSync(join(__dirname, '../lib/speech-caption.ts'), 'utf8');
    expect(src).toContain('pauseAfterClause(raw)');
    expect(src).toContain('splitChunks(spoken)');
    expect(pauseAfterClause('第一段完。\n\n')).toBeGreaterThan(pauseAfterClause('第一段完。'));
  });
});
