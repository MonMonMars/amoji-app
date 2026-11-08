// Which of the genuinely different voices the user picked, per language.
//
// This replaced an earlier map that stored Edge neural short names (e.g.
// `en-US-AriaNeural`) under a male/female slot. That pin recorded a choice
// that no longer had any audible effect: the Edge read-aloud endpoint refuses
// this app, so all 58 short names and both gender slots resolved to the same
// fallback speaker. Storing them kept the UI asserting a difference that did
// not exist.
//
// A pin now names one real speaker: a Google Translate `tl` region, which is
// the only handle that still changes the sound. There is no gender slot,
// because the live voices are not gendered — a language simply has one or a
// few distinct speakers.
//
// The old storage key is deleted on read rather than migrated: ten Edge short
// names shared a single voice, so there is no truthful one-to-one mapping.

import {
  isVoiceLocale,
  resolveVoiceChoiceId,
  voiceChoiceById,
  voiceChoicesFor,
  type VoiceChoice,
} from './voice-capability';
import type { VoiceLocale } from './voice-catalog';

const KEY = 'amoji.voiceChoices.v1';
/** Predecessor key: Edge short names in gender slots. Cleared, never migrated. */
const LEGACY_KEY = 'amoji.voicePicks.v2';

export type VoicePickMap = Partial<Record<VoiceLocale, string>>;

let memory: VoicePickMap = {};
let loaded = false;

function sanitize(raw: unknown): VoicePickMap {
  if (!raw || typeof raw !== 'object') return {};
  const out: VoicePickMap = {};
  for (const [locale, id] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof id !== 'string' || !isVoiceLocale(locale)) continue;
    const resolved = resolveVoiceChoiceId(id) ?? id;
    const hit = voiceChoiceById(resolved);
    if (hit && hit.locale === locale) out[locale] = hit.id;
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
    if (raw) memory = sanitize(JSON.parse(raw));
    if (localStorage.getItem(LEGACY_KEY) !== null) localStorage.removeItem(LEGACY_KEY);
  } catch { /* ignore */ }
  return memory;
}

export function loadVoicePicks(): VoicePickMap {
  return hydrate();
}

/** Pinned choice id for this language, or null to use the language default. */
export function voicePickFor(locale: string): string | null {
  if (!isVoiceLocale(locale)) return null;
  return hydrate()[locale] ?? null;
}

/** The choice to highlight for this language. Never null. */
export function activeVoiceChoice(locale: VoiceLocale): VoiceChoice {
  const pinned = voiceChoiceById(voicePickFor(locale));
  if (pinned && pinned.locale === locale) return pinned;
  return voiceChoicesFor(locale)[0] ?? voiceChoiceById('gtts:en-US:f')!;
}

/**
 * Pin `choiceId` for that language. Returns the map now stored. An id that
 * does not exist, or that belongs to another language, is ignored.
 */
export function saveVoicePick(locale: VoiceLocale, choiceId: string): VoicePickMap {
  const current = { ...hydrate() };
  const hit = voiceChoiceById(choiceId);
  if (!hit || hit.locale !== locale) return current;
  current[locale] = hit.id;
  persist(current);
  return current;
}

/** Test isolation. Also clears the legacy Edge-pin key. */
export function resetVoicePicks(): void {
  memory = {};
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* ignore */ }
}
