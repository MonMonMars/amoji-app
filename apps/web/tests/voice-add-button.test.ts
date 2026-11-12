/**
 * Voice selection Add button: expands the free gTTS test pool per language
 * without inventing unpaid licensed voices.
 */
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectTtsButtons } from '../lib/tts-button-registry';
import {
  addVoiceOption,
  SHIPPING_VOICE_IDS,
  voiceAddRemaining,
  voiceChoiceById,
} from '../lib/voice-capability';
import { VOICE_ADD_POOL, resetVoiceExtras, extraVoiceId } from '../lib/voice-extras';
import { resetVoicePicks, saveVoicePick, voicePickFor } from '../lib/voice-picks';

const here = path.dirname(fileURLToPath(import.meta.url));
const picker = fs.readFileSync(path.resolve(here, '../components/VoicePicker.tsx'), 'utf8');
const row = fs.readFileSync(path.resolve(here, '../components/TtsVoiceRow.tsx'), 'utf8');

afterEach(() => {
  resetVoicePicks();
  resetVoiceExtras();
});

describe('voice Add pool + button', () => {
  it('ships male and female for every shipping tl on each language', () => {
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      const byTl = new Map<string, Set<string>>();
      for (const b of selectTtsButtons(locale)) {
        const set = byTl.get(b.tl) ?? new Set();
        set.add(b.deliveryGender);
        byTl.set(b.tl, set);
      }
      expect(byTl.size, locale).toBeGreaterThan(0);
      for (const [tl, genders] of byTl) {
        expect(genders.has('female'), `${locale} ${tl}`).toBe(true);
        expect(genders.has('male'), `${locale} ${tl}`).toBe(true);
      }
    }
  });

  it('keeps Add-pool ids off the shipping set and paired by gender', () => {
    for (const c of VOICE_ADD_POOL) {
      const id = extraVoiceId(c.tl, c.deliveryGender);
      expect(SHIPPING_VOICE_IDS.has(id), id).toBe(false);
    }
    for (const locale of ['yue', 'zh', 'ja', 'en'] as const) {
      const pool = VOICE_ADD_POOL.filter((c) => c.locale === locale);
      expect(pool.length, locale).toBeGreaterThan(0);
      const byTl = new Map<string, Set<string>>();
      for (const c of pool) {
        const set = byTl.get(c.tl) ?? new Set();
        set.add(c.deliveryGender);
        byTl.set(c.tl, set);
      }
      for (const [tl, genders] of byTl) {
        expect(genders.has('female'), `${locale}/${tl}`).toBe(true);
        expect(genders.has('male'), `${locale}/${tl}`).toBe(true);
      }
    }
  });

  it('Add appends, pins, and resolves the new choice', () => {
    const remaining = voiceAddRemaining('zh');
    expect(remaining).toBeGreaterThan(0);
    const added = addVoiceOption('zh');
    expect(added?.tl).toBe('zh-HK');
    expect(voiceChoiceById(added!.id)?.locale).toBe('zh');
    saveVoicePick('zh', added!.id);
    expect(voicePickFor('zh')).toBe(added!.id);
    expect(selectTtsButtons('zh').some((b) => b.id === added!.id)).toBe(true);
    expect(voiceAddRemaining('zh')).toBe(remaining - 1);
  });

  it('returns null once the Add pool for a language is exhausted', () => {
    let guard = 0;
    while (voiceAddRemaining('ja') > 0 && guard < 20) {
      expect(addVoiceOption('ja')).not.toBeNull();
      guard += 1;
    }
    expect(addVoiceOption('ja')).toBeNull();
    expect(voiceAddRemaining('ja')).toBe(0);
  });

  it('puts an Add button in VoicePicker and TtsVoiceRow', () => {
    expect(picker).toContain('data-testid={`voice-add-${locale}`}');
    expect(picker).toContain("t(lang, 'voiceAdd')");
    expect(picker).toContain('addVoiceOption(locale)');
    expect(row).toContain('data-testid="tts-voice-add"');
    expect(row).toContain("t(lang, 'voiceAdd')");
    expect(row).toContain('addVoiceOption(lang)');
  });
});
