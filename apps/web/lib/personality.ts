'use client';
// Auto personality. No hand-written id → personality table.
// A stable hash of the character id picks a tag from the gender pool, then
// localStorage keeps that choice so it does not drift across sessions.
// Male and female pools are disjoint, so movement, idles, and dialogue differ.

import { CHARACTERS, characterById } from './prefs';
import type { Lang } from './prefs';
import {
  FRAME_COUNT, MOTIFS, PROMPT_HINT,
  voiceCatchphrases, voiceIdleLines, voiceOpening, voicePokeLines, voiceTone, voiceTutorLine,
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
    'Tip: tap my name plate at the top left to change me, the scene, or the language. Want to try?',
    'Tip: the gear at the top right opens settings, memory, and kid mode. Want a look?',
    'Tip: type in the box below and I will answer. What is on your mind?',
    'Tip: tap the mic to talk with your voice. Ready?',
    'Tip: poke me gently and I will react. Go on?',
    'Tip: drag to spin the camera, scroll or pinch to zoom. Give it a go?',
    'Tip: the wardrobe button swaps my look. Curious?',
    'Tip: I remember what you tell me. Want to share one small thing?',
  ],
  yue: [
    '貼士：撳左上角我個名牌，可以換我、場景或者語言。想試下嗎？',
    '貼士：右上角個齒輪係設定、記憶同小朋友模式。想睇睇嗎？',
    '貼士：喺下面個框打字，我就會答你。你諗緊咩呀？',
    '貼士：撳個咪高峰，就可以用把聲同我傾。準備好未？',
    '貼士：溫柔咁撳我，我就會有反應。試下？',
    '貼士：拖嚟轉鏡頭，滾輪或者雙指可以縮放。試下吖？',
    '貼士：衣櫃個掣可以換我個造型。想睇嗎？',
    '貼士：你同我講嘅嘢我會記得。想分享一件小事嗎？',
  ],
  zh: [
    '小提示：点左上角我的名牌，可以换我、场景或者语言。想试试吗？',
    '小提示：右上角齿轮是设置、记忆和儿童模式。想看看吗？',
    '小提示：在下面的框里打字，我就会回答。你在想什么呀？',
    '小提示：点麦克风，就可以用声音和我聊。准备好了吗？',
    '小提示：温柔地戳我，我就会有反应。试试？',
    '小提示：拖动旋转镜头，滚轮或双指可以缩放。试试看？',
    '小提示：衣柜按钮可以换我的造型。想看吗？',
    '小提示：你告诉我的事我会记得。想分享一件小事吗？',
  ],
  ja: [
    'ヒント：左上のネームプレートで私・背景・言語を変えられるよ。試す？',
    'ヒント：右上の歯車は設定、記憶、キッズモード。見てみる？',
    'ヒント：下の欄に文字を入れると答えるよ。何を考えてる？',
    'ヒント：マイクを押せば声で話せるよ。準備はいい？',
    'ヒント：やさしくつつくと反応するよ。やってみる？',
    'ヒント：ドラッグで回転、ホイールやピンチでズーム。試す？',
    'ヒント：ワードローブのボタンで見た目が変わるよ。見てみる？',
    'ヒント：教えてくれたことは覚えてるよ。小さなこと、一つシェアする？',
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
  const body = bank[Math.abs(n) % bank.length]!;
  return voiceTutorLine(profile.personality as VoiceId, profile.motif, profile.frame, lang, body);
}

export function personalityPrompt(characterId: string, gender?: 'female' | 'male'): string {
  const profile = personalityProfile(characterId, gender);
  const catchphrase = profile.catchphrases.en[0] ?? '';
  return `Personality profile (${profile.gender}): ${profile.personality}. Tone: ${profile.tone}. Catchphrase: "${catchphrase}" — use it naturally, translated into the user's language. Favorite wholesome topic: ${profile.motif}. ${profile.promptHint} Let this change rhythm, jokes, and what you notice. Stay cheerful, wholesome, and kid-safe. No flirting or adult topics. Often end with a question so the chat continues.`;
}

export function personalityLabel(characterId: string, gender?: 'female' | 'male'): PersonalityId {
  return personalityFor(characterId, gender);
}

export type { Lang };
