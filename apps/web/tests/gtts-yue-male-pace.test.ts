/**
 * Male Cantonese gTTS pace — retired.
 *
 * #406/#410/#413 added `GTTS_YUE_MALE_PACE_FLOOR` so a pitched-down female MP3
 * would not collapse deep/mid into one slurred voice. The owner then said that
 * modified sound itself was the problem and asked for the original TTS. So the
 * whole male-pace band is gone: Cantonese male is not a real source, and we no
 * longer pretend it is.
 *
 * What remains to pin:
 *   - there is no male pace/pitch special case in lib/gtts.ts;
 *   - the identity resolver still returns 1 for yue male deep/mid/bright.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { gttsCharacterPitchBias } from '../lib/gtts-timbre';

const gtts = readFileSync(join(__dirname, '../lib/gtts.ts'), 'utf8');

describe('no male Cantonese pitch/pace special case', () => {
  it('has no yue-male pace floor or pitch constants left in gtts.ts', () => {
    expect(gtts).not.toMatch(/GTTS_YUE_MALE_PACE_FLOOR/);
    expect(gtts).not.toMatch(/GTTS_PITCH_BIAS_MIN|GTTS_PITCH_BIAS_MAX/);
    expect(gtts).not.toMatch(/PITCH_BIAS_MALE|PITCH_BIAS_FEMALE/);
  });

  it('does not compute a pitch-multiplied playbackRate', () => {
    expect(gtts).not.toMatch(/playbackRate\s*=\s*rate\s*\*/);
    expect(gtts).not.toMatch(/pitchBias\s*!==\s*1/);
  });

  it('keeps yue male deep/mid/bright at the original rate', () => {
    for (const tier of ['deep', 'mid', 'bright'] as const) {
      expect(gttsCharacterPitchBias('male', undefined, 'yue', tier), tier).toBe(1);
    }
    expect(gttsCharacterPitchBias('male', 'a01-shino', 'yue', 'deep')).toBe(1);
  });
});
