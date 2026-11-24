/**
 * Selectable pitch buttons — retired by the owner's original-TTS directive.
 *
 * #446 shipped deep/mid/bright buttons over the SAME Google MP3, each one a
 * playbackRate resample. The owner (2026-11-23): "all the modified sound not
 * sound good ... please only use the original TTS." So there is one natural
 * button per real speaker; legacy pitch ids still resolve to it so saved pins
 * do not break, and nothing applies a pitch bias.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGINAL_TTS_PITCH_BIAS, gttsCharacterPitchBias } from '../lib/gtts-timbre';
import {
  pitchTierForChoice,
  preferredVoiceChoiceForGender,
  voiceChoiceById,
  voiceChoiceId,
} from '../lib/voice-capability';
import { selectTtsButtons } from '../lib/tts-button-registry';
import { resetVoicePicks, saveVoicePick, voicePickFor } from '../lib/voice-picks';

const here = path.dirname(fileURLToPath(import.meta.url));

describe('one natural button per speaker; legacy pitch ids resolve to it', () => {
  it('normalises deep/mid/bright ids onto the same female mid choice', () => {
    for (const tier of ['deep', 'mid', 'bright'] as const) {
      const id = voiceChoiceId('yue', 'female', tier);
      const hit = voiceChoiceById(id)!;
      expect(hit.id).toBe('gtts:yue:f:mid');
      expect(hit.tl).toBe('yue');
      expect(hit.deliveryGender).toBe('female');
      expect(hit.pitchTier).toBe('mid');
      expect(pitchTierForChoice(id)).toBe('mid');
    }
    // A legacy male id was a female source; it resolves there, not to "male".
    expect(voiceChoiceById('gtts:yue:m:deep')?.id).toBe('gtts:yue:f:mid');
  });

  it('applies no pitch bias for any gender or tier', () => {
    for (const tier of ['deep', 'mid', 'bright'] as const) {
      expect(gttsCharacterPitchBias('female', undefined, 'en', tier)).toBe(1);
      expect(gttsCharacterPitchBias('male', undefined, 'en', tier)).toBe(1);
    }
    expect(ORIGINAL_TTS_PITCH_BIAS).toBe(1);
  });

  it('defaults both gender picks to the female mid button', () => {
    expect(preferredVoiceChoiceForGender('yue', 'female').id).toBe('gtts:yue:f:mid');
    expect(preferredVoiceChoiceForGender('yue', 'male').id).toBe('gtts:yue:f:mid');
    expect(preferredVoiceChoiceForGender('en', 'female').pitchTier).toBe('mid');
  });

  it('migrates a saved bright pin to the natural button', () => {
    resetVoicePicks();
    saveVoicePick('ja', 'gtts:ja:f:bright');
    expect(voicePickFor('ja')).toBe('gtts:ja:f:mid');
    expect(pitchTierForChoice(voicePickFor('ja'))).toBe('mid');
    resetVoicePicks();
  });

  it('select board and settings still render the tier label helper', () => {
    const row = fs.readFileSync(path.resolve(here, '../components/TtsVoiceRow.tsx'), 'utf8');
    const picker = fs.readFileSync(path.resolve(here, '../components/VoicePicker.tsx'), 'utf8');
    expect(row).toContain('pitchTierLabelKey(button.pitchTier)');
    expect(picker).toContain('pitchTierLabelKey(button.pitchTier)');
    expect(row).toContain('${genderLabel} · ${pitchLabel}');
    expect(selectTtsButtons('yue').filter((b) => b.tl === 'yue' && b.deliveryGender === 'female')).toHaveLength(1);
  });

  it('voice.ts routes through the pinned button, which is now the identity', () => {
    const voice = fs.readFileSync(path.resolve(here, '../lib/voice.ts'), 'utf8');
    expect(voice).toContain('pitchTierForChoice');
    expect(voice).toContain('gttsCharacterPitchBias(delivery, characterId, lang, tier)');
    expect(voice).toContain('gttsPitchForLang(locale, \'preview\', previewGender, choiceId)');
  });
});
