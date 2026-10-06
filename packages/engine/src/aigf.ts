// ─────────────────────────────────────────────────────────────────────────────
// @amoji/engine — .aigf companion card support.
// The .aigf standard (shipped in the Amoji B2C app, r2026-10-05.122) is the
// "plug and go" soul file: personality, voice, language, memory and history
// in one JSON document. Here we parse it *portably* — no localStorage, no
// window — so a robot stack (Node on a Jetson, Python bridge, kiosk) can
// load a user's companion and let the same soul drive the new body.
// ─────────────────────────────────────────────────────────────────────────────

import type { CharacterConfig } from './characters';

export const AIGF_FORMAT = 'amoji-companion';
export const AIGF_VERSION = 1;

export interface AigfCard {
  format: typeof AIGF_FORMAT;
  version: number;
  exportedAt: string;
  app: string;
  identity: {
    characterId: string;
    name: string;
    gender: 'female' | 'male';
    persona: string;
    catchphrase: string[];
  };
  appearance: {
    accentColor: string;
    backgroundId: string;
    modelHint: string;
  };
  voice: {
    engineConfig: Record<string, unknown>;
    lang: string;
  };
  human: { name?: string; [k: string]: unknown };
  memory: unknown;
  history: Array<{ role?: string; text?: string; [k: string]: unknown }>;
  settings: { kidMode: boolean };
}

/** strict-ish validation — anything malformed throws with a readable reason */
export function parseAigf(text: string): AigfCard {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('aigf: not JSON'); }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('aigf: not an object');
  const f = raw as Partial<AigfCard>;
  if (f.format !== AIGF_FORMAT) throw new Error('aigf: wrong format');
  if (typeof f.version !== 'number' || f.version > AIGF_VERSION) throw new Error('aigf: unsupported version');
  if (typeof f.identity?.characterId !== 'string' || f.identity.characterId.length === 0) throw new Error('aigf: missing identity');
  if (!Array.isArray(f.history)) throw new Error('aigf: missing history');
  return f as AigfCard;
}

/**
 * Fold a companion card into a CharacterConfig the engine can run.
 * Memory/history stay opaque — the licensee's own brain decides how to use
 * them (their LLM prompt, their store); Amoji carries the personality.
 */
export function characterFromAigf(card: AigfCard): CharacterConfig {
  const persona = (card.identity.persona ?? '').toLowerCase();
  // light personality inference from the persona blurb — the B2C app writes
  // richer personas; this keeps the robot side usable without it.
  const cheerful = /cheer|sunny|sweet|warm|樂觀|開朗|溫柔/.test(persona) ? 0.8
    : /calm|quiet|gentle|沉靜|溫和/.test(persona) ? 0.4
    : /mischief|playful|調皮|活潑/.test(persona) ? 0.6
    : 0.5;
  const energetic = /energetic|bubbly|hyper|活潑|精力/.test(persona) ? 0.8
    : /calm|serene|沉靜|文靜/.test(persona) ? -0.5
    : 0.2;
  const base: CharacterConfig = {
    id: `aigf:${card.identity.characterId}`,
    name: card.identity.name || card.identity.characterId,
    cheerfulness: cheerful,
    energy: energetic,
    pokeReactions: card.identity.catchphrase.length > 0
      ? [...card.identity.catchphrase]
      : ['Oh! 吓我一跳！', 'Hey~ 唔好整我啦。'],
    idleEmotions: [
      { id: 'contentment', weight: 3 },
      { id: 'joy', weight: 2 },
      { id: 'love', weight: 1 },
    ],
    idleChatter: [],
    language: ['yue', 'zh', 'ja', 'en'].includes(card.voice?.lang) ? card.voice.lang : 'yue',
  };
  return base;
}

/** convenience: raw card text → engine-ready config (throws on malformed) */
export function loadAigfCharacter(text: string): CharacterConfig {
  return characterFromAigf(parseAigf(text));
}
