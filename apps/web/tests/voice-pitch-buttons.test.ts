/**
 * Owner ask: same Google voice → several pitch variants as selectable buttons.
 * #374 only auto-assigned bright/mid/deep per character. This suite locks the
 * selectable button path (catalog + pitch resolver + UI labels).
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FEMALE_TIER_OFFSET,
  MALE_TIER_OFFSET,
  gttsCharacterPitchBias,
} from '../lib/gtts-timbre';
import {
  GTTS_PITCH_BIAS_MAX,
  GTTS_PITCH_BIAS_MIN,
  PITCH_BIAS_FEMALE,
  PITCH_BIAS_MALE,
} from '../lib/gtts';
import {
  pitchTierForChoice,
  preferredVoiceChoiceForGender,
  voiceChoiceById,
  voiceChoiceId,
} from '../lib/voice-capability';
import { selectTtsButtons } from '../lib/tts-button-registry';
import { resetVoicePicks, saveVoicePick, voicePickFor } from '../lib/voice-picks';

const here = path.dirname(fileURLToPath(import.meta.url));

describe('selectable pitch buttons for the same voice', () => {
  it('expands each tl×gender into deep/mid/bright choice ids', () => {
    expect(voiceChoiceId('yue', 'female', 'deep')).toBe('gtts:yue:f:deep');
    expect(voiceChoiceId('yue', 'female', 'mid')).toBe('gtts:yue:f:mid');
    expect(voiceChoiceId('yue', 'female', 'bright')).toBe('gtts:yue:f:bright');
    expect(voiceChoiceById('gtts:yue:f:bright')?.pitchTier).toBe('bright');
    expect(pitchTierForChoice('gtts:yue:m:deep')).toBe('deep');
  });

  it('pinned pitch button changes free-tier bias without changing tl', () => {
    const deep = voiceChoiceById('gtts:en-US:f:deep')!;
    const bright = voiceChoiceById('gtts:en-US:f:bright')!;
    expect(deep.tl).toBe(bright.tl);
    expect(deep.deliveryGender).toBe(bright.deliveryGender);
    const deepBias = gttsCharacterPitchBias('female', undefined, 'en', deep.pitchTier);
    const brightBias = gttsCharacterPitchBias('female', undefined, 'en', bright.pitchTier);
    expect(deepBias).toBe(
      Math.max(GTTS_PITCH_BIAS_MIN, PITCH_BIAS_FEMALE + FEMALE_TIER_OFFSET.deep),
    );
    expect(brightBias).toBe(
      Math.min(GTTS_PITCH_BIAS_MAX, PITCH_BIAS_FEMALE + FEMALE_TIER_OFFSET.bright),
    );
    expect(brightBias - deepBias).toBeGreaterThanOrEqual(0.40);
    const maleDeep = gttsCharacterPitchBias('male', undefined, 'en', 'deep');
    const maleBright = gttsCharacterPitchBias('male', undefined, 'en', 'bright');
    // Male deep may hit the widened clamp floor when raw base+offset undershoots.
    expect(maleDeep).toBeGreaterThanOrEqual(GTTS_PITCH_BIAS_MIN);
    expect(maleDeep).toBe(Math.max(GTTS_PITCH_BIAS_MIN, PITCH_BIAS_MALE + MALE_TIER_OFFSET.deep));
    expect(maleBright - maleDeep).toBeGreaterThanOrEqual(0.30);
    expect(maleDeep).toBeLessThan(deepBias);
  });

  it('defaults unpinned gender picks to the mid pitch button', () => {
    expect(preferredVoiceChoiceForGender('yue', 'female').id).toBe('gtts:yue:f:mid');
    expect(preferredVoiceChoiceForGender('yue', 'male').id).toBe('gtts:yue:m:mid');
    expect(preferredVoiceChoiceForGender('en', 'female').pitchTier).toBe('mid');
  });

  it('pins and restores a bright pitch button', () => {
    resetVoicePicks();
    saveVoicePick('ja', 'gtts:ja:f:bright');
    expect(voicePickFor('ja')).toBe('gtts:ja:f:bright');
    expect(pitchTierForChoice(voicePickFor('ja'))).toBe('bright');
    resetVoicePicks();
  });

  it('select board and settings both render pitch in the button label', () => {
    const row = fs.readFileSync(path.resolve(here, '../components/TtsVoiceRow.tsx'), 'utf8');
    const picker = fs.readFileSync(path.resolve(here, '../components/VoicePicker.tsx'), 'utf8');
    expect(row).toContain('pitchTierLabelKey(button.pitchTier)');
    expect(picker).toContain('pitchTierLabelKey(button.pitchTier)');
    expect(row).toContain('${genderLabel} · ${pitchLabel}');
    expect(selectTtsButtons('yue').filter((b) => b.tl === 'yue' && b.deliveryGender === 'female')).toHaveLength(3);
  });

  it('voice.ts routes speak/preview pitch through the pinned button', () => {
    const voice = fs.readFileSync(path.resolve(here, '../lib/voice.ts'), 'utf8');
    expect(voice).toContain('pitchTierForChoice');
    expect(voice).toContain('gttsCharacterPitchBias(delivery, characterId, lang, tier)');
    expect(voice).toContain('gttsPitchForLang(locale, \'preview\', previewGender, choiceId)');
  });
});
