import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  captionsCoverReply,
  commitCaptionLines,
  dedupeConsecutiveCaptions,
  rollingCaptionFromText,
  stepCaptionLadder,
} from '../lib/speech-caption';
import { pauseAfterClause } from '../lib/gtts';

describe('speech caption helpers', () => {
  it('shows only the latest clause of a streaming draft (no stacked overlap)', () => {
    const draft = '第一句好長。第二句跟上。第三句收尾。';
    const one = rollingCaptionFromText(draft);
    expect(one).toContain('第三句收尾');
    expect(one).not.toContain('第二句');
    expect(one).not.toContain('第一句');
    expect(rollingCaptionFromText(draft, 2)).toContain('第二句跟上');
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

  it('seals caption clauses for history without replaying the whole phase', () => {
    const mid = stepCaptionLadder([], '', '第一句。');
    const next = stepCaptionLadder(mid.ladder, mid.current, '第二句。');
    const sealed = commitCaptionLines(next.ladder, next.current);
    expect(sealed).toEqual(['第一句。', '第二句。']);
    expect(captionsCoverReply(sealed, '第一句。第二句。')).toBe(true);
    expect(commitCaptionLines(sealed, '')).toEqual(sealed);
  });

  it('dedupes consecutive identical caption lines (lead re-dispatch)', () => {
    expect(dedupeConsecutiveCaptions(['Hello.', 'Hello.', 'How are you?'])).toEqual([
      'Hello.',
      'How are you?',
    ]);
    expect(commitCaptionLines(['Hello.', 'Hello.'], 'Hello.')).toEqual(['Hello.']);
    const bounce = stepCaptionLadder(['Hello.'], 'Hello.', 'How are you?');
    expect(bounce.ladder).toEqual(['Hello.']);
    expect(bounce.current).toBe('How are you?');
  });
});
