// Per companion-gender Edge voice pins. A tap on the bake-off grid saves the
// short name under the CURRENT companion's gender for that voice's language.
// Opposite gender keeps its own pin (or the cast default).
// After the cast gender re-audit, cross-gender neurals are refused: a female
// companion only pins a female neural, male only male. Bumping the storage
// key clears stale pre-audit pins that left many voices sounding wrong.

import {
  EDGE_VOICE_BUTTONS,
  isFemaleNeuralVoice,
  isMaleNeuralVoice,
  type VoiceGender,
  type VoiceLocale,
} from './voice-catalog';

const KEY = 'amoji.voicePicks.v2';

export type VoicePickMap = Partial<Record<VoiceLocale, Partial<Record<VoiceGender, string>>>>;

const LOCALES: readonly VoiceLocale[] = ['yue', 'zh', 'ja', 'en'];

let memory: VoicePickMap = {};
let loaded = false;

function isLocale(v: string): v is VoiceLocale {
  return v === 'yue' || v === 'zh' || v === 'ja' || v === 'en';
}

function knownEdgeId(id: string): boolean {
  return EDGE_VOICE_BUTTONS.some((b) => b.id === id);
}

/** Pin must match companion gender (no male neural on female slot, etc.). */
function pinMatchesGender(id: string, gender: VoiceGender): boolean {
  if (!knownEdgeId(id)) return false;
  if (gender === 'female') return isFemaleNeuralVoice(id);
  return isMaleNeuralVoice(id);
}

function sanitize(raw: unknown): VoicePickMap {
  if (!raw || typeof raw !== 'object') return {};
  const out: VoicePickMap = {};
  for (const locale of LOCALES) {
    const slot = (raw as Record<string, unknown>)[locale];
    if (!slot || typeof slot !== 'object') continue;
    const next: Partial<Record<VoiceGender, string>> = {};
    for (const gender of ['female', 'male'] as const) {
      const id = (slot as Record<string, unknown>)[gender];
      if (typeof id === 'string' && pinMatchesGender(id, gender)) next[gender] = id;
    }
    if (next.female || next.male) out[locale] = next;
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
  } catch { /* ignore */ }
  return memory;
}

export function loadVoicePicks(): VoicePickMap {
  return hydrate();
}

/** Edge short name pinned for this companion gender, or null for the cast. */
export function voicePickFor(locale: string, gender: VoiceGender): string | null {
  if (!isLocale(locale)) return null;
  const id = hydrate()[locale]?.[gender] ?? null;
  if (!id || !pinMatchesGender(id, gender)) return null;
  return id;
}

/**
 * Pin `voiceId` for the companion's gender in that language.
 * Returns the map now stored. Invalid / cross-gender ids are ignored.
 */
export function saveVoicePick(locale: VoiceLocale, companionGender: VoiceGender, voiceId: string): VoicePickMap {
  const current = { ...hydrate() };
  if (!pinMatchesGender(voiceId, companionGender)) return current;
  const slot = { ...current[locale] };
  slot[companionGender] = voiceId;
  current[locale] = slot;
  persist(current);
  return current;
}

/** Test isolation. Also clears the stored pin. */
export function resetVoicePicks(): void {
  memory = {};
  loaded = true;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}