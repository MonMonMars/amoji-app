'use client';
// Auto personality. No hand-written id → personality table.
// A stable hash of the character id picks a tag from the gender pool, then
// localStorage keeps that choice so it does not drift across sessions.
// Male and female pools are disjoint, so movement, idles, and dialogue differ.

import { characterById } from './prefs';
import type { Lang } from './prefs';

export const FEMALE_PERSONALITIES = ['sunny', 'shy', 'playful', 'gentle', 'dreamy', 'spark'] as const;
export const MALE_PERSONALITIES = ['steady', 'cool', 'warm', 'quiet', 'sporty', 'wry'] as const;
export type PersonalityId = (typeof FEMALE_PERSONALITIES)[number] | (typeof MALE_PERSONALITIES)[number];

const CACHE_KEY = 'amoji.personality.v1';

export interface PersonalityMotion {
  /** VRMA playback scale. Lower = softer movement. */
  timeScale: number;
  /** preferred idle clip ids, front of the playlist */
  idleClips: string[];
  /** procedural idle pose ids (vrm-renderer IDLE_POSES) */
  poses: string[];
  twist: 'playful' | 'startled' | 'unimpressed' | 'flustered' | 'challenging';
  face: 'happy' | 'surprised' | 'relaxed';
  squash: number;
}

const MOTION: Record<PersonalityId, PersonalityMotion> = {
  sunny:   { timeScale: 1,    idleClips: ['WeightShift', 'LookAround', 'IdleNeutral', 'Relax'], poses: ['bouncy', 'stretchUp', 'lookUp', 'weightShift', 'leanIn'], twist: 'playful', face: 'happy', squash: 0.08 },
  shy:     { timeScale: 0.76, idleClips: ['Relax', 'Thinking', 'IdleNeutral', 'StandardIdle'], poses: ['calmHug', 'fidget', 'headTilt', 'toeShift', 'swaySoft'], twist: 'flustered', face: 'surprised', squash: 0.06 },
  playful: { timeScale: 0.96, idleClips: ['LookAround', 'WeightShift', 'IdleNeutral', 'Relax'], poses: ['bouncy', 'leanIn', 'headTilt', 'shoulderShrug', 'toeShift'], twist: 'playful', face: 'happy', squash: 0.09 },
  gentle:  { timeScale: 0.8,  idleClips: ['Relax', 'IdleNeutral', 'StandardIdle', 'Thinking'], poses: ['swaySoft', 'calmHug', 'dreamyTilt', 'headTilt', 'handsBehind'], twist: 'flustered', face: 'happy', squash: 0.05 },
  dreamy:  { timeScale: 0.78, idleClips: ['Thinking', 'Relax', 'IdleNeutral', 'LookAround'], poses: ['stargaze', 'daydream', 'dreamyTilt', 'lookUp', 'swaySoft'], twist: 'startled', face: 'relaxed', squash: 0.05 },
  spark:   { timeScale: 1,    idleClips: ['WeightShift', 'LookAround', 'IdleNeutral', 'Thinking'], poses: ['readyStance', 'bouncy', 'stretchSide', 'handsOnHips', 'lookUp'], twist: 'playful', face: 'happy', squash: 0.09 },
  steady:  { timeScale: 0.88, idleClips: ['IdleNeutral', 'LookAround', 'StandardIdle', 'Relax'], poses: ['stand', 'readyStance', 'handsOnHips', 'weightShift', 'lookAround'], twist: 'playful', face: 'happy', squash: 0.04 },
  cool:    { timeScale: 0.86, idleClips: ['IdleNeutral', 'LookAround', 'Relax', 'Thinking'], poses: ['guardCross', 'stand', 'lookAround', 'handsBehind', 'confidentLean'], twist: 'unimpressed', face: 'relaxed', squash: 0.04 },
  warm:    { timeScale: 0.9,  idleClips: ['Relax', 'WeightShift', 'IdleNeutral', 'LookAround'], poses: ['swaySoft', 'handsOnHips', 'shoulderShrug', 'leanIn', 'headTilt'], twist: 'playful', face: 'happy', squash: 0.06 },
  quiet:   { timeScale: 0.76, idleClips: ['Thinking', 'Relax', 'IdleNeutral', 'StandardIdle'], poses: ['chinStroke', 'handsBehind', 'stand', 'daydream', 'lookAround'], twist: 'flustered', face: 'relaxed', squash: 0.04 },
  sporty:  { timeScale: 1,    idleClips: ['WeightShift', 'LookAround', 'IdleNeutral', 'Relax'], poses: ['readyStance', 'stretchUp', 'stretchSide', 'bouncy', 'weightShift'], twist: 'challenging', face: 'happy', squash: 0.07 },
  wry:     { timeScale: 0.9,  idleClips: ['LookAround', 'IdleNeutral', 'Relax', 'Thinking'], poses: ['confidentLean', 'handsOnHips', 'lookAround', 'shoulderShrug', 'stand'], twist: 'playful', face: 'surprised', squash: 0.05 },
};

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function poolFor(gender: 'female' | 'male'): readonly PersonalityId[] {
  return gender === 'male' ? MALE_PERSONALITIES : FEMALE_PERSONALITIES;
}

function readCache(): Record<string, string> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}

function writeCache(id: string, personality: PersonalityId): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const all = readCache();
    all[id] = personality;
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

/** First visit hashes id+gender into that gender's pool, then caches it. */
export function personalityFor(characterId: string, gender?: 'female' | 'male'): PersonalityId {
  const g = gender ?? characterById(characterId).gender;
  const pool = poolFor(g);
  const cached = readCache()[characterId];
  if (cached && (pool as readonly string[]).includes(cached)) return cached as PersonalityId;
  const id = pool[hashId(`${g}:${characterId}`) % pool.length]!;
  writeCache(characterId, id);
  return id;
}

export function personalityMotion(characterId: string, gender?: 'female' | 'male'): PersonalityMotion & { id: PersonalityId } {
  const id = personalityFor(characterId, gender);
  return { id, ...MOTION[id] };
}

export function orderIdleClips(available: string[], characterId: string, gender?: 'female' | 'male'): string[] {
  const pref = personalityMotion(characterId, gender).idleClips;
  const front = pref.filter((id) => available.includes(id));
  const rest = available.filter((id) => !front.includes(id));
  return [...front, ...rest];
}

const BLURB: Record<PersonalityId, string> = {
  sunny: 'bright, bouncy, and quick to laugh',
  shy: 'soft, a little shy, and sweetly funny',
  playful: 'teasing, playful, and full of giggles',
  gentle: 'warm, gentle, and lightly humorous',
  dreamy: 'dreamy, kind, and whimsically funny',
  spark: 'energetic, encouraging, and cheeky',
  steady: 'steady, kind, and dryly amused',
  cool: 'calm, cool, and quietly witty',
  warm: 'brotherly, warm, and easy with a joke',
  quiet: 'quiet, thoughtful, and softly funny',
  sporty: 'sporty, upbeat, and ready to laugh',
  wry: 'wry, relaxed, and fond of a light tease',
};

export function personalityPrompt(characterId: string, gender?: 'female' | 'male'): string {
  const id = personalityFor(characterId, gender);
  const g = gender ?? characterById(characterId).gender;
  return `Auto personality (${g}): ${id} — ${BLURB[id]}. Let this change how you move in words: rhythm, jokes, and what you notice. Stay cheerful. Often end with a question so the chat continues.`;
}

export function personalityLabel(characterId: string, gender?: 'female' | 'male'): PersonalityId {
  return personalityFor(characterId, gender);
}

export type { Lang };
