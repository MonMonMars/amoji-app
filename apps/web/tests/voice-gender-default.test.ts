/**
 * The companion's gender chooses the voice (owner 2026-11-26): "the character,
 * should default use male or female based on the gender of the character."
 *
 * v1 of voice-picks.ts stored one pin per LANGUAGE. So a voice chosen while a
 * female character was on screen carried over to a male character, and he
 * spoke in a woman's voice. These tests pin the new contract:
 *
 *   1. no pin: a female character resolves to a female voice, a male character
 *      to the male voice (the relay male Edge seed, per language);
 *   2. a pin belongs to a (language, speaker gender) slot, so a female pin can
 *      never leak to a male character;
 *   3. both genders can hold a pin in the same language at once;
 *   4. the old flat `amoji.voiceChoices.v1` payload is MIGRATED (its ids are
 *      still real speakers), landing on the slot its catalog entry names;
 *   5. when no male source exists (relay down) a male character still resolves
 *      to a male identity — never silently to the female speaker.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_TTS_PROXY, setTtsProxy } from '../lib/edge-tts';
import { voiceChoiceById } from '../lib/voice-capability';
import {
  activeVoiceChoice,
  effectiveVoiceChoice,
  effectiveVoiceChoiceId,
  loadVoicePicks,
  resetVoicePicks,
  saveVoicePick,
  voicePickFor,
} from '../lib/voice-picks';

const here = path.dirname(fileURLToPath(import.meta.url));

/** The roster's default female and a real male companion. */
const FEMALE = 'a01-shino';
const MALE = 'a03-fumiriya';
const LOCALES = ['yue', 'zh', 'ja', 'en'] as const;

/** The gTTS female speaker each language already used as its default. */
const FEMALE_ID: Record<(typeof LOCALES)[number], string> = {
  yue: 'gtts:yue:f:mid',
  zh: 'gtts:zh-CN:f:mid',
  ja: 'gtts:ja:f:mid',
  en: 'gtts:en-US:f:mid',
};

/** The verified relay male Edge voice per language. */
const MALE_EDGE: Record<(typeof LOCALES)[number], string> = {
  yue: 'zh-HK-WanLungNeural',
  zh: 'zh-CN-YunjianNeural',
  ja: 'ja-JP-KeitaNeural',
  en: 'en-US-GuyNeural',
};

const maleId = (locale: (typeof LOCALES)[number]) => `edge:${MALE_EDGE[locale]}`;

function withStorage(seed: Record<string, string> = {}) {
  const g = globalThis as { localStorage?: Storage };
  const prev = g.localStorage;
  const map = new Map(Object.entries(seed));
  const shim = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
  g.localStorage = shim as unknown as Storage;
  return {
    raw: (k: string) => map.get(k) ?? null,
    restore: () => { g.localStorage = prev; },
  };
}

beforeEach(() => {
  setTtsProxy(DEFAULT_TTS_PROXY);
  resetVoicePicks();
});

afterEach(() => {
  resetVoicePicks();
  setTtsProxy(DEFAULT_TTS_PROXY);
});

describe('no pin: the character gender picks the default voice', () => {
  it('female characters start on the female speaker in every language', () => {
    for (const locale of LOCALES) {
      expect(effectiveVoiceChoiceId(locale, FEMALE), locale).toBe(FEMALE_ID[locale]);
      const eff = effectiveVoiceChoice(locale, FEMALE);
      expect(eff.requestedGender).toBe('female');
      expect(eff.genderMatched).toBe(true);
      expect(eff.pinned).toBe(false);
      expect(eff.playable).toBe(true);
    }
  });

  it('male characters start on the male Edge voice in every language', () => {
    for (const locale of LOCALES) {
      expect(effectiveVoiceChoiceId(locale, MALE), locale).toBe(maleId(locale));
      const eff = effectiveVoiceChoice(locale, MALE);
      expect(eff.requestedGender).toBe('male');
      expect(eff.genderMatched).toBe(true);
      expect(eff.pinned).toBe(false);
      // The id names a real male Edge voice, not a relabelled Google speaker.
      expect(voiceChoiceById(eff.id)?.edgeVoiceId, locale).toBe(MALE_EDGE[locale]);
      expect(voiceChoiceById(eff.id)?.deliveryGender, locale).toBe('male');
    }
  });

  it('Cantonese male is WanLung, the owner-priority voice', () => {
    expect(effectiveVoiceChoiceId('yue', MALE)).toBe('edge:zh-HK-WanLungNeural');
    expect(voiceChoiceById('edge:zh-HK-WanLungNeural')?.edgeVoiceId)
      .toBe('zh-HK-WanLungNeural');
  });

  it('the highlight the picker/greeting uses agrees with the resolver', () => {
    for (const locale of LOCALES) {
      expect(activeVoiceChoice(locale, 'female').id, locale).toBe(FEMALE_ID[locale]);
      expect(activeVoiceChoice(locale, 'male').id, locale).toBe(maleId(locale));
      expect(activeVoiceChoice(locale, 'male').deliveryGender, locale).toBe('male');
    }
  });
});

describe('a pin belongs to one gender, not the whole language', () => {
  it('a female pin does not leak to a male character (the reported bug)', () => {
    saveVoicePick('yue', FEMALE_ID.yue);

    expect(effectiveVoiceChoiceId('yue', FEMALE)).toBe(FEMALE_ID.yue);
    // Same language, other gender: the female pin must not follow.
    expect(effectiveVoiceChoiceId('yue', MALE)).toBe(maleId('yue'));
    expect(activeVoiceChoice('yue', 'male').id).toBe(maleId('yue'));
    expect(activeVoiceChoice('yue', 'male').deliveryGender).toBe('male');
  });

  it('both pins coexist in one language and each character gets its own', () => {
    saveVoicePick('en', 'gtts:en-GB:f:mid');
    saveVoicePick('en', maleId('en'));

    expect(loadVoicePicks().en).toEqual({
      female: 'gtts:en-GB:f:mid',
      male: maleId('en'),
    });
    expect(effectiveVoiceChoiceId('en', FEMALE)).toBe('gtts:en-GB:f:mid');
    expect(effectiveVoiceChoiceId('en', MALE)).toBe(maleId('en'));
    expect(voicePickFor('en', 'female')).toBe('gtts:en-GB:f:mid');
    expect(voicePickFor('en', 'male')).toBe(maleId('en'));
  });

  it('pinning the male voice first leaves the female default alone', () => {
    saveVoicePick('ja', maleId('ja'));
    expect(effectiveVoiceChoiceId('ja', MALE)).toBe(maleId('ja'));
    expect(effectiveVoiceChoiceId('ja', FEMALE)).toBe(FEMALE_ID.ja);
    expect(voicePickFor('ja', 'female')).toBeNull();
  });

  it('a pin for another language is still refused', () => {
    saveVoicePick('ja', 'gtts:en-GB:f:mid');
    expect(voicePickFor('ja', 'female')).toBeNull();
    expect(effectiveVoiceChoiceId('ja', FEMALE)).toBe(FEMALE_ID.ja);
  });

  it('an unpinned gender keeps its default even when the other gender is pinned', () => {
    saveVoicePick('zh', maleId('zh'));
    // Female has no pin here, so it must still use the female speaker — not
    // the male pin.
    expect(voicePickFor('zh', 'female')).toBeNull();
    expect(effectiveVoiceChoiceId('zh', FEMALE)).toBe(FEMALE_ID.zh);
  });
});

describe('legacy flat v1 payload is migrated, not discarded', () => {
  it('moves each stored id into the gender slot its catalog entry names', async () => {
    const h = withStorage({
      'amoji.voiceChoices.v1': JSON.stringify({
        yue: 'gtts:yue:f:mid',
        zh: 'gtts:zh-TW:f:mid',
        en: 'edge:en-US-GuyNeural',
      }),
    });
    vi.resetModules();
    const fresh = await import('../lib/voice-picks');
    const map = fresh.loadVoicePicks();

    expect(map.yue).toEqual({ female: 'gtts:yue:f:mid' });
    expect(map.zh).toEqual({ female: 'gtts:zh-TW:f:mid' });
    // A real male id lands in the male slot, so the male character keeps it.
    expect(map.en).toEqual({ male: 'edge:en-US-GuyNeural' });
    expect(fresh.effectiveVoiceChoiceId('en', MALE)).toBe('edge:en-US-GuyNeural');
    expect(fresh.effectiveVoiceChoiceId('en', FEMALE)).toBe(FEMALE_ID.en);
    // The user's pick is not lost for the matching gender.
    expect(fresh.effectiveVoiceChoiceId('zh', FEMALE)).toBe('gtts:zh-TW:f:mid');

    // v2 is written and v1 is retired, so migration happens once.
    expect(h.raw('amoji.voiceChoices.v2') ?? '').toContain('GuyNeural');
    expect(h.raw('amoji.voiceChoices.v1')).toBeNull();

    h.restore();
    vi.resetModules();
  });

  it('a legacy "male" gTTS id was a female speaker and lands female', async () => {
    const h = withStorage({
      'amoji.voiceChoices.v1': JSON.stringify({ yue: 'gtts:yue:m:mid' }),
    });
    vi.resetModules();
    const fresh = await import('../lib/voice-picks');
    expect(fresh.loadVoicePicks().yue).toEqual({ female: 'gtts:yue:f:mid' });
    h.restore();
    vi.resetModules();
  });
});

describe('a male character is never silently given a female voice', () => {
  it('with the relay closed the male identity is kept and marked unplayable', () => {
    setTtsProxy('');
    const eff = effectiveVoiceChoice('yue', MALE);
    // Not a Google female id and not the female default.
    expect(eff.id).toBe('edge:zh-HK-WanLungNeural');
    expect(eff.id).not.toMatch(/^gtts:/);
    expect(eff.genderMatched).toBe(true);
    expect(eff.requestedGender).toBe('male');
    // The male source is unavailable — the caller can say so instead of
    // substituting a woman's voice.
    expect(eff.playable).toBe(false);
    expect(voiceChoiceById(eff.id)).toBeUndefined();

    // The female character is unaffected.
    expect(effectiveVoiceChoiceId('yue', FEMALE)).toBe(FEMALE_ID.yue);
    // Nothing is pinned; there is simply no male default that can play.
    expect(voicePickFor('yue', 'male')).toBeNull();
    expect(activeVoiceChoice('yue', 'male').deliveryGender).toBe('male');
  });

  it('an explicit male pin survives a closed relay and is not swapped for female', () => {
    setTtsProxy('');
    saveVoicePick('yue', maleId('yue'));
    const eff = effectiveVoiceChoice('yue', MALE);
    expect(eff.id).toBe('edge:zh-HK-WanLungNeural');
    expect(eff.pinned).toBe(true);
    expect(eff.playable).toBe(false);
    expect(effectiveVoiceChoiceId('yue', FEMALE)).toBe(FEMALE_ID.yue);
  });
});

describe('the chat path shares the resolver with the greeting path', () => {
  const voice = fs.readFileSync(path.resolve(here, '../lib/voice.ts'), 'utf8');

  it('a queued reply captures the character-gender voice at enqueue', () => {
    expect(voice).toContain('speechPinFor(characterId, lang, opts?.utterance)');
    expect(voice).toMatch(/function speechPinFor\([\s\S]*?effectiveVoiceChoiceId\(utterance\.lang, characterId\)/);
  });

  it('performSpeak resolves the live default through the same function', () => {
    const start = voice.indexOf('function performSpeak');
    const end = voice.indexOf('function performSing', start);
    const body = voice.slice(start, end === -1 ? undefined : end);
    expect(body).toContain('effectiveVoiceChoiceId(lang, characterId)');
    // The old locale-only read is gone from the chat resolver.
    expect(body).not.toContain('voicePickFor(lang)');
  });
});
