import { describe, expect, it } from 'vitest';
import { speechLeadDiverged, speechRemainder } from '../lib/speech-queue';

/**
 * Regression: yue chat streamed the motif lead「我鍾意信。」then re-spoke the
 * whole line because speechLeadDiverged treated the next Han char as a swap.
 */
describe('yue voice loop — 我鍾意信 lead', () => {
  it('speaks only the tail after the streamed motif lead', () => {
    const streamed = '我鍾意信。';
    const final = '我鍾意信你，唔使急。';
    expect(speechLeadDiverged(final, streamed)).toBe(false);
    expect(speechRemainder(final, streamed)).toBe('你，唔使急。');
  });
});