// Which of the genuinely different voices the user picked, per language AND
// per speaker gender.
//
// v1 of this module stored one id per language and deliberately had no gender
// slot ("the live voices are not gendered"). That reasoning is obsolete: the
// relay carries real Edge male voices again, so the same language now has two
// genuinely different speakers. A single per-language slot made a pin chosen
// while playing a female character carry over to a male character — the owner's
// bug: "the male character speaks in a woman's voice".
//
// So a pin is now keyed by (locale, gender). Switching to a character of the
// other gender picks that gender's own pin, and an unpinned gender falls back
// to {@link effectiveVoiceChoice}, which reads the character's gender from the
// roster (lib/voice-gender.ts) — no trip to Settings required.
//
// STORAGE
//   amoji.voiceChoices.v2  { yue: { female: 'gtts:yue:f:mid' }, en: { male: 'edge:en-US-GuyNeural' } }
//   amoji.voiceChoices.v1  flat { en: 'gtts:en-GB:f:mid' } — MIGRATED, not deleted:
//                          each id is still a real, meaningful speaker, so it is
//                          moved into the gender slot its catalog entry names and
//                          the user keeps the voice they chose.
//   amoji.voicePicks.v2    pre-v1 Edge short names in gender slots. Deleted on
//                          read: ten names shared one voice, so there is no
//                          truthful one-to-one mapping.
//
// Policy when a gender has no source (e.g. the relay is down, so there is no
// male Edge voice): the character still resolves to a MALE identity, never to
// a female speaker wearing the male character's name. The picker already omits
// the male button and says why (voiceRelayOff); the play chain decides whether
// a male device voice can carry the line. See effectiveVoiceChoice().

import {
  RELAY_MALE_SEEDS,
  edgeChoiceId,
  isVoiceLocale,
  preferredVoiceChoiceForGender,
  relayMaleChoicesFor,
  resolveVoiceChoiceId,
  shippingVoiceChoicesFor,
  voiceChoiceById,
  voiceChoicesFor,
  type VoiceChoice,
} from './voice-capability';
import type { VoiceLocale } from './voice-catalog';
import { characterVoiceGender } from './voice-gender';

/** v2: one pin per (language, speaker gender). */
const KEY = 'amoji.voiceChoices.v2';
/** v1: a flat locale→id map. Migrated into v2 by inferring the id's gender. */
const FLAT_KEY = 'amoji.voiceChoices.v1';
/** Predecessor key: Edge short names in gender slots. Cleared, never migrated. */
const DEAD_KEY = 'amoji.voicePicks.v2';

/** Fallback `tl` for an Edge seed when a caller needs a gTTS handle. It is a
 *  handle only — a male choice is never spoken by the Google speaker. */
const MALE_SEED_TL: Record<VoiceLocale, string> = {
  yue: 'yue',
  zh: 'zh-CN',
  ja: 'ja',
  en: 'en-US',
};

export type VoiceGender = 'female' | 'male';
/** Both genders can hold their own pin at the same time. */
export type GenderPicks = Partial<Record<VoiceGender, string>>;
export type VoicePickMap = Partial<Record<VoiceLocale, GenderPicks>>;

let memory: VoicePickMap = {};
let loaded = false;

interface PinTarget {
  id: string;
  locale: VoiceLocale;
  gender: VoiceGender;
}

/**
 * Static identity of a pinned/known id, WITHOUT asking whether its transport is
 * up right now. A user's explicit male pick must survive an Edge breaker trip
 * (the id is still meaningful); availability is decided at play time.
 */
function pinTarget(id: string | null | undefined): PinTarget | undefined {
  if (!id) return undefined;
  const resolved = resolveVoiceChoiceId(id);
  if (!resolved) return undefined;
  const hit = voiceChoiceById(resolved);
  if (hit) return { id: hit.id, locale: hit.locale, gender: hit.deliveryGender };
  for (const seed of RELAY_MALE_SEEDS) {
    if (edgeChoiceId(seed.edgeVoiceId) === resolved) {
      return { id: resolved, locale: seed.locale, gender: 'male' };
    }
  }
  return undefined;
}

function sanitizeRow(raw: unknown, locale: VoiceLocale): GenderPicks {
  const out: GenderPicks = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [slot, value] of Object.entries(raw as Record<string, unknown>)) {
    if (slot !== 'female' && slot !== 'male') continue;
    if (typeof value !== 'string') continue;
    const target = pinTarget(value);
    if (!target || target.locale !== locale || target.gender !== slot) continue;
    out[slot] = target.id;
  }
  return out;
}

/**
 * v1 payload (flat locale→id) → v2 payload, with each id landing in the slot
 * its catalog entry actually names. A legacy `gtts:…:m` id was a female
 * speaker and resolves to female, so it lands there rather than masquerading
 * as a male slot.
 */
function migrateFlat(raw: unknown): VoicePickMap {
  if (!raw || typeof raw !== 'object') return {};
  const out: VoicePickMap = {};
  for (const [locale, id] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof id !== 'string' || !isVoiceLocale(locale)) continue;
    const target = pinTarget(id);
    if (!target || target.locale !== locale) continue;
    out[locale] = { [target.gender]: target.id };
  }
  return out;
}

function sanitize(raw: unknown): VoicePickMap {
  if (!raw || typeof raw !== 'object') return {};
  const out: VoicePickMap = {};
  for (const [locale, row] of Object.entries(raw as Record<string, unknown>)) {
    if (!isVoiceLocale(locale)) continue;
    // Defensive: a v2 key holding the old flat shape is upgraded, not dropped.
    const picks = typeof row === 'string'
      ? migrateFlat({ [locale]: row })[locale]
      : sanitizeRow(row, locale);
    if (picks && (picks.female || picks.male)) out[locale] = picks;
  }
  return out;
}

function persist(next: VoicePickMap): void {
  memory = next;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* private mode */ }
}

function hydrate(): VoicePickMap {
  if (loaded) return memory;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return memory;
    const raw = localStorage.getItem(KEY);
    memory = raw ? sanitize(JSON.parse(raw)) : {};
    const flat = localStorage.getItem(FLAT_KEY);
    if (flat) {
      // Merge, never clobber: a v2 pin made since the last attempt wins over v1.
      const migrated = migrateFlat(JSON.parse(flat));
      for (const locale of Object.keys(migrated) as VoiceLocale[]) {
        memory[locale] = { ...migrated[locale], ...memory[locale] };
      }
      try {
        localStorage.setItem(KEY, JSON.stringify(memory));
        localStorage.removeItem(FLAT_KEY);
      } catch { /* private mode: keep the v1 payload for a later load */ }
    }
    if (localStorage.getItem(DEAD_KEY) !== null) localStorage.removeItem(DEAD_KEY);
  } catch { /* ignore */ }
  return memory;
}

export function loadVoicePicks(): VoicePickMap {
  return hydrate();
}

/**
 * Pinned choice id for this language and speaker gender.
 *
 * Called without `gender` (legacy shape) it returns that language's female pin,
 * else its male pin. New code should always pass the gender it is resolving
 * for — a locale-only read is exactly what let a female pin leak to a male
 * character.
 */
export function voicePickFor(locale: string, gender?: VoiceGender): string | null {
  if (!isVoiceLocale(locale)) return null;
  const row = hydrate()[locale];
  if (!row) return null;
  if (gender) return row[gender] ?? null;
  return row.female ?? row.male ?? null;
}

/** The male Edge seed for this language, ignoring the relay gate. */
function maleSeedChoice(locale: VoiceLocale): VoiceChoice | undefined {
  const live = relayMaleChoicesFor(locale)[0];
  if (live) return live;
  const seed = RELAY_MALE_SEEDS.find((s) => s.locale === locale);
  if (!seed) return undefined;
  return {
    id: edgeChoiceId(seed.edgeVoiceId),
    locale,
    engine: 'edge',
    // Fallback handle only; an edge choice is never spoken by gTTS.
    tl: MALE_SEED_TL[locale],
    edgeVoiceId: seed.edgeVoiceId,
    deliveryGender: 'male',
    pitchTier: 'mid',
    labelKey: seed.labelKey,
    n: shippingVoiceChoicesFor(locale).length + 1,
  };
}

/**
 * The voice that gender gets when the user has not pinned one.
 *
 * Female: the language's female speaker (the Google MP3 tier).
 * Male: the relay male Edge voice when it is playable, otherwise the male seed
 * by id. It is deliberately NEVER the female speaker: a male character must not
 * be voiced by a woman just because the relay is down. Whether that male
 * identity can be heard is the play chain's question (Edge → device male voice),
 * not a reason to substitute a female id here.
 */
function defaultChoiceForGender(locale: VoiceLocale, gender: VoiceGender): VoiceChoice | undefined {
  if (gender === 'male') return maleSeedChoice(locale);
  return preferredVoiceChoiceForGender(locale, 'female');
}

/**
 * The choice to highlight for this language and speaker gender. Never null.
 *
 * The pin for THAT gender wins. A female pin can no longer be shown (or
 * spoken) for a male character.
 */
export function activeVoiceChoice(
  locale: VoiceLocale,
  preferGender: VoiceGender = 'female',
): VoiceChoice {
  const pinnedId = voicePickFor(locale, preferGender);
  const pinned = voiceChoiceById(pinnedId);
  if (pinned && pinned.locale === locale && pinned.deliveryGender === preferGender) return pinned;
  const fallback = defaultChoiceForGender(locale, preferGender);
  if (fallback) return fallback;
  return voiceChoicesFor(locale)[0] ?? voiceChoiceById('gtts:en-US:f:mid')!;
}

export interface EffectiveVoiceChoice {
  /** Effective choice id, or null for a language this app does not speak. */
  id: string | null;
  /** Full choice when its transport is currently resolvable. */
  choice: VoiceChoice | null;
  /** Gender implied by the character. */
  requestedGender: VoiceGender;
  /** True when the resolved id really is that gender's voice. */
  genderMatched: boolean;
  /** True when the id came from the user's explicit pin for this gender. */
  pinned: boolean;
  /**
   * True when the voice's transport is up right now (e.g. the relay answers for
   * a male Edge seed). False means the gender is unavailable on this device —
   * the caller must never quietly swap in the other gender instead.
   */
  playable: boolean;
}

/**
 * The ONE resolver the greeting and chat paths share: given a language and a
 * character id, return the voice that character should use.
 *
 * Order:
 *   1. the user's explicit pin for this (locale, character gender);
 *   2. otherwise the default for that gender (see defaultChoiceForGender).
 * A male character therefore never inherits a female pin, and never resolves
 * to a female speaker when only female audio exists.
 */
export function effectiveVoiceChoice(locale: string, characterId: string): EffectiveVoiceChoice {
  const requestedGender = characterVoiceGender(characterId);
  if (!isVoiceLocale(locale)) {
    return {
      id: null, choice: null, requestedGender, genderMatched: false, pinned: false, playable: false,
    };
  }
  const pin = pinTarget(voicePickFor(locale, requestedGender));
  if (pin && pin.locale === locale && pin.gender === requestedGender) {
    const pinnedChoice = voiceChoiceById(pin.id) ?? null;
    return {
      id: pin.id,
      choice: pinnedChoice,
      requestedGender,
      genderMatched: true,
      pinned: true,
      playable: pinnedChoice !== null,
    };
  }
  const choice = defaultChoiceForGender(locale, requestedGender);
  if (!choice) {
    return {
      id: null, choice: null, requestedGender, genderMatched: false, pinned: false, playable: false,
    };
  }
  return {
    id: choice.id,
    choice,
    requestedGender,
    genderMatched: choice.deliveryGender === requestedGender,
    pinned: false,
    playable: voiceChoiceById(choice.id) !== undefined,
  };
}

/** Effective voice id only — for call sites that just need the pin string. */
export function effectiveVoiceChoiceId(locale: string, characterId: string): string | null {
  return effectiveVoiceChoice(locale, characterId).id;
}

/**
 * Pin `choiceId` for that language, in the slot of its real speaker gender.
 * Returns the map now stored. An id that does not exist, or that belongs to
 * another language, is ignored. The other gender's pin is left untouched.
 */
export function saveVoicePick(locale: VoiceLocale, choiceId: string): VoicePickMap {
  const current = { ...hydrate() };
  const target = pinTarget(choiceId);
  if (!target || target.locale !== locale) return current;
  current[locale] = { ...current[locale], [target.gender]: target.id };
  persist(current);
  return current;
}

/** Test isolation. Also clears the migrated v1 payload and the dead Edge key. */
export function resetVoicePicks(): void {
  memory = {};
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(KEY);
    localStorage.removeItem(FLAT_KEY);
    localStorage.removeItem(DEAD_KEY);
  } catch { /* ignore */ }
}
