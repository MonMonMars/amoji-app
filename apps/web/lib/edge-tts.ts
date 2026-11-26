'use client';
// Free neural TTS, straight from the browser — the Microsoft Edge read-aloud
// endpoint (the same engine behind the edge-tts project). No API key, no server,
// no cost: real emotional voices with per-character casting — Cantonese
// 曉曼 HiuMaan / 雲龍 WanLung, 中文 Xiaoxiao / Xiaoyi / Xiaohan / Xiaomo / Xiaorui /
// Yunxi / Yunyang / Yunjian, 日本語 Nanami / Keita, English Jenny / Aria / Ana /
// Michelle / Sara / Guy / Christopher / Eric — driven by SSML prosody with a
// ChatGPT-style per-clause pitch/rate contour (sing-song), punctuation-aware
// swells (! lifts, … sinks), sentence pauses, an optional leading emotional
// vocal tic (giggle/sigh/gasp), and per-character expressiveness. If the socket
// is unreachable (some networks block it), voice.ts falls back to the browser's
// speechSynthesis automatically.
// r2026-10-04.64: the sing-song contour itself got wider (0.09→0.12 per clause,
// question tail lift 1.18→1.22, ! swell 1.35→1.45) so a felt emotion warbles
// through the whole line, not just the average pitch — closer to ChatGPT's
// animated delivery while staying inside what the free prosody lever can do.
// r2026-10-03.40: optional `melody` mode — every clause becomes one note of a
// pitch contour, legato tempo, musical rests: she can actually sing.
// r2026-10-04.52: flagship nine casted (kizuna/alicia/ember/mei/atlas/sky/
// yuki/hina/mio); tifa/aerith retire.
// r2026-10-04.85: timeout 12s → 7s — when Microsoft ignores the socket (dead
// token / blocked network) the browser-voice fallback now takes over in half
// the time, so a dead endpoint reads as a voice switch, not a long silence.
import { edgeAudioPayload, edgeReadAloudUrl } from '../../../server/amoji-proxy/edge-gec.js';
import {
  ensureCompanionPlaybackRoute,
  htmlAudioStartMode,
  startHtmlAudioOnDefaultSpeakers,
} from './audio-output';
import { applyPlaybackVolume } from './playback-volume';
import { characterVoiceGender } from './voice-gender';
import { edgeVoiceId, isFemaleNeuralVoice, isMaleNeuralVoice, isShippingEdgeVoice, ssmlLangForEdgeId } from './voice-catalog';
import { edgeCastVoice } from './edge-cast';
import { clampLeadProsody, cleanForSpeech, isSpeakableText, stripVoicedSymbols } from './speak-text';
import { followAudioElement } from './speech';
import { splitClauses } from './gtts';

// r2026-10-04.89: timeout 7s → 4.5s — the Google-TTS mid tier in voice.ts now
// catches a dead socket even faster; and stopEdge() finally rejects the
// pending promise, so a line that was cut can no longer resurface seconds
// later when its timeout fires (the "old line suddenly speaks" bug).
// r2026-10-05.97: timeout 4.5s → 3.5s — the tier-1 socket is still the single
// biggest voice latency when it hangs; the Google-TTS mid tier (a real voice,
// not a last resort) takes over even faster.
// r2026-10-05.99: clauses() drops the regex lookbehind — `(?<=…)` is a hard
// SyntaxError on WebKit before Safari 16.4 (iOS 16.4), and on those devices
// it killed the whole voice module before any tier could run (the r97
// unlock/defer/watchdog never executed). Manual char scanner now. Also new:
// `onPlaying` fires the moment the returned audio actually plays, so the
// caller knows the iOS media gate is open (and reports it on the status bus).
// r2026-10-06.131: REAL EMOTION STYLES — the readaloud socket accepts
// `mstts:express-as` SSML (the edge-tts --style lever; we never sent it).
// Every style-capable cast voice gets a curated style whitelist and the
// dominant emotion resolves to the best supported style (cheerful, sad,
// angry, tender, terrified, worried, shy, calm, confused, hopeful, sorry),
// with styledegree riding expressiveness for zh voices. Ja voices ship no
// styles — they keep the widened prosody contour (unchanged). Also: optional
// HTTP TTS proxy (setTtsProxy) for networks that block the wss socket — POST
// SSML, get mp3 back; a ready-to-deploy Cloudflare Worker ships in
// server/amoji-proxy/.
// ─────────────────────────────────────────────────────────────────────────────

export interface EdgeVoiceOpts {
  /** 'yue' | 'zh' | 'ja' | 'en' */
  lang: string;
  gender: 'female' | 'male';
  /** character id — picks her/his specific voice from the cast */
  character?: string;
  /** how animated the contour is: 0.6 calm … 1.6 very bubbly (default 1) */
  expressiveness?: number;
  /** r131 — dominant emotion id; resolves to an mstts style when supported */
  emotion?: string;
  /** SSML prosody deltas — rate/pitch as fractions (-0.5..0.5), volume in dB (-1..1 → ±8dB) */
  rateDelta?: number;
  pitchDelta?: number;
  volumeDelta?: number;
  /** leading emotional vocal tic (giggle, sigh, gasp) with its own prosody */
  lead?: { text: string; pitch: number; rate: number };
  /**
   * Exact Edge short name from the bake-off picker. Skips the cast and the
   * gender floor so a deliberate cross-gender tap is what plays.
   */
  voiceId?: string;
  /** Highlight / probe path: ignore a saved pin and return the cast voice. */
  ignoreVoicePick?: boolean;
  /** Skip mstts:express-as. Plain retry after a styled fail. */
  forcePlain?: boolean;
  /** word-boundary events (for precise lip-sync) */
  onWord?: (word: string) => void;
  /** r99: fired once the audio element actually starts playing (media gate open) */
  onPlaying?: () => void;
  /**
   * Singing mode (r2026-10-03.40) — when set, each clause of the text is
   * delivered as one note: pitch = pitchDelta + melody[i % len], at a legato
   * tempo, with musical rests between phrases. The speech contour, swells
   * and comma pauses are skipped so the tune comes through.
   */
  melody?: number[];
  /**
   * Chat/async TTS: pin default sink before play (mic play-and-record silent
   * success). Gesture/card paths omit this — keep play-first (#424).
   */
  pinSinkBeforePlay?: boolean;
  /** Select-board tap: play-first even when mic comms latch is on. */
  gestureTap?: boolean;
}

// Public read-aloud client token from the edge-tts project. Not an API key.
// NEXT_PUBLIC_EDGE_TTS_TOKEN overrides it if Microsoft rotates the public value.
const PUBLIC_EDGE_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

export function edgeClientToken(): string {
  const fromEnv = process.env.NEXT_PUBLIC_EDGE_TTS_TOKEN?.trim();
  return fromEnv || PUBLIC_EDGE_TOKEN;
}

/** gender fallback when a character isn't in the cast */
const VOICES: Record<string, { female: string; male: string; ssmlLang: string }> = {
  yue: { female: 'zh-HK-HiuMaanNeural', male: 'zh-HK-WanLungNeural', ssmlLang: 'zh-HK' },
  zh:  { female: 'zh-CN-XiaoxiaoNeural', male: 'zh-CN-YunjianNeural', ssmlLang: 'zh-CN' },
  ja:  { female: 'ja-JP-NanamiNeural', male: 'ja-JP-KeitaNeural', ssmlLang: 'ja-JP' },
  en:  { female: 'en-US-AriaNeural', male: 'en-US-GuyNeural', ssmlLang: 'en-US' },
};

/**
 * Per-character voice cast. Young female characters get bright young voices
 * (Xiaoyi / Ana), calm ones lower (Xiaohan / Aria), sporty ones crisp
 * (Xiaorui / Sara), male characters real male voices
 * (Yunyang / Yunxi / Yunjian / WanLung / Keita / Guy / Christopher / Eric).
 * r2026-10-03.04: extended cast casted — Cloud finally gets a male voice.
 * r2026-10-04.52: flagship nine casted — genki idols get bright young HK
 * voices (HiuGaai), Atlas a real male voice, every id gender-correct.
 */
const CAST: Record<string, Record<string, string>> = {
  kizuna:  { yue: 'zh-HK-HiuGaaiNeural', zh: 'zh-CN-XiaoxiaoNeural', ja: 'ja-JP-NanamiNeural', en: 'en-US-JennyNeural' },
  alicia:  { yue: 'zh-HK-HiuGaaiNeural', zh: 'zh-CN-XiaoyiNeural',   ja: 'ja-JP-NanamiNeural', en: 'en-US-JennyNeural' },
  ember:   { yue: 'zh-HK-HiuGaaiNeural', zh: 'zh-CN-XiaoyiNeural',  ja: 'ja-JP-NanamiNeural', en: 'en-US-JennyNeural' },
  mei:     { yue: 'zh-HK-HiuGaaiNeural', zh: 'zh-CN-XiaoyiNeural',   ja: 'ja-JP-NanamiNeural', en: 'en-US-AnaNeural' },
  atlas:   { yue: 'zh-HK-WanLungNeural', zh: 'zh-CN-YunxiNeural',    ja: 'ja-JP-KeitaNeural',  en: 'en-HK-SamNeural' },
  sky:     { yue: 'zh-HK-HiuMaanNeural', zh: 'zh-CN-XiaoxiaoNeural',  ja: 'ja-JP-NanamiNeural', en: 'en-US-AriaNeural' },
  yuki:    { yue: 'zh-HK-HiuMaanNeural', zh: 'zh-CN-XiaoyiNeural',  ja: 'ja-JP-NanamiNeural', en: 'en-HK-YanNeural' },
  hina:    { yue: 'zh-HK-HiuGaaiNeural', zh: 'zh-CN-XiaoyiNeural',   ja: 'ja-JP-NanamiNeural', en: 'en-HK-YanNeural' },
  mio:     { yue: 'zh-HK-HiuMaanNeural', zh: 'zh-CN-XiaoxiaoNeural',  ja: 'ja-JP-NanamiNeural', en: 'en-HK-YanNeural' },
  juno:  { yue: 'zh-HK-HiuMaanNeural',   zh: 'zh-CN-XiaoxiaoNeural', ja: 'ja-JP-NanamiNeural', en: 'en-US-JennyNeural' },
  nova:  { yue: 'zh-HK-HiuMaanNeural',   zh: 'zh-CN-XiaoxiaoNeural',  ja: 'ja-JP-NanamiNeural', en: 'en-US-AriaNeural' },
  mochi: { yue: 'zh-HK-HiuMaanNeural',   zh: 'zh-CN-XiaoyiNeural',   ja: 'ja-JP-NanamiNeural', en: 'en-US-AnaNeural' },
  blaze: { yue: 'zh-HK-WanLungNeural',   zh: 'zh-CN-YunyangNeural',  ja: 'ja-JP-KeitaNeural',  en: 'en-US-GuyNeural' },
  kai:   { yue: 'zh-HK-WanLungNeural',   zh: 'zh-CN-YunxiNeural',    ja: 'ja-JP-KeitaNeural',  en: 'en-US-ChristopherNeural' },
  luna:  { yue: 'zh-HK-HiuMaanNeural',   zh: 'zh-CN-XiaoyiNeural',   ja: 'ja-JP-NanamiNeural', en: 'en-US-MichelleNeural' },
  rin:   { yue: 'zh-HK-HiuMaanNeural',   zh: 'zh-CN-XiaoyiNeural',  ja: 'ja-JP-NanamiNeural', en: 'en-US-SaraNeural' },
  ren:   { yue: 'zh-HK-WanLungNeural',   zh: 'zh-CN-YunjianNeural',  ja: 'ja-JP-KeitaNeural',  en: 'en-US-EricNeural' },
  cloud:   { yue: 'zh-HK-WanLungNeural', zh: 'zh-CN-YunxiNeural',    ja: 'ja-JP-KeitaNeural',  en: 'en-US-ChristopherNeural' },
  kasumi:  { yue: 'zh-HK-HiuMaanNeural', zh: 'zh-CN-XiaoxiaoNeural',  ja: 'ja-JP-NanamiNeural', en: 'en-US-AriaNeural' },
  marin:   { yue: 'zh-HK-HiuMaanNeural', zh: 'zh-CN-XiaoyiNeural',   ja: 'ja-JP-NanamiNeural', en: 'en-US-JennyNeural' },
  ayane:   { yue: 'zh-HK-HiuMaanNeural', zh: 'zh-CN-XiaoxiaoNeural',  ja: 'ja-JP-NanamiNeural', en: 'en-US-AriaNeural' },
  hitomi:  { yue: 'zh-HK-HiuMaanNeural', zh: 'zh-CN-XiaoxiaoNeural', ja: 'ja-JP-NanamiNeural', en: 'en-US-MichelleNeural' },
};

const REST_STYLES = ['friendly', 'cheerful', 'calm', 'serious', 'chat', 'sweet', 'hopeful'];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 33) + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Resting delivery when the line is neutral. Emotion styles still win. */
function restStyleFor(voiceName: string, characterId: string): string | undefined {
  const supported = VOICE_STYLES[voiceName];
  if (!supported?.length) return undefined;
  const usable = REST_STYLES.filter((s) => supported.includes(s));
  if (!usable.length) return undefined;
  return usable[hashId(characterId) % usable.length];
}

export interface ResolvedEdgeVoice {
  name: string;
  ssmlLang: string;
  pitch: number;
  rate: number;
  /** Neutral-line mstts style. Omitted when the voice has no style set. */
  restStyle?: string;
}

function pinnedEdgeVoice(id: string): ResolvedEdgeVoice {
  return { name: id, ssmlLang: ssmlLangForEdgeId(id), pitch: 0, rate: 0 };
}

/**
 * Character + locale → one Edge voice.
 * `opts.gender` is delivery (pinned male/female button) and MUST win over the
 * companion's cast gender — #406/#410/#413 still ignored it whenever
 * `character` was set, so male pins kept resolving female neural ids.
 */
export function resolveEdgeVoice(opts: EdgeVoiceOpts): ResolvedEdgeVoice {
  const v = VOICES[opts.lang] ?? VOICES.en!;
  const characterGender = opts.character ? characterVoiceGender(opts.character) : opts.gender;
  const gender = opts.gender ?? characterGender;
  // An explicit Edge short name still wins when a caller has one (the cast
  // table, a probe, a pitch-tier voice id, or a future re-enable).
  if (opts.voiceId && isShippingEdgeVoice(opts.voiceId)) return pinnedEdgeVoice(opts.voiceId);
  // Personal cast only when delivery gender matches the companion — otherwise
  // a female cast id would fight the male floor below and still sound wrong.
  const personal =
    opts.character && characterGender === gender
      ? edgeCastVoice(opts.character, opts.lang)
      : null;
  let name = personal?.id ?? edgeVoiceId(opts.lang, gender);
  let ssmlLang = personal?.ssmlLang ?? v.ssmlLang;
  let pitch = personal?.pitch ?? 0;
  let rate = personal?.rate ?? 0;
  if (!personal && opts.character && characterGender === gender) {
    const casted = CAST[opts.character]?.[opts.lang];
    // Legacy ids (not on the want-list) keep their old matrix when it matches gender.
    if (casted) name = casted;
  }
  if (gender === 'female' && isMaleNeuralVoice(name)) {
    name = edgeVoiceId(opts.lang, 'female');
    ssmlLang = v.ssmlLang;
    pitch = 0;
    rate = 0;
  }
  if (gender === 'male' && isFemaleNeuralVoice(name)) {
    name = edgeVoiceId(opts.lang, 'male');
    ssmlLang = v.ssmlLang;
    pitch = 0;
    rate = 0;
  }
  const restStyle = personal && opts.character ? restStyleFor(name, opts.character) : undefined;
  return { name, ssmlLang, pitch, rate, restStyle };
}

// ---- r2026-10-06.131: mstts:express-as emotional styles ---------------------
// Style whitelists for the voices we actually cast. Sending a style a voice
// doesn't support makes the endpoint error the whole utterance — so only
// documented style sets are listed, and edgeStyleFor() intersects emotion
// preferences against them. zh-CN/zh-HK sets per Microsoft's voice-style
// docs; en-US-Aria carries the small English set. Japanese neural voices
// ship no styles — those lines keep the widened prosody contour only.
const VOICE_STYLES: Record<string, string[]> = {
  'zh-CN-XiaoxiaoNeural': ['assistant', 'chat', 'calm', 'angry', 'cheerful', 'excited', 'friendly', 'hopeful', 'sad', 'serious', 'sorry', 'tender', 'terrified'],
  'zh-CN-XiaoyiNeural': ['angry', 'cheerful', 'excited', 'friendly', 'hopeful', 'sad', 'serious', 'shy', 'sweet'],
  // Male zh styles are the sets Microsoft documents (Apr 2026). A style that
  // is not on the voice — friendly/hopeful/excited on Yunjian, anything
  // emotional on Yunyang — makes the free read-aloud socket drop the line.
  'zh-CN-YunjianNeural':  ['angry', 'cheerful', 'depressed', 'disgruntled', 'documentary-narration', 'narration-relaxed', 'sad', 'serious', 'sports-commentary', 'sports-commentary-excited'],
  'zh-CN-YunxiNeural':    ['angry', 'assistant', 'chat', 'cheerful', 'depressed', 'disgruntled', 'embarrassed', 'fearful', 'narration-relaxed', 'newscast', 'sad', 'serious'],
  'zh-CN-YunyangNeural':  ['customerservice', 'narration-professional', 'newscast-casual'],
  'zh-CN-YunxiaNeural':   ['angry', 'calm', 'cheerful', 'fearful', 'sad'],
  'zh-HK-HiuGaaiNeural':  ['calm', 'cheerful', 'confused', 'friendly', 'serious', 'sad', 'worried'],
  'zh-HK-HiuMaanNeural':  ['calm', 'cheerful', 'confused', 'friendly', 'serious', 'sad', 'worried'],
  // zh-HK-WanLungNeural and ja-JP-KeitaNeural have no express-as styles.
  // Sending one fails the utterance, so they stay off this map.
  'en-US-GuyNeural':      ['angry', 'cheerful', 'excited', 'friendly', 'hopeful', 'newscast', 'sad', 'shouting', 'terrified', 'unfriendly', 'whispering'],
  'en-GB-RyanNeural':     ['chat', 'cheerful', 'sad', 'whispering'],
  'en-US-AriaNeural':     ['chat', 'cheerful', 'customerservice', 'excited', 'friendly', 'hopeful', 'sad'],
};

// Emotion → ordered style preferences; the first one the voice supports wins.
// Neutral deliberately prefers none — an unstyled line with the prosody
// contour still sounds warmer than a forced style.
const EMOTION_STYLE_PREFS: Record<string, string[]> = {
  joy:            ['cheerful', 'excited', 'friendly'],
  excitement:     ['excited', 'cheerful'],
  love:           ['tender', 'sweet', 'friendly', 'calm'],
  contentment:    ['calm', 'friendly', 'hopeful'],
  relief:         ['calm', 'friendly', 'hopeful'],
  sadness:        ['sad', 'sorry', 'serious'],
  shame:          ['sad', 'shy', 'serious'],
  guilt:          ['sorry', 'sad', 'serious'],
  boredom:        ['calm', 'serious', 'friendly'],
  anger:          ['angry', 'serious'],
  contempt:       ['serious', 'angry'],
  disgust:        ['serious', 'angry'],
  fear:           ['terrified', 'worried', 'confused', 'serious'],
  surprise:       ['excited', 'cheerful'],
  embarrassment:  ['shy', 'friendly', 'excited'],
  pride:          ['hopeful', 'serious', 'friendly'],
  jealousy:       ['serious', 'angry'],
  confusion:      ['confused', 'serious'],
  neutral:        [],
};

/**
 * r131 — resolve the mstts style for a voice + emotion, or null when the
 * voice can't act (ja voices, unlisted voices) or the line is neutral.
 * Unknown emotions fall back to neutral (no style), never to a guessed one.
 */
export function edgeStyleFor(voiceName: string, emotion: string): string | null {
  const supported = VOICE_STYLES[voiceName];
  if (!supported) return null;
  const prefs = EMOTION_STYLE_PREFS[emotion];
  if (!prefs) return null;
  return prefs.find((p) => supported.includes(p)) ?? null;
}

function guid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replaceAll('-', '');
  }
  let s = '';
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

function escapeXml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

const pct = (n: number) => `${n >= 0 ? '+' : ''}${Math.round(n * 100)}%`;
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
/**
 * Prosody volume for the readaloud endpoint.
 *
 * This used to emit `±N.NdB` (the `n * 8` scaling is kept), but that unit is
 * REFUSED outright: the endpoint answers `1007 … SSML parsing error:
 * 0x80045003` and drops the whole utterance, while the same clause with a
 * percentage synthesizes fine. Every spoken clause carried this attribute, so
 * every line was silent — and two failures trip the EDGE_FAILURE_LIMIT=2
 * breaker, which parks the whole Edge tier for five minutes.
 *
 * The conversion keeps the loudness that was asked for: amplitude ratio is
 * 10^(dB/20), which is exactly what `volume` as a percentage expresses.
 */
const db = (n: number) => {
  const percent = Math.round((10 ** ((n * 8) / 20) - 1) * 100);
  return `${percent >= 0 ? '+' : ''}${clamp(percent, -100, 200)}%`;
};

// ---- current playback (so stopSpeaking can cut it) ----
let currentAudio: HTMLAudioElement | null = null;
// r2026-10-04.89 — the promise currently awaiting playback, if any. Cutting
// playback MUST also settle it: otherwise its 4.5s timeout fires .catch()
// later and a stale, already-replaced line gets spoken out of nowhere.
let pendingReject: ((err: Error) => void) | null = null;
/** True while a tab hide owns the pause, so the show seam knows to resume. */
let edgePausedByHide = false;

/** Pause in-flight neural audio when the tab is hidden. */
export function pauseEdgeForTabHide(): void {
  if (!currentAudio) return;
  edgePausedByHide = true;
  try { currentAudio.pause(); } catch { /* ignore */ }
}

/**
 * Resume the neural mp3 a tab hide paused. Same failure as the gTTS tier: the
 * paused element held the serial speaker with no resume path, so the reply
 * ended silent when the user came back to the tab.
 */
export function resumeEdgeForTabShow(): void {
  if (!edgePausedByHide) return;
  edgePausedByHide = false;
  const audio = currentAudio;
  if (!audio) return;
  try {
    if (audio.paused) void audio.play().catch(() => undefined);
  } catch { /* ignore */ }
}

export function stopEdge(): void {
  edgePausedByHide = false;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio = null;
  }
  if (pendingReject) {
    const rejectPending = pendingReject;
    pendingReject = null;
    rejectPending(new Error('canceled'));
  }
}

export function edgeTtsPossible(): boolean {
  return typeof WebSocket !== 'undefined';
}

// ---- r131: optional HTTP TTS proxy -------------------------------------------
// Some networks block the wss socket (Master Simon's iPhone network did —
// r89). A proxy carries the same SSML over plain HTTPS POST and returns the
// mp3, so the neural voice survives those networks. The deployed free
// Cloudflare Worker (server/amoji-proxy, wrangler name `amoji-voice`) is the
// built-in default: real users get the verified male/female neural voices
// without pasting a URL into Settings. Clear the field to force a direct
// socket connection (stored `''` is an explicit opt-out, not "unset").
const PROXY_KEY = 'amoji.ttsproxy.v1';
let proxyOverride: string | null | undefined; // undefined = read storage, then env

/**
 * Live relay verified 2026-11-24 (returns HTTP 200 audio/mpeg for
 * zh-HK-WanLungNeural, zh-CN-YunjianNeural, ja-JP-KeitaNeural,
 * en-US-GuyNeural, zh-HK-HiuMaanNeural). Not a key; safe to ship in the
 * public bundle. `?debug=1` makes a 502 return its upstream trace.
 */
export const DEFAULT_TTS_PROXY = 'https://amoji-voice.monmonmars.workers.dev';

/** Empty or whitespace → no proxy (direct Edge socket). Strips a trailing slash. */
export function normalizeProxyUrl(url: string | null | undefined): string | null {
  const v = (url ?? '').trim();
  if (!v) return null;
  return v.replace(/\/+$/, '');
}

/**
 * Precedence: session override (including an explicit clear, null) >
 * saved localStorage URL (an explicit `''` disables the proxy) >
 * NEXT_PUBLIC_TTS_PROXY when non-blank > the built-in worker.
 * A cleared value does not resurrect the env URL or the default.
 */
export function resolveTtsProxy(
  override: string | null | undefined,
  stored: string | null,
  env: string | undefined,
): string | null {
  if (override !== undefined) return normalizeProxyUrl(override);
  if (stored !== null) return normalizeProxyUrl(stored);
  return normalizeProxyUrl(env) ?? DEFAULT_TTS_PROXY;
}

export function setTtsProxy(url: string | null): void {
  proxyOverride = normalizeProxyUrl(url);
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(PROXY_KEY, proxyOverride ?? '');
  } catch { /* ignore */ }
}

export function getTtsProxy(): string | null {
  let stored: string | null = null;
  let sawStorage = false;
  try {
    if (typeof localStorage !== 'undefined') {
      sawStorage = true;
      stored = localStorage.getItem(PROXY_KEY);
    }
  } catch { /* ignore */ }
  return resolveTtsProxy(
    proxyOverride,
    sawStorage ? stored : null,
    process.env.NEXT_PUBLIC_TTS_PROXY,
  );
}

/**
 * The readaloud endpoint accepts AT MOST TWO element children inside <voice>.
 * Three or more closes the socket with `1007: SSML is invalid` and returns no
 * audio — the owner's "the third sentence has no voice" report, because one
 * <prosody> per clause plus a <break> between clauses reaches three elements
 * on any line with three clauses. Measured 2026-11-25 against the live relay:
 * 1 clause 200, 2 clauses 200, 3+ clauses 502 (relay trace: close code 1007).
 *
 * <break> is not emitted at all: the endpoint's repair path strips it (costing
 * a second, slower attempt), and clause punctuation already renders a real
 * pause (~1s at 。！？, ~0.5s at ，) without being spoken aloud.
 */
const MAX_VOICE_CHILDREN = 2;

/**
 * mstts:express-as is NOT emitted by default. Measured 2026-11-25: any body
 * containing <mstts:express-as> makes the upstream end the turn with zero
 * audio frames, so the relay always had to repair it (X-Amoji-Attempts: 2) and
 * the repaired audio was the same byte length as the plain body — the style
 * never reached the mp3. Dropping it makes attempt 1 succeed (no repair, less
 * latency). The resolver below stays intact: flip this to re-enable styles
 * once the endpoint honors them again.
 */
const EDGE_EXPRESS_AS_ENABLED = false;

/** One clause's spoken text plus the contour it asks for. */
interface ClauseVoice {
  text: string;
  pitch: number;
  rate: number;
}

/**
 * Spoken text of one clause. Symbols are gone (the endpoint would read them),
 * clause punctuation is KEPT: it carries the pause now that <break> is not
 * sent, and the endpoint does not speak it.
 */
function clauseSpeech(part: string): string {
  return stripVoicedSymbols(part).replace(/[\r\n]+/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();
}

/**
 * `cleanForSpeech` maps a dash to the Chinese comma, which is right for the
 * CJK voices but reads as an alien glyph in an all-Latin line. Give those
 * lines ASCII punctuation (and the space an English sentence expects) so the
 * pause survives without a full-width mark. Text with any CJK is left alone.
 */
function latinPunctuation(s: string): string {
  if (/[\u3400-\u9fff\u3040-\u30ff]/.test(s)) return s;
  return s
    .replace(/，/g, ',').replace(/。/g, '.').replace(/！/g, '!')
    .replace(/？/g, '?').replace(/；/g, ';').replace(/：/g, ':')
    .replace(/([,;:!?])(?=[A-Za-z0-9])/g, '$1 ')
    .replace(/\.(?=[A-Za-z])/g, '. ');
}


/** Join two clause texts without dropping or duplicating a character. */
function joinSpeech(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  // Latin words must not fuse ("you.I"); CJK is correct when glued.
  return /[A-Za-z0-9]$/.test(a) || /^[A-Za-z0-9]/.test(b) ? `${a} ${b}` : `${a}${b}`;
}

/**
 * Split N clauses into at most MAX_VOICE_CHILDREN contiguous [first, last]
 * groups — structural, so no input can produce a third top-level element.
 * 1 → one span, 2 → two spans, 3+ → first half / second half.
 */
function clauseGroups(count: number): Array<[number, number]> {
  if (count <= 0) return [];
  if (count <= MAX_VOICE_CHILDREN) return Array.from({ length: count }, (_, i) => [i, i]);
  const cut = Math.ceil(count / 2);
  return [[0, cut - 1], [cut, count - 1]];
}

function prosodySpan(text: string, pitch: number, rate: number, vol: number): string {
  return text
    ? `<prosody pitch='${pct(pitch)}' rate='${pct(rate)}' volume='${db(vol)}'>${escapeXml(text)}</prosody>`
    : '';
}

/**
 * r131 — pure SSML builder, extracted from speakEdge so tests can assert the
 * markup. Everything the endpoint receives lives here: the ChatGPT-style
 * contour, punctuation swells (! lifts, … sinks), an optional leading tic, and
 * singing mode — grouped into at most two <prosody> spans (see
 * MAX_VOICE_CHILDREN) with pauses carried by punctuation.
 */
export function buildEdgeSsml(text: string, opts: EdgeVoiceOpts): string {
  const voice = resolveEdgeVoice(opts);
  const expr = clamp(opts.expressiveness ?? 1, 0.5, 1.8);
  // Character pitch/pace sits under the emotion contour so two companions
  // on a shared neural voice still do not sound identical.
  const baseRate = (opts.rateDelta ?? 0) + voice.rate;
  const basePitch = (opts.pitchDelta ?? 0) + voice.pitch;
  const baseVol = opts.volumeDelta ?? 0;
  const spoken = latinPunctuation(cleanForSpeech(text));
  const rising = /[？?]\s*$/.test(spoken);
  const parts = splitClauses(spoken).filter(isSpeakableText);
  const leadText = opts.lead ? cleanForSpeech(opts.lead.text).replace(/[!！]+$/g, '').trim() : '';
  const leadProsody = opts.lead ? clampLeadProsody(opts.lead.pitch, opts.lead.rate) : null;

  // The tic's own <prosody>+<break> would spend the entire two-element budget,
  // so it is folded into the first span. Its pitch stays inside a speaking
  // range (clampLeadProsody) so a two-syllable "haha" cannot squeak.
  const leadSpoken = leadText && isSpeakableText(leadText) ? clauseSpeech(leadText) : '';

  const melody = opts.melody;
  // Contour per clause, exactly as before — grouping only decides which
  // contour each half wears (first clause for the opening, final for the tail).
  const contours = parts.map((part, i) => {
    const isTail = i === parts.length - 1;
    // r2026-10-03.40 — singing mode: each clause is one note of the melody;
    // legato tempo, no speech contour/swells.
    if (melody && melody.length > 0) {
      const note = melody[i % melody.length]!;
      return { pitch: clamp(basePitch + note, -0.5, 0.5), rate: clamp(baseRate * 0.92, -0.5, 0.5) };
    }
    // Intentional rateDelta/pitchDelta (deep/mid/bright buttons) MUST survive.
    // The old ±14%/±18% clamps crushed #425 tier prosody so deep≈bright on
    // device. Decorative sing-song wave stays small; absolute ceiling is wide
    // enough for huge tier gaps but under the ±50% Edge distort zone.
    const wave = parts.length > 1
      ? 0.07 * expr * Math.sin((i / (parts.length - 1)) * Math.PI * (rising ? 1 : 0.7))
      : 0;
    const tailLift = isTail && rising ? 0.04 : isTail && !rising ? -0.03 : 0;
    const bang = /[!！]\s*$/.test(part);
    const trail = /[…\.{3}—–]/.test(part);
    const swellP = bang ? 0.04 : trail ? -0.04 : 0;
    const swellR = bang ? 0.025 : trail ? -0.03 : 0;
    const rateOrnament = clamp(wave * 0.45 + swellR + (isTail ? -0.02 : 0), -0.05, 0.05);
    const pitchOrnament = clamp(wave + tailLift + swellP + (bang ? 0.02 * expr : 0), -0.06, 0.06);
    return {
      pitch: clamp(basePitch + pitchOrnament, -0.48, 0.48),
      rate: clamp(baseRate + rateOrnament, -0.42, 0.42),
    };
  });

  // Merge clauses into at most two spoken spans. Every clause's text goes into
  // exactly one span, so no word is dropped or duplicated. With several clauses
  // sharing a span the per-clause wave averages out, so each half also gets a
  // small opposing bias: the contrast between the two halves is what is left of
  // the sing-song contour, and it keeps expressiveness audible.
  const groups = clauseGroups(parts.length);
  const halfLift = melody && melody.length > 0 ? 0 : 0.035 * expr * (rising ? 1 : 0.7);
  const spans: ClauseVoice[] = groups.map(([from, to], gi) => {
    let groupText = '';
    for (let i = from; i <= to; i++) groupText = joinSpeech(groupText, clauseSpeech(parts[i]!));
    const wear = from === 0 ? contours[from]! : contours[to]!;
    const bias = groups.length === 1 ? 0 : gi === 0 ? -halfLift : halfLift;
    return { text: groupText, pitch: clamp(wear.pitch + bias, -0.48, 0.48), rate: wear.rate };
  });

  if (leadSpoken && leadProsody) {
    // Punctuation after the tic is the pause the old 220ms break provided.
    const leadSpeech = /[，,。.！!？?；;：:]\s*$/.test(leadSpoken) ? leadSpoken : `${leadSpoken}，`;
    if (spans.length === 0) {
      // A tic with no words to follow is the whole utterance — one element.
      spans.push({ text: leadSpeech, pitch: leadProsody.pitch, rate: leadProsody.rate });
    } else {
      const first = spans[0]!;
      spans[0] = {
        text: joinSpeech(leadSpeech, first.text),
        pitch: leadProsody.pitch,
        rate: leadProsody.rate,
      };
    }
  }

  const body = spans.map((s) => prosodySpan(s.text, s.pitch, s.rate, baseVol)).join('');

  // Emotion style (or the resting style) wraps the spans only when enabled.
  // Disabled by default — see EDGE_EXPRESS_AS_ENABLED for the measurement.
  const style = EDGE_EXPRESS_AS_ENABLED && !opts.forcePlain && body
    ? (edgeStyleFor(voice.name, opts.emotion ?? 'neutral') ?? voice.restStyle ?? null)
    : null;
  const voiced = style
    ? `<voice name='${voice.name}'><mstts:express-as style='${style}'${
        voice.name.startsWith('zh-') ? ` styledegree='${clamp(0.9 + 0.5 * expr, 1, 2).toFixed(2)}'` : ''
      }>${body}</mstts:express-as></voice>`
    : `<voice name='${voice.name}'>${body}</voice>`;
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis'${
      style ? " xmlns:mstts='http://www.w3.org/2001/mstts'" : ''
    } xml:lang='${voice.ssmlLang}'>${voiced}</speak>`
  );
}

/**
 * Speak `text` with a neural voice. Resolves when playback finishes,
 * rejects quickly if every transport is unreachable (caller falls back).
 * r131: transports are (1) the configured HTTP proxy (the built-in worker
 * by default, unless the user cleared it), else (2) the direct readaloud
 * WebSocket.
 */

// ---- endpoint circuit breaker ---------------------------------------------
// Microsoft's readaloud endpoint now rejects the published client token
// outright: verified from Node, the socket answers 401 without the token and
// 403 with it, with or without an Edge UA and the extension Origin. So this is
// not a browser-Origin restriction and a proxy built on the same token 403s
// too. After a few consecutive failures, stop paying for the round trip on
// every line and let the HTTP MP3 tier speak immediately.
const EDGE_FAILURE_LIMIT = 2;
/** How long a tripped breaker stays open before the endpoint is retried. */
const EDGE_COOLDOWN_MS = 5 * 60_000;
let edgeFailures = 0;
let edgeDeadUntil = 0;

function noteEdgeFailure(): void {
  edgeFailures += 1;
  if (edgeFailures >= EDGE_FAILURE_LIMIT) edgeDeadUntil = Date.now() + EDGE_COOLDOWN_MS;
}

/** True while the breaker is open — caller should go straight to the next tier. */
export function edgeEndpointsDead(): boolean {
  if (edgeDeadUntil && Date.now() >= edgeDeadUntil) {
    // Cooldown elapsed: try the endpoint again.
    edgeDeadUntil = 0;
    edgeFailures = 0;
  }
  return edgeDeadUntil > 0;
}

/** A successful play, or the user toggling neural voice, clears the breaker. */
export function resetEdgeHealth(): void {
  edgeFailures = 0;
  edgeDeadUntil = 0;
}

export function speakEdge(text: string, opts: EdgeVoiceOpts): Promise<void> {
  stopEdge();
  if (edgeEndpointsDead()) {
    return Promise.reject(new Error('edge-tts endpoint blocked (recent 403)'));
  }
  const ssml = buildEdgeSsml(text, opts);
  const proxy = getTtsProxy();
  const run = (markup: string) =>
    proxy ? speakEdgeViaProxy(markup, proxy, opts) : speakEdgeViaSocket(markup, opts);
  return run(ssml).then(
    (v) => {
      edgeFailures = 0;
      return v;
    },
    (err: unknown) => {
      const msg = (err as Error | undefined)?.message ?? '';
      // A real transport failure (not a user cut) means the endpoint refused us.
      // Microsoft now answers 403 to the published client token for every
      // client, so retrying this tier on every single line just delays speech.
      if (msg !== 'canceled') noteEdgeFailure();
      if (msg === 'canceled' || opts.forcePlain) return Promise.reject(err);
      // Styled utterance failed → one plain retry so non-Yue / male voices still speak
      // when express-as is rejected. Yue female often succeeds on the styled first try.
      stopEdge();
      const plain = buildEdgeSsml(text, { ...opts, forcePlain: true });
      // While express-as is disabled the plain body IS this body — re-sending
      // it would just spend a second socket and handshake on a real failure.
      if (plain === ssml) return Promise.reject(err);
      return run(plain);
    },
  );
}

// Shared tail: hand a finished mp3 blob to an <audio> element. The
// currentAudio/pendingReject bookkeeping is identical for both transports —
// stopEdge() cancels playback AND rejects the pending promise either way.
function playMp3Blob(blob: Blob, opts: EdgeVoiceOpts, resolve: () => void, reject: (err: Error) => void): void {
  const url = URL.createObjectURL(blob);
  let audio: HTMLAudioElement;
  try {
    audio = new Audio(url);
    audio.dataset.amojiAudio = '1';
  } catch (err) {
    URL.revokeObjectURL(url);
    reject(err instanceof Error ? err : new Error(String(err)));
    return;
  }
  ensureCompanionPlaybackRoute();
  // Do NOT pin inside onplay — setSinkId interrupts live HTMLAudio (#424).
  // Gesture/card: play-first. Chat pinSinkBeforePlay: pin then play (mic route).
  try { applyPlaybackVolume(audio); } catch { /* playback still starts */ }
  currentAudio = audio;
  // r99: the caller learns the instant media playback actually begins —
  // that is the moment the iOS media gate is provably open.
  audio.onplay = () => {
    try { opts.onPlaying?.(); } catch { /* ignore */ }
    // One mp3 is the whole sentence. Track its duration through the last word.
    followAudioElement(audio, true);
  };
  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null;
    URL.revokeObjectURL(url);
    resolve();
  };
  audio.onerror = () => {
    if (currentAudio === audio) currentAudio = null;
    URL.revokeObjectURL(url);
    reject(new Error('edge-tts playback failed'));
  };
  void startHtmlAudioOnDefaultSpeakers(
    audio,
    htmlAudioStartMode(opts.pinSinkBeforePlay, opts.gestureTap),
  ).catch((err: unknown) => {
    if (currentAudio === audio) currentAudio = null;
    URL.revokeObjectURL(url);
    reject(err instanceof Error ? err : new Error(String(err)));
  });
}

/**
 * r131 — proxy transport: POST the SSML, get one mp3 back. No word-boundary
 * metadata (the proxy relays audio only), so lip-sync rides the caller's
 * existing estimators. 8s cap — a worker round-trip is sub-second when
 * healthy; beyond that the chain should move on to the next tier.
 */
function speakEdgeViaProxy(ssml: string, proxy: string, opts: EdgeVoiceOpts): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => fail(new Error('edge-tts proxy timeout')), 8_000);
    const fail = (err: Error) => { if (!settled) { settled = true; clearTimeout(timer); reject(err); } };
    pendingReject = fail; // stopEdge() cancels in-flight fetches too
    fetch(proxy, {
      method: 'POST',
      headers: { 'Content-Type': 'application/ssml+xml' },
      body: ssml,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`edge-tts proxy HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (settled) return; // cut while the fetch was in flight
        clearTimeout(timer);
        pendingReject = null;
        playMp3Blob(new Blob([blob], { type: 'audio/mpeg' }), opts, resolve, reject);
      })
      .catch((e: unknown) => fail(e instanceof Error ? e : new Error(String(e))));
  });
}

function speakEdgeViaSocket(ssml: string, opts: EdgeVoiceOpts): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const requestId = guid();

    let ws: WebSocket;
    try {
      // Sec-MS-GEC v2 is required. Without it the socket is 403 and every
      // Cantonese pill falls through to one browser voice.
      ws = new WebSocket(edgeReadAloudUrl(guid()));
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    ws.binaryType = 'arraybuffer';

    const chunks: ArrayBuffer[] = [];
    let settled = false;
    let gotAudio = false;
    const pending: Array<Promise<void>> = [];

    const cleanup = () => { clearTimeout(timer); try { ws.close(); } catch { /* already closed */ } };
    const fail = (err: Error) => { if (!settled) { settled = true; cleanup(); stopEdge(); reject(err); } };
    // r2026-10-05.97: 4.5s → 3.5s — the Google-TTS mid tier in voice.ts is a
    // real voice (not a last resort), so a dead socket should hand over even
    // faster; waiting on a hung socket wastes the most audible time of all
    const timer = setTimeout(() => fail(new Error('edge-tts timeout')), 3_500);
    // r2026-10-04.89 — a cut (new line / stopSpeaking) rejects as 'canceled'
    // so the caller's fallback chain stays silent instead of speaking late
    pendingReject = fail;

    ws.onopen = () => {
      const now = () => new Date().toISOString();
      const config =
        `X-Timestamp:${now()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}}`;
      const msg =
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${now()}\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(config + '\x00');
      ws.send(msg + '\x00');
    };

    ws.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data === 'string') {
        const str = ev.data;
        if (str.includes('Path:audio.metadata')) {
          try {
            const body2 = str.slice(str.indexOf('\r\n\r\n') + 4);
            const meta = JSON.parse(body2) as {
              Metadata?: Array<{ Type: string; Data?: { text?: { Text?: string } } }>;
            };
            for (const m of meta.Metadata ?? []) {
              if (m.Type === 'WordBoundary' && m.Data?.text?.Text) opts.onWord?.(m.Data.text.Text);
            }
          } catch { /* metadata is best-effort */ }
        }
        return;
      }
      // binary frame: ASCII headers first, terminated by \r\n\r\n, then mp3 bytes.
      // Safari sometimes delivers a Blob even after binaryType = 'arraybuffer'.
      const take = (bytes: Uint8Array) => {
        const audio = edgeAudioPayload(bytes);
        if (!audio?.length) return;
        const copy = new Uint8Array(audio.byteLength);
        copy.set(audio);
        chunks.push(copy.buffer);
        gotAudio = true;
      };
      try {
        if (ev.data instanceof ArrayBuffer) {
          take(new Uint8Array(ev.data));
          return;
        }
        if (typeof Blob !== 'undefined' && ev.data instanceof Blob) {
          pending.push(ev.data.arrayBuffer().then((ab) => { take(new Uint8Array(ab)); }).then(() => undefined, () => undefined));
        }
      } catch { /* a bad frame must not drop the rest of the line */ }
    };

    ws.onerror = () => fail(new Error('edge-tts socket error'));
    ws.onclose = () => {
      clearTimeout(timer);
      // Blob frames resolve after close. Don't wait forever — the synth
      // fallback has to run if the mp3 never arrives.
      void Promise.race([
        Promise.all(pending),
        new Promise<void>((r) => { setTimeout(r, 1200); }),
      ]).then(() => {
        if (settled) return;
        if (!gotAudio || chunks.length === 0) { fail(new Error('edge-tts no audio')); return; }
        settled = true;
        pendingReject = null;
        try {
          playMp3Blob(new Blob(chunks as BlobPart[], { type: 'audio/mpeg' }), opts, resolve, reject);
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    };
  });
}
