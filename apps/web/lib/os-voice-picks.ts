// Which OS voice the user pinned for a language + gender.
//
// The Google Translate tier cannot be gendered — one `tl` code is one speaker —
// so a male companion and a female companion sound alike there. On Windows and
// macOS the OS ships several real voices per language, and THAT is where a
// gender choice becomes real. This store records the user's pick so chat honours
// it instead of falling back to the name-matching matrix.
//
// Kept separate from voice-picks.ts on purpose: that file's ids are Google `tl`
// regions, and an OS voice id is a device-local name. Mixing them would let a
// stale gtts id and a stale OS name collide in the same map.
//
// A pin survives a device that no longer has that voice: the read path returns
// the name, and the caller checks it against the live list before using it. A
// missing voice therefore degrades to the matrix pick rather than silence.

import type { InferredGender } from './browser-voices';
import type { VoiceLocale } from './voice-catalog';

const KEY = 'amoji.osVoice.v1';

export type OsVoiceGender = Exclude<InferredGender, 'unknown'>;

export interface OsVoicePin {
  /** The SpeechSynthesisVoice.name exactly as the device reported it. */
  name: string;
  /** Locale tag it was pinned from, so a device change is detectable. */
  lang: string;
}

export type OsVoicePinMap = Partial<Record<VoiceLocale, Partial<Record<OsVoiceGender, OsVoicePin>>>>;

let memory: OsVoicePinMap = {};
let loaded = false;

function isLocale(v: string): v is VoiceLocale {
  return v === 'yue' || v === 'zh' || v === 'ja' || v === 'en';
}

function isGender(v: string): v is OsVoiceGender {
  return v === 'female' || v === 'male';
}

function sanitize(raw: unknown): OsVoicePinMap {
  if (!raw || typeof raw !== 'object') return {};
  const out: OsVoicePinMap = {};
  for (const [locale, perGender] of Object.entries(raw as Record<string, unknown>)) {
    if (!isLocale(locale) || !perGender || typeof perGender !== 'object') continue;
    const bucket: Partial<Record<OsVoiceGender, OsVoicePin>> = {};
    for (const [gender, pin] of Object.entries(perGender as Record<string, unknown>)) {
      if (!isGender(gender) || !pin || typeof pin !== 'object') continue;
      const name = (pin as { name?: unknown }).name;
      const lang = (pin as { lang?: unknown }).lang;
      if (typeof name !== 'string' || !name.trim()) continue;
      bucket[gender] = { name: name.trim(), lang: typeof lang === 'string' ? lang : '' };
    }
    if (Object.keys(bucket).length) out[locale] = bucket;
  }
  return out;
}

function hydrate(): OsVoicePinMap {
  if (loaded) return memory;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return memory;
    const raw = localStorage.getItem(KEY);
    if (raw) memory = sanitize(JSON.parse(raw));
  } catch { /* private mode */ }
  return memory;
}

function persist(next: OsVoicePinMap): void {
  memory = next;
  loaded = true;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export function loadOsVoicePins(): OsVoicePinMap {
  return { ...hydrate() };
}

/** The pinned OS voice for this language + gender, or null. */
export function osVoicePinFor(locale: string, gender: OsVoiceGender): OsVoicePin | null {
  if (!isLocale(locale)) return null;
  return hydrate()[locale]?.[gender] ?? null;
}

/** Pin one OS voice. An empty name clears that slot instead of storing junk. */
export function saveOsVoicePin(locale: VoiceLocale, gender: OsVoiceGender, name: string, lang = ''): OsVoicePinMap {
  const current: OsVoicePinMap = { ...hydrate() };
  const bucket = { ...(current[locale] ?? {}) };
  const trimmed = String(name || '').trim();
  if (!trimmed) delete bucket[gender];
  else bucket[gender] = { name: trimmed, lang };
  if (Object.keys(bucket).length) current[locale] = bucket;
  else delete current[locale];
  persist(current);
  return { ...current };
}

/** Drop this language's pins (a device swap should not leave a dead name behind). */
export function clearOsVoicePinsFor(locale: VoiceLocale): OsVoicePinMap {
  const current = { ...hydrate() };
  delete current[locale];
  persist(current);
  return { ...current };
}

/** Test isolation. */
export function resetOsVoicePins(): void {
  memory = {};
  loaded = true;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}
