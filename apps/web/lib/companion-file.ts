'use client';
// r2026-10-05.122 — the Amoji Companion Card (.aigf): one portable file
// carrying an AI girlfriend/boyfriend's complete "soul" — identity, persona,
// voice, language, long-term memory, chat history and settings. Export on
// one device, import on any other (or any future app/robot/avatar that
// speaks the format) and the companion comes back exactly as she was.
import type { EmotionConfig } from '@amoji/emotion-core';
import { loadPrefs, savePrefs, characterById, CHARACTERS, type Prefs, type Lang } from './prefs';
import { loadHistory, saveHistory, loadConfig, type StoredMessage } from './companion-store';
import { loadMemory, clearMemory, type Memory } from './memory';
import { loadProfile, saveProfile, type Profile } from './profile';
import { patchConfig } from './companion';

export const COMPANION_FORMAT = 'amoji-companion';
export const COMPANION_VERSION = 1;
// memory.ts keeps its KEY private; the import path writes it directly so the
// whole Memory object round-trips untouched (diary, visits, everything).
const MEMORY_KEY = 'amoji.memory.v2';

export interface CompanionFile {
  format: typeof COMPANION_FORMAT;
  version: number;
  exportedAt: string;
  app: string; // exporting app + revision stamp
  identity: {
    characterId: string; // stable across apps — the primary key
    name: string; // display name at export time
    gender: 'female' | 'male';
    persona: string;
    catchphrase: string[];
  };
  appearance: {
    accentColor: string;
    backgroundId: string;
    modelHint: string; // soft — an importing app may map to its nearest body
  };
  voice: {
    engineConfig: Partial<EmotionConfig>; // expressiveness / tiers / sfx
    lang: Lang;
  };
  human: Profile; // so she still knows your name on the new device
  memory: Memory;
  history: StoredMessage[];
  settings: { kidMode: boolean };
}

/** gather every store into one card */
export function buildCompanionFile(revision: string): CompanionFile {
  const prefs = loadPrefs();
  const character = characterById(prefs.character);
  return {
    format: COMPANION_FORMAT,
    version: COMPANION_VERSION,
    exportedAt: new Date().toISOString(),
    app: `Amoji ${revision}`,
    identity: {
      characterId: character.id,
      name: character.name,
      gender: character.gender,
      persona: character.persona,
      catchphrase: [],
    },
    appearance: {
      accentColor: character.accent,
      backgroundId: prefs.background,
      modelHint: character.model ?? '',
    },
    voice: { engineConfig: loadConfig(), lang: prefs.lang },
    human: loadProfile(),
    memory: loadMemory(),
    history: loadHistory(),
    settings: { kidMode: prefs.kidMode },
  };
}

/** strict-ish validation — anything malformed throws with a readable reason */
export function parseCompanionFile(text: string): CompanionFile {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('not JSON'); }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('not an object');
  const f = raw as Partial<CompanionFile>;
  if (f.format !== COMPANION_FORMAT) throw new Error('wrong format');
  if (typeof f.version !== 'number' || f.version > COMPANION_VERSION) throw new Error('unsupported version');
  if (typeof f.identity?.characterId !== 'string' || f.identity.characterId.length === 0) throw new Error('missing identity');
  if (!Array.isArray(f.history)) throw new Error('missing history');
  return f as CompanionFile;
}

/** apply a parsed card to every store, then reload so all pages re-hydrate */
export function applyCompanionFile(f: CompanionFile): void {
  // character: keep the id if the importing app still has her, else fall
  // back to its default — the rest of the soul survives the body swap.
  const characterId = CHARACTERS.some((c) => c.id === f.identity.characterId)
    ? f.identity.characterId
    : loadPrefs().character;
  const prefs: Prefs = {
    character: characterId,
    background: f.appearance?.backgroundId ?? loadPrefs().background,
    lang: (f.voice?.lang && ['en', 'yue', 'zh', 'ja'].includes(f.voice.lang) ? f.voice.lang : 'yue') as Lang,
    kidMode: !!f.settings?.kidMode,
  };
  savePrefs(prefs);
  if (f.human && typeof f.human.name === 'string') saveProfile(f.human);
  saveHistory(f.history ?? []);
  if (f.memory && typeof f.memory === 'object') {
    clearMemory();
    try { localStorage.setItem(MEMORY_KEY, JSON.stringify(f.memory)); } catch { /* full — keep going */ }
  }
  if (f.voice?.engineConfig && typeof f.voice.engineConfig === 'object') {
    patchConfig(f.voice.engineConfig);
  }
  window.location.reload();
}

/** trigger the browser download — `${characterId}.aigf.json` */
export function downloadCompanionFile(revision: string): void {
  const card = buildCompanionFile(revision);
  const blob = new Blob([JSON.stringify(card, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${card.identity.characterId}.aigf.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
