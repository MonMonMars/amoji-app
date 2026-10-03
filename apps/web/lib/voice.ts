'use client';
// Emotional voice — ChatGPT-style prosody. Primary path: FREE neural voices via
// the Edge read-aloud endpoint (edge-tts.ts) — Cantonese 曉曼/雲龍 etc., with
// SSML pitch/rate/volume per emotion. Fallback path: the browser's own
// speechSynthesis with matched platform voices. Zero cost, zero API key.
// r2026-10-03.07: strong emotions now audibly react (giggle/sigh/gasp via
// lib/fillers), prosody swings are bigger, and speakThinkingFiller() gives the
// "hmm…" moment (with mouth movement) while the reply is still generating.
// r2026-10-03.09: speak() accepts an explicit lead tic — poke ouch cries are
// guaranteed to sound instantly instead of depending on emotion intensity.
// r2026-10-03.21: felt-mood intensity now lifts her VOICE too — 超開心 rings
// brighter and quicker, 勁攰 sinks slower and softer; plain moods (intensity
// 1) leave every delta exactly where it was.
// r2026-10-03.24: the thinking filler takes an optional mood — a sad user's
// first "hmm…" is softer and slower than a happy one's (MOOD_FILLERS).

import type { Lang } from './prefs';
import { speakEdge, stopEdge } from './edge-tts';
import { dominant, pickInterjection, pickThinkingFiller } from './fillers';
import { notifySpeaking } from './speech';

export interface VoiceChoice {
  /** BCP-47 tag to match against speechSynthesis voices */
  lang: string;
  /** preferred voice names, in priority order; substring match, case-insensitive */
  names: string[];
  basePitch: number;
  baseRate: number;
}

// Names vary by platform: Apple has the strongest zh-HK set (Sin-ji = Cantonese female,
// HiuMaan newer; Sin-ju = male). Windows/Android ship Microsoft/Google variants.
// r2026-10-03.04: extended cast (tifa/aerith/cloud/kasumi/marin/ayane/hitomi)
// gets her/his own matrix — no more falling back to Juno's female voices.
export const VOICE_MATRIX: Record<string, Partial<Record<Lang, VoiceChoice[]>>> = {
  juno: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'HiuMaan', 'Female'], basePitch: 1.1, baseRate: 1.02 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 1.1, baseRate: 1.0 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoxiao', 'Tingting', 'Female'], basePitch: 1.08, baseRate: 0.98 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 1.08, baseRate: 0.98 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Kyoko', 'Otoya', 'Female'], basePitch: 1.06, baseRate: 1.0 },
    ],
    en: [
      { lang: 'en-US', names: ['Samantha', 'Zira', 'Ava', 'Female'], basePitch: 1.1, baseRate: 1.02 },
      { lang: 'en-GB', names: ['Kate', 'Female'], basePitch: 1.1, baseRate: 1.0 },
    ],
  },
  nova: {
    yue: [
      { lang: 'zh-HK', names: ['HiuMaan', 'Sin-ji', 'Female'], basePitch: 0.98, baseRate: 0.92 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 0.98, baseRate: 0.92 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoyi', 'Xiaoxiao', 'Female'], basePitch: 0.98, baseRate: 0.92 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 0.98, baseRate: 0.92 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Lekha', 'Female'], basePitch: 0.98, baseRate: 0.92 },
    ],
    en: [
      { lang: 'en-US', names: ['Ava', 'Samantha', 'Female'], basePitch: 1.0, baseRate: 0.92 },
      { lang: 'en-GB', names: ['Kate', 'Female'], basePitch: 1.0, baseRate: 0.92 },
    ],
  },
  blaze: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ju', 'Male'], basePitch: 0.92, baseRate: 1.04 },
      { lang: 'zh-TW', names: ['Male'], basePitch: 0.92, baseRate: 1.04 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunxi', 'Kangkang', 'Male'], basePitch: 0.92, baseRate: 1.04 },
      { lang: 'zh-TW', names: ['Male'], basePitch: 0.92, baseRate: 1.04 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Otoya', 'Male'], basePitch: 0.95, baseRate: 1.04 },
    ],
    en: [
      { lang: 'en-US', names: ['Guy', 'Daniel', 'Male'], basePitch: 0.95, baseRate: 1.04 },
      { lang: 'en-GB', names: ['Daniel', 'Male'], basePitch: 0.95, baseRate: 1.04 },
    ],
  },
  mochi: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'Female'], basePitch: 1.18, baseRate: 0.96 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 1.16, baseRate: 0.96 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoyi', 'Female'], basePitch: 1.16, baseRate: 0.95 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.14, baseRate: 0.95 },
    ],
    en: [
      { lang: 'en-US', names: ['Zira', 'Ava', 'Female'], basePitch: 1.16, baseRate: 0.96 },
    ],
  },
  kai: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ju', 'Male'], basePitch: 0.9, baseRate: 0.97 },
      { lang: 'zh-TW', names: ['Male'], basePitch: 0.9, baseRate: 0.97 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunjian', 'Yunxi', 'Male'], basePitch: 0.9, baseRate: 0.97 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Male'], basePitch: 0.92, baseRate: 0.97 },
    ],
    en: [
      { lang: 'en-US', names: ['Guy', 'Daniel', 'Male'], basePitch: 0.92, baseRate: 0.97 },
      { lang: 'en-GB', names: ['Daniel', 'Male'], basePitch: 0.92, baseRate: 0.97 },
    ],
  },
  luna: {
    yue: [
      { lang: 'zh-HK', names: ['HiuMaan', 'Sin-ji', 'Female'], basePitch: 1.02, baseRate: 0.86 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 1.02, baseRate: 0.86 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoyi', 'Female'], basePitch: 1.0, baseRate: 0.86 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.0, baseRate: 0.86 },
    ],
    en: [
      { lang: 'en-US', names: ['Ava', 'Female'], basePitch: 1.03, baseRate: 0.86 },
    ],
  },
  rin: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'HiuMaan', 'Female'], basePitch: 1.12, baseRate: 1.08 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 1.12, baseRate: 1.06 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaorui', 'Xiaoxiao', 'Female'], basePitch: 1.1, baseRate: 1.06 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Kyoko', 'Female'], basePitch: 1.08, baseRate: 1.06 },
    ],
    en: [
      { lang: 'en-US', names: ['Sara', 'Samantha', 'Female'], basePitch: 1.1, baseRate: 1.08 },
    ],
  },
  ren: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ju', 'Male'], basePitch: 0.96, baseRate: 0.9 },
      { lang: 'zh-TW', names: ['Male'], basePitch: 0.96, baseRate: 0.9 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunjian', 'Yunxi', 'Male'], basePitch: 0.96, baseRate: 0.9 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Male'], basePitch: 0.98, baseRate: 0.9 },
    ],
    en: [
      { lang: 'en-US', names: ['Eric', 'Daniel', 'Male'], basePitch: 0.98, baseRate: 0.9 },
      { lang: 'en-GB', names: ['Daniel', 'Male'], basePitch: 0.98, baseRate: 0.9 },
    ],
  },
  // ---- extended cast (r2026-10-03.04): gender-correct, personality-tuned ----
  // athletic, warm-hearted — bright, steady, a little quicker
  tifa: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'HiuMaan', 'Female'], basePitch: 1.06, baseRate: 1.0 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaorui', 'Xiaoxiao', 'Female'], basePitch: 1.06, baseRate: 1.0 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.05, baseRate: 1.0 },
    ],
    en: [
      { lang: 'en-US', names: ['Sara', 'Samantha', 'Female'], basePitch: 1.07, baseRate: 1.02 },
    ],
  },
  // gentle flower girl — soft, unhurried, warm
  aerith: {
    yue: [
      { lang: 'zh-HK', names: ['HiuMaan', 'Sin-ji', 'Female'], basePitch: 1.06, baseRate: 0.92 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoyi', 'Female'], basePitch: 1.06, baseRate: 0.92 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.05, baseRate: 0.92 },
    ],
    en: [
      { lang: 'en-US', names: ['Michelle', 'Ava', 'Female'], basePitch: 1.06, baseRate: 0.92 },
    ],
  },
  // cool mercenary — finally MALE: low, level, unhurried
  cloud: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ju', 'Male'], basePitch: 0.88, baseRate: 0.95 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunxi', 'Yunjian', 'Male'], basePitch: 0.88, baseRate: 0.95 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Male'], basePitch: 0.9, baseRate: 0.95 },
    ],
    en: [
      { lang: 'en-US', names: ['Christopher', 'Guy', 'Male'], basePitch: 0.9, baseRate: 0.95 },
    ],
  },
  // graceful shinobi — composed, precise, quiet
  kasumi: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'Female'], basePitch: 1.02, baseRate: 0.9 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaohan', 'Female'], basePitch: 1.0, baseRate: 0.9 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.0, baseRate: 0.9 },
    ],
    en: [
      { lang: 'en-US', names: ['Aria', 'Female'], basePitch: 1.02, baseRate: 0.9 },
    ],
  },
  // bubbly gyaru — highest pitch, fastest chatter
  marin: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'Female'], basePitch: 1.16, baseRate: 1.06 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoyi', 'Female'], basePitch: 1.15, baseRate: 1.06 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.13, baseRate: 1.06 },
    ],
    en: [
      { lang: 'en-US', names: ['Jenny', 'Female'], basePitch: 1.15, baseRate: 1.08 },
    ],
  },
  // cool kunoichi — level, a touch low, clipped
  ayane: {
    yue: [
      { lang: 'zh-HK', names: ['HiuMaan', 'Female'], basePitch: 0.96, baseRate: 0.98 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaohan', 'Female'], basePitch: 0.96, baseRate: 0.98 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 0.95, baseRate: 0.98 },
    ],
    en: [
      { lang: 'en-US', names: ['Aria', 'Female'], basePitch: 0.97, baseRate: 0.98 },
    ],
  },
  // earnest and wholesome — warm, clear, dependable
  hitomi: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ji', 'Female'], basePitch: 1.08, baseRate: 0.95 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaoxiao', 'Female'], basePitch: 1.07, baseRate: 0.95 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.06, baseRate: 0.95 },
    ],
    en: [
      { lang: 'en-US', names: ['Michelle', 'Female'], basePitch: 1.08, baseRate: 0.95 },
    ],
  },
};

/** Emotion → prosody for the browser-TTS fallback path (multipliers). */
const EMOTION_PROSODY: Record<string, { pitch: number; rate: number; vol: number }> = {
  joy: { pitch: 1.2, rate: 1.12, vol: 1.0 },
  excitement: { pitch: 1.26, rate: 1.18, vol: 1.1 },
  love: { pitch: 1.1, rate: 0.88, vol: 0.95 },
  contentment: { pitch: 1.06, rate: 0.9, vol: 0.92 },
  relief: { pitch: 1.03, rate: 0.94, vol: 0.9 },
  sadness: { pitch: 0.78, rate: 0.82, vol: 0.8 },
  shame: { pitch: 0.82, rate: 0.84, vol: 0.78 },
  guilt: { pitch: 0.84, rate: 0.88, vol: 0.8 },
  boredom: { pitch: 0.92, rate: 0.88, vol: 0.82 },
  anger: { pitch: 0.88, rate: 1.1, vol: 1.15 },
  contempt: { pitch: 0.88, rate: 0.94, vol: 0.95 },
  disgust: { pitch: 0.86, rate: 1.0, vol: 1.0 },
  fear: { pitch: 1.18, rate: 1.14, vol: 0.92 },
  surprise: { pitch: 1.34, rate: 1.14, vol: 1.08 },
  embarrassment: { pitch: 1.1, rate: 0.94, vol: 0.9 },
  pride: { pitch: 1.12, rate: 0.98, vol: 1.04 },
  jealousy: { pitch: 0.92, rate: 0.94, vol: 0.9 },
  confusion: { pitch: 1.08, rate: 0.9, vol: 0.9 },
  neutral: { pitch: 1.0, rate: 1.0, vol: 1.0 },
};

/** Emotion → SSML prosody for the neural path (deltas: rate/pitch fraction, volume dB). */
const NEURAL_PROSODY: Record<string, { rate: number; pitch: number; vol: number }> = {
  joy: { rate: 0.1, pitch: 0.1, vol: 0.12 },
  excitement: { rate: 0.2, pitch: 0.15, vol: 0.24 },
  love: { rate: -0.07, pitch: 0.04, vol: -0.05 },
  contentment: { rate: -0.07, pitch: 0.0, vol: -0.1 },
  relief: { rate: -0.05, pitch: 0.0, vol: -0.1 },
  sadness: { rate: -0.18, pitch: -0.08, vol: -0.24 },
  shame: { rate: -0.12, pitch: -0.05, vol: -0.24 },
  guilt: { rate: -0.1, pitch: -0.04, vol: -0.22 },
  boredom: { rate: -0.1, pitch: -0.03, vol: -0.18 },
  anger: { rate: 0.1, pitch: -0.05, vol: 0.24 },
  contempt: { rate: -0.04, pitch: -0.04, vol: 0.0 },
  disgust: { rate: 0.0, pitch: -0.05, vol: 0.06 },
  fear: { rate: 0.14, pitch: 0.12, vol: -0.06 },
  surprise: { rate: 0.12, pitch: 0.22, vol: 0.18 },
  embarrassment: { rate: -0.05, pitch: 0.05, vol: -0.1 },
  pride: { rate: 0.0, pitch: 0.07, vol: 0.06 },
  jealousy: { rate: -0.03, pitch: -0.03, vol: -0.06 },
  confusion: { rate: -0.06, pitch: 0.06, vol: -0.1 },
  neutral: { rate: 0, pitch: 0, vol: 0 },
};

const FEMALE_CHARS = new Set([
  'juno', 'nova', 'mochi', 'luna', 'rin',
  'tifa', 'aerith', 'kasumi', 'marin', 'ayane', 'hitomi',
]);

/**
 * Per-character vocal expressiveness — how strongly the pitch contour and
 * emotion deltas swing. Bubbly characters warble more, calm ones stay level.
 */
const EXPRESSIVENESS: Record<string, number> = {
  mochi: 1.4,
  marin: 1.38,
  rin: 1.35,
  blaze: 1.3,
  juno: 1.25,
  tifa: 1.22,
  luna: 1.2,
  hitomi: 1.15,
  aerith: 1.12,
  cloud: 0.95,
  kasumi: 0.95,
  kai: 0.95,
  ayane: 0.9,
  ren: 0.9,
  nova: 0.85,
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

// ---- voice cache (speechSynthesis.getVoices() populates async on some browsers) ----
let cached: SpeechSynthesisVoice[] = [];
const refresh = () => { cached = typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : []; };
if (typeof speechSynthesis !== 'undefined') {
  refresh();
  speechSynthesis.onvoiceschanged = refresh;
}

function pickVoice(characterId: string, lang: Lang): { voice: SpeechSynthesisVoice | null; pitch: number; rate: number } {
  refresh();
  const choices = VOICE_MATRIX[characterId]?.[lang] ?? VOICE_MATRIX['juno']![lang] ?? [];
  for (const c of choices) {
    const byLang = cached.filter((v) => v.lang.replace('_', '-').startsWith(c.lang));
    for (const name of c.names) {
      const hit = byLang.find((v) => v.name.toLowerCase().includes(name.toLowerCase()));
      if (hit) return { voice: hit, pitch: c.basePitch, rate: c.baseRate };
    }
    // named voices absent — any voice of that locale still beats the default
    if (byLang.length && c.names.some((n) => /female|male/i.test(n))) {
      const wantFemale = /female/i.test(c.names.join(' '));
      const gendered = byLang.find((v) => wantFemale ? /female|sin-ji|hiu|xia|nanami|mei|kate|samantha|ava|zira/i.test(v.name) : /male|sin-ju|yunxi|keita|guy|daniel/i.test(v.name));
      if (gendered) return { voice: gendered, pitch: c.basePitch, rate: c.baseRate };
      return { voice: byLang[0]!, pitch: c.basePitch, rate: c.baseRate };
    }
  }
  return { voice: null, pitch: 1, rate: 1 };
}

// Split into breath-sized clauses so the pitch contour can rise and fall inside a
// sentence — the sing-song quality that makes ChatGPT's voice feel alive.
function clauses(text: string): string[] {
  return text
    .split(/(?<=[。！？!?；;，,、—…\.])\s*|(?<=[。！？!?…\.])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const MUTE_KEY = 'amoji.voice.v1';
const NEURAL_KEY = 'amoji.neural.v1';

export function voiceEnabled(): boolean {
  try { return localStorage.getItem(MUTE_KEY) !== 'off'; } catch { return true; }
}
export function setVoiceEnabled(on: boolean): void {
  try { localStorage.setItem(MUTE_KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
  if (!on) stopSpeaking();
}

/** Neural (edge-tts) voices on/off — default on, auto-falls back per-utterance. */
export function neuralEnabled(): boolean {
  try { return localStorage.getItem(NEURAL_KEY) !== 'off'; } catch { return true; }
}
export function setNeuralEnabled(on: boolean): void {
  try { localStorage.setItem(NEURAL_KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
  if (!on) stopEdge();
}

export function stopSpeaking(): void {
  stopEdge();
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

/**
 * Short "hmm…" moment while the reply is still generating — ChatGPT does this
 * and it makes the character feel like she's actually thinking, not loading.
 * The mouth moves with the filler; the reply speech cuts it off automatically.
 * r2026-10-03.24: an optional felt mood tints the filler text itself (the
 * face/orb already wear the mood via applyLlmHints in the caller).
 */
export function speakThinkingFiller(characterId: string, lang: Lang, mood?: string): void {
  if (!voiceEnabled()) return;
  const filler = pickThinkingFiller(lang, mood);
  notifySpeaking(filler);
  speak(filler, characterId, lang, { confusion: 0.45, neutral: 0.3 });
}

/** A leading vocal tic (text + relative pitch/rate lift). */
export interface VocalLead {
  text: string;
  /** pitch multiplier, roughly -0.3..0.5 (synth: ×(1+pitch); neural: SSML delta) */
  pitch: number;
  /** rate multiplier, roughly -0.3..0.5 */
  rate: number;
}

/** Speak a reply with ChatGPT-style emotional prosody. Caller gates on voiceEnabled(). */
export function speak(
  text: string,
  characterId: string,
  lang: Lang,
  emotionHints?: Record<string, number>,
  leadOverride?: VocalLead,
  intensity = 1,
): void {
  if (!voiceEnabled()) return;
  const { emotion, value } = dominant(emotionHints);
  const expr = EXPRESSIVENESS[characterId] ?? 1;
  const exprScale = 0.8 + 0.2 * expr; // expressive characters feel emotions harder
  // amplified feelings push pitch/energy further (intensity 1.5 → +25% swing);
  // plain moods (intensity 1) leave every delta exactly where it was
  const amp = 1 + 0.5 * Math.max(0, intensity - 1);
  // strong feelings get an audible tic (giggle/sigh/gasp) before the words —
  // unless the caller supplies its own lead (e.g. a guaranteed poke ouch)
  const tic = leadOverride ?? pickInterjection(emotion, value, lang);

  // 1) Neural path (free server-grade voices, SSML prosody per emotion)
  if (neuralEnabled() && typeof WebSocket !== 'undefined') {
    const np = NEURAL_PROSODY[emotion] ?? NEURAL_PROSODY['neutral']!;
    speakEdge(text, {
      lang,
      gender: FEMALE_CHARS.has(characterId) ? 'female' : 'male',
      character: characterId,
      expressiveness: expr,
      lead: tic,
      rateDelta: clamp(np.rate * exprScale * amp, -0.4, 0.5),
      pitchDelta: clamp(np.pitch * exprScale * amp, -0.3, 0.4),
      volumeDelta: clamp(np.vol * exprScale * amp, -0.5, 0.5),
    }).catch(() => {
      // endpoint unreachable — one-shot fallback to the browser voice
      stopEdge();
      synthSpeak(text, characterId, lang, emotion, expr, tic, amp);
    });
    return;
  }

  // 2) Browser-TTS fallback
  synthSpeak(text, characterId, lang, emotion, expr, tic, amp);
}

function synthSpeak(
  text: string,
  characterId: string,
  lang: Lang,
  emotion: string,
  expr: number,
  tic?: { text: string; pitch: number; rate: number },
  amp = 1,
): void {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel(); // one speaker at a time

  const { voice, pitch: basePitch, rate: baseRate } = pickVoice(characterId, lang);
  const em = EMOTION_PROSODY[emotion] ?? EMOTION_PROSODY['neutral']!;
  // amplify the multipliers around 1 so intensity 1 is an exact no-op
  // (joy 1.2 → 1.25 at intensity 1.5; sadness 0.78 → 0.725 sinks further)
  const emPitch = 1 + (em.pitch - 1) * amp;
  const emRate = 1 + (em.rate - 1) * amp;
  const emVol = 1 + (em.vol - 1) * amp;
  const pitch = clamp(basePitch * emPitch, 0.4, 2);
  const rate = clamp(baseRate * emRate, 0.6, 1.6);
  const vol = clamp(emVol, 0.4, 1);

  const parts = clauses(text);
  const utterances: SpeechSynthesisUtterance[] = [];
  if (tic) {
    const t = new SpeechSynthesisUtterance(tic.text);
    if (voice) t.voice = voice;
    t.pitch = clamp(pitch * (1 + tic.pitch), 0.4, 2);
    t.rate = clamp(rate * (1 + tic.rate), 0.6, 1.6);
    t.volume = vol;
    utterances.push(t);
  }
  // Warm contour: statements drift down then settle; questions rise at the tail.
  const rising = /[？?]\s*$/.test(text);
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? (lang === 'yue' ? 'zh-HK' : lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US');
    const contour = parts.length > 1
      ? 1 + 0.06 * expr * Math.sin((i / (parts.length - 1)) * Math.PI * (rising ? 1 : 0.7))
      : 1;
    const isTail = i === parts.length - 1;
    const tailLift = isTail && rising ? 1.12 : isTail && !rising ? 0.94 : 1;
    u.pitch = clamp(pitch * contour * tailLift, 0.4, 2);
    u.rate = isTail ? clamp(rate * 0.96, 0.6, 1.6) : rate;
    u.volume = vol;
    utterances.push(u);
  });
  for (const u of utterances) speechSynthesis.speak(u);
}
