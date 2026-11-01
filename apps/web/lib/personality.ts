'use client';
// Auto personality. No hand-written id → personality table.
// A stable hash of the character id picks a tag from the gender pool, then
// localStorage keeps that choice so it does not drift across sessions.
// Male and female pools are disjoint, so movement, idles, and dialogue differ.

import { CHARACTERS, characterById } from './prefs';
import type { Lang } from './prefs';
import {
  FRAME_COUNT, MOTIFS, PROMPT_HINT,
  voiceCatchphrases, voiceIdleLines, voiceOpening, voicePokeLines, voiceTone,
  type MotifId, type VoiceId,
} from './personality-voice';

export const FEMALE_PERSONALITIES = ['sunny', 'shy', 'playful', 'gentle', 'dreamy', 'spark'] as const;
export const MALE_PERSONALITIES = ['steady', 'cool', 'warm', 'quiet', 'sporty', 'wry'] as const;
export type PersonalityId = (typeof FEMALE_PERSONALITIES)[number] | (typeof MALE_PERSONALITIES)[number];

const CACHE_KEY = 'amoji.personality.v1';
/** motif + cadence slot, one per cast member. The v1 tag stays the motion family. */
const PROFILE_CACHE_KEY = 'amoji.personality.v2';

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

// IdleBreathCalm.vrma (pixiv ChatVRM idle_loop, MIT) is the primary default
// for every personality: forward head, arms at the sides, feet planted.
// StandardIdle is the only other standing clip. LookAround, Relax, and
// WeightShift pitched the head down or swung the arms and stay off this list.
// Convert-ready, not wired yet: IdleKaykitA, IdleKaykitB, IdleQuaterniusHuman
// (see public/gallery.html and public/models/anims-fbx/README.txt).
const CALM_CLIPS = ['IdleBreathCalm', 'StandardIdle'] as const;
// Procedural fallback when no VRMA binds. Small sway and a slight head tilt
// only — hugs, hands-behind, and sky-gazing pulled the arms into the body
// or the head down.
const CALM_POSES = ['stand', 'swaySoft', 'headTilt'] as const;
const MOTION: Record<PersonalityId, PersonalityMotion> = {
  sunny:   { timeScale: 1,    idleClips: [...CALM_CLIPS], poses: [...CALM_POSES], twist: 'playful', face: 'happy', squash: 0.08 },
  shy:     { timeScale: 0.76, idleClips: [...CALM_CLIPS], poses: [...CALM_POSES], twist: 'flustered', face: 'surprised', squash: 0.06 },
  playful: { timeScale: 0.96, idleClips: [...CALM_CLIPS], poses: [...CALM_POSES], twist: 'playful', face: 'happy', squash: 0.09 },
  gentle:  { timeScale: 0.8,  idleClips: [...CALM_CLIPS], poses: [...CALM_POSES], twist: 'flustered', face: 'happy', squash: 0.05 },
  dreamy:  { timeScale: 0.78, idleClips: [...CALM_CLIPS], poses: [...CALM_POSES], twist: 'startled', face: 'relaxed', squash: 0.05 },
  spark:   { timeScale: 1,    idleClips: [...CALM_CLIPS], poses: [...CALM_POSES], twist: 'playful', face: 'happy', squash: 0.09 },
  steady:  { timeScale: 0.88, idleClips: [...CALM_CLIPS], poses: [...CALM_POSES], twist: 'playful', face: 'happy', squash: 0.04 },
  cool:    { timeScale: 0.86, idleClips: [...CALM_CLIPS], poses: [...CALM_POSES], twist: 'unimpressed', face: 'relaxed', squash: 0.04 },
  warm:    { timeScale: 0.9,  idleClips: [...CALM_CLIPS], poses: [...CALM_POSES], twist: 'playful', face: 'happy', squash: 0.06 },
  quiet:   { timeScale: 0.76, idleClips: [...CALM_CLIPS], poses: [...CALM_POSES], twist: 'flustered', face: 'relaxed', squash: 0.04 },
  sporty:  { timeScale: 1,    idleClips: [...CALM_CLIPS], poses: [...CALM_POSES], twist: 'challenging', face: 'happy', squash: 0.07 },
  wry:     { timeScale: 0.9,  idleClips: [...CALM_CLIPS], poses: [...CALM_POSES], twist: 'playful', face: 'surprised', squash: 0.05 },
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

export interface PersonalityProfile {
  characterId: string;
  gender: 'female' | 'male';
  personality: PersonalityId;
  motif: MotifId;
  frame: number;
  tone: string;
  catchphrases: Record<Lang, readonly string[]>;
  promptHint: string;
  /** canonical idle pool (torso-free). Poke lines depend on zone. */
  idleLines: Record<Lang, readonly string[]>;
}

interface ProfileSlot { m: MotifId; f: number }

function isMotif(value: unknown): value is MotifId {
  return typeof value === 'string' && (MOTIFS as readonly string[]).includes(value);
}

function isSlot(value: unknown): value is ProfileSlot {
  if (!value || typeof value !== 'object') return false;
  const slot = value as { m?: unknown; f?: unknown };
  return isMotif(slot.m) && typeof slot.f === 'number' && Number.isInteger(slot.f) && slot.f >= 0 && slot.f < FRAME_COUNT;
}

function readProfileCache(): Record<string, ProfileSlot> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, ProfileSlot> = {};
    for (const [id, slot] of Object.entries(parsed as Record<string, unknown>)) {
      if (isSlot(slot)) out[id] = slot;
    }
    return out;
  } catch {
    return {};
  }
}

function writeProfileCache(all: Record<string, ProfileSlot>): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

function rosterIds(gender: 'female' | 'male'): string[] {
  return CHARACTERS.filter((c) => c.gender === gender).map((c) => c.id).sort();
}

/** Give every roster member of this gender a unique motif+cadence, then freeze it. */
function ensureGenderSlots(gender: 'female' | 'male'): Record<string, ProfileSlot> {
  const all = readProfileCache();
  const ids = rosterIds(gender);
  const used = new Set<string>();
  for (const id of ids) {
    const slot = all[id];
    if (slot) used.add(`${slot.m}:${slot.f}`);
  }
  let cursor = 0;
  let changed = false;
  for (const id of ids) {
    if (all[id]) continue;
    let picked: ProfileSlot | null = null;
    for (let step = 0; step < MOTIFS.length * FRAME_COUNT; step++) {
      const idx = cursor++;
      const m = MOTIFS[idx % MOTIFS.length]!;
      const f = Math.floor(idx / MOTIFS.length) % FRAME_COUNT;
      const key = `${m}:${f}`;
      if (used.has(key)) continue;
      used.add(key);
      picked = { m, f };
      break;
    }
    if (!picked) {
      const h = hashId(`${gender}:${id}:voice`);
      picked = { m: MOTIFS[h % MOTIFS.length]!, f: h % FRAME_COUNT };
    }
    all[id] = picked;
    changed = true;
  }
  if (changed) writeProfileCache(all);
  return all;
}

function slotFor(characterId: string, gender: 'female' | 'male'): ProfileSlot {
  const map = ensureGenderSlots(gender);
  const hit = map[characterId];
  if (hit) return hit;
  const used = new Set(rosterIds(gender).map((id) => {
    const slot = map[id];
    return slot ? `${slot.m}:${slot.f}` : '';
  }));
  const h = hashId(`${gender}:${characterId}:voice`);
  const span = MOTIFS.length * FRAME_COUNT;
  let picked: ProfileSlot = { m: MOTIFS[h % MOTIFS.length]!, f: h % FRAME_COUNT };
  for (let step = 0; step < span; step++) {
    const idx = (h + step) % span;
    const m = MOTIFS[idx % MOTIFS.length]!;
    const f = Math.floor(idx / MOTIFS.length) % FRAME_COUNT;
    if (used.has(`${m}:${f}`)) continue;
    picked = { m, f };
    break;
  }
  const all = readProfileCache();
  all[characterId] = picked;
  writeProfileCache(all);
  return picked;
}

const POOL_LANGS: Lang[] = ['en', 'yue', 'zh', 'ja'];

/** Cached voice profile: tone, catchphrases, idle pool, and prompt hint. */
export function personalityProfile(characterId: string, gender?: 'female' | 'male'): PersonalityProfile {
  const g = gender ?? characterById(characterId).gender;
  const personality = personalityFor(characterId, g);
  const slot = slotFor(characterId, g);
  const voice = personality as VoiceId;
  const catchphrases = {} as Record<Lang, readonly string[]>;
  const idleLines = {} as Record<Lang, readonly string[]>;
  for (const lang of POOL_LANGS) {
    catchphrases[lang] = voiceCatchphrases(voice, slot.m, slot.f, lang);
    idleLines[lang] = voiceIdleLines(voice, slot.m, slot.f, lang);
  }
  return {
    characterId,
    gender: g,
    personality,
    motif: slot.m,
    frame: slot.f,
    tone: voiceTone(voice, slot.m, slot.f, BLURB[personality]),
    catchphrases,
    promptHint: PROMPT_HINT[voice],
    idleLines,
  };
}

export function profileIdleLine(characterId: string, lang: Lang, n: number, gender?: 'female' | 'male'): string {
  const pool = personalityProfile(characterId, gender).idleLines;
  const lines = pool[lang] ?? pool.en;
  return lines[Math.abs(n) % lines.length]!;
}

export function profilePokeLine(
  characterId: string,
  lang: Lang,
  n: number,
  zone = 'torso',
  gender?: 'female' | 'male',
): string {
  const profile = personalityProfile(characterId, gender);
  const lines = voicePokeLines(profile.personality as VoiceId, profile.motif, profile.frame, lang, zone);
  return lines[Math.abs(n) % lines.length]!;
}

export function profileCatchphrase(characterId: string, lang: Lang, gender?: 'female' | 'male'): string {
  const list = personalityProfile(characterId, gender).catchphrases[lang];
  return list[0] ?? '';
}

/** First spoken canned line. Matches this character's cached voice. */
export function cannedOpener(characterId: string, gender: 'female' | 'male' | undefined, lang: Lang, name: string): string {
  const profile = personalityProfile(characterId, gender);
  return voiceOpening(profile.personality as VoiceId, profile.motif, profile.frame, lang, name);
}

/** How to use the app, said in idle. Same facts, this character's voice. */
const APP_TIPS: Record<Lang, readonly string[]> = {
  en: [
    'Poke me gently and I react.',
    'Grab my hand and hold on — I will notice.',
    'Open the gear, top right, for dialogue, effects, and music volume.',
    'Tap my name plate, top left, to switch character, scene, or language.',
    'Say sing or dance and I will perform.',
    'Tap the mic and talk with your voice.',
    'Type in the box below and I answer.',
    'Drag to spin the camera. Scroll or pinch to zoom.',
  ],
  yue: [
    '溫柔咁撳我，我就會有反應。',
    '捉住我隻手唔好放——我會知道。',
    '右上角個齒輪可以調對白、音效同音樂音量。',
    '撳左上角我個名牌，可以換角色、場景或者語言。',
    '講唱歌或者跳舞，我就會表演。',
    '撳個咪高峰，就可以用把聲同我傾。',
    '喺下面個框打字，我就會答你。',
    '拖嚟轉鏡頭，滾輪或者雙指可以縮放。',
  ],
  zh: [
    '温柔地戳我，我就会有反应。',
    '抓住我的手不要放——我会知道。',
    '右上角齿轮可以调对白、音效和音乐音量。',
    '点左上角我的名牌，可以换角色、场景或者语言。',
    '说唱歌或者跳舞，我就会表演。',
    '点麦克风，就可以用声音和我聊。',
    '在下面的框里打字，我就会回答。',
    '拖动旋转镜头，滚轮或双指可以缩放。',
  ],
  ja: [
    'やさしくつつくと反応するよ。',
    '手をつかんで離さないで——気づくよ。',
    '右上の歯車でセリフ、効果音、音楽の音量を変えられるよ。',
    '左上のネームプレートでキャラ、背景、言語を切り替えられるよ。',
    '「歌って」か「踊って」と言うと披露するよ。',
    'マイクを押せば声で話せるよ。',
    '下の欄に文字を入れると答えるよ。',
    'ドラッグで回転、ホイールやピンチでズーム。',
  ],
};


export function personalityTutorTip(
  characterId: string,
  gender: 'female' | 'male' | undefined,
  lang: Lang,
  n: number,
): string {
  const profile = personalityProfile(characterId, gender);
  const bank = APP_TIPS[lang] ?? APP_TIPS.en;
  // Frame offsets the tour so two cast members do not recite the same tip beat.
  const body = bank[Math.abs(n + profile.frame) % bank.length]!;
  return body;
}

export function personalityPrompt(characterId: string, gender?: 'female' | 'male'): string {
  const profile = personalityProfile(characterId, gender);
  return `Personality profile (${profile.gender}): ${profile.personality}. Tone: ${profile.tone}. Favorite wholesome topic: ${profile.motif}. ${profile.promptHint} Let this change rhythm, jokes, and what you notice — stay this person, in the reply language. Open with a clear sentence that answers them. Do not open with a slogan, a catchphrase fragment, or a note to yourself. Finish each sentence before you start the next. Stay on their topic. Always encouraging and positive. Cheer them on. Cheerful, wholesome, and kid-safe. No flirting, cynicism, or adult topics. Never type hehe/haha/hey-hey �X laughs are SFX only. Match this personality's talking speed and catchphrase vibe without pasting a slogan. Often end with one question.`;
}

export function personalityLabel(characterId: string, gender?: 'female' | 'male'): PersonalityId {
  return personalityFor(characterId, gender);
}

export type { Lang };
