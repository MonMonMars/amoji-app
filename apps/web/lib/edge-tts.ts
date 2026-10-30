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
import { pinDefaultOutput } from './audio-output';
import { applyPlaybackVolume } from './playback-volume';
import { characterVoiceGender } from './voice-gender';
import { edgeVoiceId, isFemaleNeuralVoice, isMaleNeuralVoice, isShippingEdgeVoice, ssmlLangForEdgeId } from './voice-catalog';
import { voicePickFor } from './voice-picks';
import { edgeCastVoice } from './edge-cast';
import { clampLeadProsody, cleanForSpeech, isSpeakableText, stripVoicedGlyphs } from './speak-text';
import { followAudioElement } from './speech';

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

/** Character + locale → one Edge voice. Gender is the floor, not the whole map. */
export function resolveEdgeVoice(opts: EdgeVoiceOpts): ResolvedEdgeVoice {
  const v = VOICES[opts.lang] ?? VOICES.en!;
  const gender = opts.character ? characterVoiceGender(opts.character) : opts.gender;
  // An explicit button (or a saved pin for THIS companion gender) wins over
  // the cast. The gender floor below does not run, so a female companion
  // keeps a male voice only when that pin was chosen on purpose.
  if (opts.voiceId && isShippingEdgeVoice(opts.voiceId)) return pinnedEdgeVoice(opts.voiceId);
  if (!opts.ignoreVoicePick) {
    const picked = voicePickFor(opts.lang, gender);
    if (picked && isShippingEdgeVoice(picked)) return pinnedEdgeVoice(picked);
  }
  const personal = opts.character ? edgeCastVoice(opts.character, opts.lang) : null;
  let name = personal?.id ?? edgeVoiceId(opts.lang, gender);
  let ssmlLang = personal?.ssmlLang ?? v.ssmlLang;
  let pitch = personal?.pitch ?? 0;
  let rate = personal?.rate ?? 0;
  if (!personal && opts.character) {
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
const db = (n: number) => `${n >= 0 ? '+' : ''}${(n * 8).toFixed(1)}dB`;
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

// Split into breath-sized clauses so the pitch contour can rise and fall inside
// a sentence — the sing-song quality that makes ChatGPT's voice feel alive.
// r2026-10-05.99: NO regex lookbehind — `(?<=…)` is a hard SyntaxError on
// WebKit before Safari 16.4 (iOS 16.4) and it killed the whole voice chain
// on those devices. Manual scanner: cut right AFTER any clause-ending
// punctuation, trimming whitespace (equivalent to the old split+trim).
const CLAUSE_END = /[。！？!?；;，,、—…\.]/;
function clauses(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (const ch of text) {
    cur += ch;
    if (CLAUSE_END.test(ch)) {
      const s = cur.trim();
      if (s) out.push(s);
      cur = '';
    }
  }
  const tail = cur.trim();
  if (tail) out.push(tail);
  return out;
}

// ---- current playback (so stopSpeaking can cut it) ----
let currentAudio: HTMLAudioElement | null = null;
// r2026-10-04.89 — the promise currently awaiting playback, if any. Cutting
// playback MUST also settle it: otherwise its 4.5s timeout fires .catch()
// later and a stale, already-replaced line gets spoken out of nowhere.
let pendingReject: ((err: Error) => void) | null = null;

export function stopEdge(): void {
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
// mp3, so the neural voice survives those networks. Deploy server/amoji-proxy/
// (a free Cloudflare Worker) and point this at it; unset → direct socket.
const PROXY_KEY = 'amoji.ttsproxy.v1';
let proxyOverride: string | null | undefined; // undefined = read storage, then env

/** Empty or whitespace → no proxy (direct Edge socket). Strips a trailing slash. */
export function normalizeProxyUrl(url: string | null | undefined): string | null {
  const v = (url ?? '').trim();
  if (!v) return null;
  return v.replace(/\/+$/, '');
}

/**
 * Session override wins, including an explicit clear (null). Otherwise a
 * saved localStorage URL. Otherwise NEXT_PUBLIC_TTS_PROXY from .env.local
 * or the Pages build. A cleared value does not resurrect the env URL.
 */
export function resolveTtsProxy(
  override: string | null | undefined,
  stored: string | null,
  env: string | undefined,
): string | null {
  if (override !== undefined) return normalizeProxyUrl(override);
  if (stored !== null) return normalizeProxyUrl(stored);
  return normalizeProxyUrl(env);
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

/** Spoken clause: pause glyphs are omitted, the scheduled breath break stays. */
function prosodyClause(part: string, pitch: number, rate: number, vol: number, breakAfter: string): string {
  const spoken = stripVoicedGlyphs(part);
  const body = spoken
    ? `<prosody pitch='${pct(pitch)}' rate='${pct(rate)}' volume='${db(vol)}'>${escapeXml(spoken)}</prosody>`
    : '';
  return `${body}${breakAfter}`;
}

/**
 * r131 — pure SSML builder, extracted from speakEdge so tests can assert the
 * markup. Everything the endpoint receives lives here: one <prosody> per
 * clause with the ChatGPT-style contour, punctuation swells (! lifts, …
 * sinks), comma/sentence breath pauses, an optional leading tic, singing
 * mode (one note per clause), and the mstts:express-as emotional style —
 * styledegree rides expressiveness, zh voices only (en styles reject the
 * attribute; ja voices ship no styles at all and stay prosody-only).
 */
export function buildEdgeSsml(text: string, opts: EdgeVoiceOpts): string {
  const voice = resolveEdgeVoice(opts);
  const expr = clamp(opts.expressiveness ?? 1, 0.5, 1.8);
  // Character pitch/pace sits under the emotion contour so two companions
  // on a shared neural voice still do not sound identical.
  const baseRate = (opts.rateDelta ?? 0) + voice.rate;
  const basePitch = (opts.pitchDelta ?? 0) + voice.pitch;
  const baseVol = opts.volumeDelta ?? 0;
  const spoken = cleanForSpeech(text);
  const rising = /[？?]\s*$/.test(spoken);
  const parts = clauses(spoken).filter(isSpeakableText);
  const leadText = opts.lead ? cleanForSpeech(opts.lead.text).replace(/[!！]+$/g, '').trim() : '';
  const leadProsody = opts.lead ? clampLeadProsody(opts.lead.pitch, opts.lead.rate) : null;

  // The chuckle sits OUTSIDE mstts:express-as. Excited/cheerful on a one-word
  // "haha" is the broken poke laugh (strained style + a bang yelp). Pitch
  // stays inside a speaking range so the next clause cannot inherit a squeak.
  const leadSpoken = leadText && isSpeakableText(leadText) ? stripVoicedGlyphs(leadText) : '';
  const tic = leadSpoken && leadProsody
    ? `<prosody pitch='${pct(leadProsody.pitch)}' rate='${pct(leadProsody.rate)}' volume='${db(0)}'>${escapeXml(leadSpoken)}</prosody><break time='220ms'/>`
    : '';

  const melody = opts.melody;
  const body = parts
    .map((part, i) => {
      const isTail = i === parts.length - 1;
      // r2026-10-03.40 — singing mode: each clause is one note of the
      // melody; legato tempo, musical rests, no speech contour/swells
      if (melody && melody.length > 0) {
        const note = melody[i % melody.length]!;
        const rate = clamp(baseRate * 0.92, -0.5, 0.5);
        const pitch = clamp(basePitch + note, -0.5, 0.5);
        // musical rests: a beat after phrase ends, a half-beat after commas
        const breakAfter = !isTail
          ? /[。！？!?…\.]$/.test(part) ? `<break time='420ms'/>`
            : /[,，、；;]$/.test(part) ? `<break time='160ms'/>`
            : ''
          : '';
        return prosodyClause(part, pitch, rate, baseVol, breakAfter);
      }
      // Sing-song stays inside what neural prosody can do without artifacts.
      // Past about ±20% pitch the free voices distort — a poke "haha!" at the
      // old +50% ceiling was the squeak.
      const contour = parts.length > 1
        ? 1 + 0.08 * expr * Math.sin((i / (parts.length - 1)) * Math.PI * (rising ? 1 : 0.7))
        : 1;
      const tailLift = isTail && rising ? 1.1 : isTail && !rising ? 0.94 : 1;
      const bang = /[!！]\s*$/.test(part);
      const trail = /[…\.{3}—–]/.test(part);
      const swellP = bang ? 1.12 : trail ? 0.88 : 1;
      const swellR = bang ? 1.04 : trail ? 0.92 : 1;
      const rate = clamp(baseRate * contour * (isTail ? 0.96 : 1) * swellR, -0.14, 0.14);
      const pitch = clamp(basePitch * contour * tailLift * swellP + (bang ? 0.02 * expr : 0), -0.18, 0.18);
      // breath pauses: commas shorter than sentence ends; ellipses linger
      const breakAfter = /[。！？!?…\.]$/.test(part) && !isTail
        ? `<break time='${trail ? '320ms' : '230ms'}'/>`
        : /[,，、；;—]$/.test(part) ? `<break time='110ms'/>`
        : '';
      return prosodyClause(part, pitch, rate, baseVol, breakAfter);
    })
    .join('');

  // Emotion style (or the character's resting style) wraps the sentence only.
  // An empty body means the chuckle is the whole utterance — leave it unstyled.
  const style = (!opts.forcePlain && body)
    ? (edgeStyleFor(voice.name, opts.emotion ?? 'neutral') ?? voice.restStyle ?? null)
    : null;
  const voiced = style
    ? `<voice name='${voice.name}'>${tic}<mstts:express-as style='${style}'${
        voice.name.startsWith('zh-') ? ` styledegree='${clamp(0.9 + 0.5 * expr, 1, 2).toFixed(2)}'` : ''
      }>${body}</mstts:express-as></voice>`
    : `<voice name='${voice.name}'>${tic}${body}</voice>`;
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis'${
      style ? " xmlns:mstts='http://www.w3.org/2001/mstts'" : ''
    } xml:lang='${voice.ssmlLang}'>${voiced}</speak>`
  );
}

/**
 * Speak `text` with a neural voice. Resolves when playback finishes,
 * rejects quickly if every transport is unreachable (caller falls back).
 * r131: transports are (1) the configured HTTP proxy when set, else
 * (2) the direct readaloud WebSocket.
 */
export function speakEdge(text: string, opts: EdgeVoiceOpts): Promise<void> {
  stopEdge();
  const ssml = buildEdgeSsml(text, opts);
  const proxy = getTtsProxy();
  const run = (markup: string) =>
    proxy ? speakEdgeViaProxy(markup, proxy, opts) : speakEdgeViaSocket(markup, opts);
  return run(ssml).catch((err: unknown) => {
    const msg = (err as Error | undefined)?.message ?? '';
    if (msg === 'canceled' || opts.forcePlain) return Promise.reject(err);
    // Styled utterance failed → one plain retry so non-Yue / male voices still speak
    // when express-as is rejected. Yue female often succeeds on the styled first try.
    stopEdge();
    const plain = buildEdgeSsml(text, { ...opts, forcePlain: true });
    return run(plain);
  });
}

// Shared tail: hand a finished mp3 blob to an <audio> element. The
// currentAudio/pendingReject bookkeeping is identical for both transports —
// stopEdge() cancels playback AND rejects the pending promise either way.
function playMp3Blob(blob: Blob, opts: EdgeVoiceOpts, resolve: () => void, reject: (err: Error) => void): void {
  const url = URL.createObjectURL(blob);
  let audio: HTMLAudioElement;
  try {
    audio = new Audio(url);
  } catch (err) {
    URL.revokeObjectURL(url);
    reject(err instanceof Error ? err : new Error(String(err)));
    return;
  }
  try { pinDefaultOutput(audio); } catch { /* sink pin is best-effort */ }
  // A read-only volume setter on iOS must not skip play().
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
  audio.play().catch((e: unknown) => {
    if (currentAudio === audio) currentAudio = null;
    URL.revokeObjectURL(url);
    reject(e instanceof Error ? e : new Error(String(e)));
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
