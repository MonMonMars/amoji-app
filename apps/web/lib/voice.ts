'use client';
// Emotional voice — ChatGPT-style prosody. Primary path: FREE neural voices via
// the Edge read-aloud endpoint (edge-tts.ts) — per-character cast (young female
// voices for the young female characters, real male voices for the men), with
// SSML pitch/rate/volume per emotion plus a per-clause sing-song contour.
// Fallback path: the browser's own speechSynthesis with matched platform voices.
// Zero cost, zero API key.

import type { Lang } from './prefs';
import { speakEdge, stopEdge } from './edge-tts';

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
// Young characters (Mochi) chase the youngest-sounding voices first.
const VOICE_MATRIX: Record<string, Record<Lang, VoiceChoice[]>> = {
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
      { lang: 'zh-CN', names: ['Yunyang', 'Yunxi', 'Male'], basePitch: 0.92, baseRate: 1.04 },
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
      { lang: 'en-US', names: ['Ana', 'Zira', 'Female'], basePitch: 1.16, baseRate: 0.96 },
    ],
  },
  kai: {
    yue: [
      { lang: 'zh-HK', names: ['Sin-ju', 'Male'], basePitch: 0.9, baseRate: 0.97 },
      { lang: 'zh-TW', names: ['Male'], basePitch: 0.9, baseRate: 0.97 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Yunxi', 'Yunjian', 'Male'], basePitch: 0.9, baseRate: 0.97 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Keita', 'Male'], basePitch: 0.92, baseRate: 0.97 },
    ],
    en: [
      { lang: 'en-US', names: ['Daniel', 'Guy', 'Male'], basePitch: 0.92, baseRate: 0.97 },
      { lang: 'en-GB', names: ['Daniel', 'Male'], basePitch: 0.92, baseRate: 0.97 },
    ],
  },
  luna: {
    yue: [
      { lang: 'zh-HK', names: ['HiuMaan', 'Sin-ji', 'Female'], basePitch: 1.02, baseRate: 0.86 },
      { lang: 'zh-TW', names: ['Mei-Jia', 'Female'], basePitch: 1.02, baseRate: 0.86 },
    ],
    zh: [
      { lang: 'zh-CN', names: ['Xiaomo', 'Xiaoyi', 'Female'], basePitch: 1.0, baseRate: 0.86 },
    ],
    ja: [
      { lang: 'ja-JP', names: ['Nanami', 'Female'], basePitch: 1.0, baseRate: 0.86 },
    ],
    en: [
      { lang: 'en-US', names: ['Michelle', 'Ava', 'Female'], basePitch: 1.03, baseRate: 0.86 },
    ],
  },
};

/** Emotion → prosody for the browser-TTS fallback path (multipliers). */
const EMOTION_PROSODY: Record<string, { pitch: number; rate: number; vol: number }> = {
  joy: { pitch: 1.2, rate: 1.12, vol: 1.0 },
  excitement: { pitch: 1.26, rate: 1.2, vol: 1.08 },
  love: { pitch: 1.1, rate: 0.9, vol: 0.95 },
  contentment: { pitch: 1.06, rate: 0.92, vol: 0.92 },
  relief: { pitch: 1.03, rate: 0.95, vol: 0.9 },
  sadness: { pitch: 0.8, rate: 0.83, vol: 0.82 },
  shame: { pitch: 0.84, rate: 0.85, vol: 0.8 },
  guilt: { pitch: 0.86, rate: 0.9, vol: 0.82 },
  boredom: { pitch: 0.93, rate: 0.9, vol: 0.85 },
  anger: { pitch: 0.88, rate: 1.1, vol: 1.12 },
  contempt: { pitch: 0.9, rate: 0.95, vol: 0.95 },
  disgust: { pitch: 0.86, rate: 1.0, vol: 1.0 },
  fear: { pitch: 1.16, rate: 1.14, vol: 0.92 },
  surprise: { pitch: 1.3, rate: 1.14, vol: 1.06 },
  embarrassment: { pitch: 1.1, rate: 0.95, vol: 0.9 },
  pride: { pitch: 1.12, rate: 0.98, vol: 1.02 },
  jealousy: { pitch: 0.94, rate: 0.95, vol: 0.92 },
  confusion: { pitch: 1.06, rate: 0.92, vol: 0.9 },
  neutral: { pitch: 1.0, rate: 1.0, vol: 1.0 },
};

/** Emotion → SSML prosody for the neural path (deltas: rate/pitch fraction, volume dB).
 *  Widened deltas (r2026-10-02.8) — closer to ChatGPT's audible emotional range. */
const NEURAL_PROSODY: Record<string, { rate: number; pitch: number; vol: number }> = {
  joy: { rate: 0.12, pitch: 0.12, vol: 0.14 },
  excitement: { rate: 0.22, pitch: 0.18, vol: 0.28 },
  love: { rate: -0.08, pitch: 0.05, vol: -0.06 },
  contentment: { rate: -0.09, pitch: 0.0, vol: -0.12 },
  relief: { rate: -0.06, pitch: 0.01, vol: -0.12 },
  sadness: { rate: -0.2, pitch: -0.09, vol: -0.26 },
  shame: { rate: -0.14, pitch: -0.06, vol: -0.26 },
  guilt: { rate: -0.11, pitch: -0.05, vol: -0.24 },
  boredom: { rate: -0.11, pitch: -0.03, vol: -0.2 },
  anger: { rate: 0.11, pitch: -0.06, vol: 0.26 },
  contempt: { rate: -0.04, pitch: -0.05, vol: 0.0 },
  disgust: { rate: 0.0, pitch: -0.06, vol: 0.07 },
  fear: { rate: 0.16, pitch: 0.14, vol: -0.07 },
  surprise: { rate: 0.14, pitch: 0.24, vol: 0.2 },
  embarrassment: { rate: -0.06, pitch: 0.06, vol: -0.12 },
  pride: { rate: 0.0, pitch: 0.09, vol: 0.07 },
  jealousy: { rate: -0.03, pitch: -0.03, vol: -0.07 },
  confusion: { rate: -0.07, pitch: 0.07, vol: -0.1 },
  neutral: { rate: 0, pitch: 0, vol: 0 },
};

/** Per-character animation of the pitch/rate contour — Mochi bubbles, Nova stays cool. */
const EXPRESSIVENESS: Record<string, number> = {
  juno: 1.25,
  nova: 0.85,
  mochi: 1.4,
  blaze: 1.3,
  kai: 0.95,
  luna: 1.2,
};

const FEMALE_CHARS = new Set(['juno', 'nova', 'mochi', 'luna']);

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
      const gendered = byLang.find((v) => wantFemale ? /female|sin-ji|hiu|xia|nanami|mei|kate|samantha|ava|zira|michelle/i.test(v.name) : /male|sin-ju|yunxi|yunyang|keita|guy|daniel|christopher/i.test(v.name));
      if (gendered) return { voice: gendered, pitch: c.basePitch, rate: c.baseRate };
      return { voice: byLang[0]!, pitch: c.basePitch, rate: c.baseRate };
    }
  }
  return { voice: null, pitch: 1, rate: 1 };
}

function dominantEmotion(hints?: Record<string, number>): string {
  if (!hints) return 'neutral';
  let best = 'neutral';
  let bestV = 0.35; // below this, stay neutral — avoids constant warbling
  for (const [k, v] of Object.entries(hints)) {
    if (typeof v === 'number' && v > bestV) { best = k; bestV = v; }
  }
  return best;
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

/** Speak a reply with ChatGPT-style emotional prosody. Caller gates on voiceEnabled(). */
export function speak(
  text: string,
  characterId: string,
  lang: Lang,
  emotionHints?: Record<string, number>,
): void {
  if (!voiceEnabled()) return;
  const emotion = dominantEmotion(emotionHints);
  const expr = EXPRESSIVENESS[characterId] ?? 1;

  // 1) Neural path (free server-grade voices, per-character cast, SSML prosody + contour)
  if (neuralEnabled() && typeof WebSocket !== 'undefined') {
    const np = NEURAL_PROSODY[emotion] ?? NEURAL_PROSODY['neutral']!;
    speakEdge(text, {
      lang,
      gender: FEMALE_CHARS.has(characterId) ? 'female' : 'male',
      character: characterId,
      expressiveness: expr,
      rateDelta: clamp(np.rate * (0.8 + 0.2 * expr), -0.45, 0.5),
      pitchDelta: clamp(np.pitch * (0.8 + 0.2 * expr), -0.35, 0.45),
      volumeDelta: clamp(np.vol, -0.5, 0.5),
    }).catch(() => {
      // endpoint unreachable — one-shot fallback to the browser voice
      stopEdge();
      synthSpeak(text, characterId, lang, emotion);
    });
    return;
  }

  // 2) Browser-TTS fallback
  synthSpeak(text, characterId, lang, emotion);
}

function synthSpeak(text: string, characterId: string, lang: Lang, emotion: string): void {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel(); // one speaker at a time

  const expr = EXPRESSIVENESS[characterId] ?? 1;
  const { voice, pitch: basePitch, rate: baseRate } = pickVoice(characterId, lang);
  const em = EMOTION_PROSODY[emotion] ?? EMOTION_PROSODY['neutral']!;
  const pitch = clamp(basePitch * em.pitch, 0.4, 2);
  const rate = clamp(baseRate * em.rate, 0.6, 1.6);
  const vol = clamp(em.vol, 0.4, 1);

  const parts = clauses(text);
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
    speechSynthesis.speak(u);
  });
}
