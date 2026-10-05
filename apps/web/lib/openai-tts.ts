'use client';
// ChatGPT-grade emotional TTS — OpenAI gpt-4o-mini-tts (tier 0, r2026-10-05.112).
// This is the same engine family ChatGPT's Advanced Voice Mode speaks with: the
// emotion is not SSML numbers but a natural-language "instructions" prompt —
// "a close friend on a video call who is genuinely delighted — audible smile…"
// — so the delivery laughs, breathes and reacts like a person instead of
// reading like GPS. The instruction builder below is distilled from the
// previous agents' engine (agents-zips/cursor …/companionTtsProsody.js +
// openaiTts.mjs), which is the "good voice" Simon remembers.
//
// WHY A PAID TIER AT ALL: the free chain (edge-tts → google-tts → browser) is
// prosody-only — pitch/rate numbers on top of a neutral read. On Simon's
// network the edge socket is blocked, Pollinations' free emotional TTS is
// deprecated, so the app was landing on the flattest voices every time. This
// tier sits AHEAD of the free chain: configured + reachable → every reply is
// ChatGPT-voice; anything fails → silent, harmless fall-through to the
// existing edge→gtts→synth chain (nothing below changes when this is off).
//
// CORS: api.openai.com refuses browser calls (verified live, 10/5). So the
// key + an optional custom endpoint live in localStorage on this device only;
// with no endpoint set the tier tries the official API, fails fast on CORS
// and the chain continues below. Point the endpoint at any tiny proxy
// (e.g. a free Cloudflare Worker forwarding to api.openai.com) and every
// device gets the good voice. Cost is tiny: gpt-4o-mini-tts ≈ US$0.60-1/month
// for daily companion use.
//
// Voices (OpenAI built-ins, gender-correct, hash-picked per character):
//   female: coral · marin · shimmer     male: ash · alloy · echo
// The model is multilingual — yue/zh/ja/en all ride the same voice, with the
// instruction prompt (and a language line) steering pronunciation.

export interface OpenAiVoiceOpts {
  /** 'yue' | 'zh' | 'ja' | 'en' */
  lang: string;
  gender: 'female' | 'male';
  /** character id — stable hash picks her/his personal voice */
  character?: string;
  /** dominant felt emotion (joy/sadness/anger/…/neutral) */
  emotion?: string;
  /** character expressiveness 0.6..1.8 — widens the affect */
  expressiveness?: number;
  /** fired once the audio element actually starts playing (media gate open) */
  onPlaying?: () => void;
}

const KEY_KEY = 'amoji.openai.key';
const ENDPOINT_KEY = 'amoji.openai.endpoint';
const ENABLED_KEY = 'amoji.openai.enabled';
const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/audio/speech';
const MODEL = 'gpt-4o-mini-tts';
const MAX_CHARS = 1500;
const TIMEOUT_MS = 8_000;

// ---- settings accessors (Settings sheet reads/writes these) -----------------
export function openAiKey(): string {
  try { return localStorage.getItem(KEY_KEY) ?? ''; } catch { return ''; }
}
export function setOpenAiKey(key: string): void {
  try { localStorage.setItem(KEY_KEY, key.trim()); } catch { /* ignore */ }
}
export function openAiEndpoint(): string {
  try { return (localStorage.getItem(ENDPOINT_KEY) ?? '').trim(); } catch { return ''; }
}
export function setOpenAiEndpoint(url: string): void {
  try { localStorage.setItem(ENDPOINT_KEY, url.trim()); } catch { /* ignore */ }
}
export function openAiEnabled(): boolean {
  try { return localStorage.getItem(ENABLED_KEY) !== 'off'; } catch { return true; }
}
export function setOpenAiEnabled(on: boolean): void {
  try { localStorage.setItem(ENABLED_KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
}
/** Tier 0 may run: user turned it on AND a key exists. (Reachability is
 *  proven per-utterance — a CORS-blocked endpoint simply falls through.) */
export function openAiVoiceReady(): boolean {
  return openAiEnabled() && openAiKey().length > 0;
}

// ---- voice casting -----------------------------------------------------------
const FEMALE_VOICES = ['coral', 'marin', 'shimmer'] as const;
const MALE_VOICES = ['ash', 'alloy', 'echo'] as const;

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function openAiVoiceFor(gender: 'female' | 'male', character?: string): string {
  const pool = gender === 'male' ? MALE_VOICES : FEMALE_VOICES;
  const seed = character ? hashStr(character) : Math.floor(Math.random() * pool.length);
  return pool[seed % pool.length]!;
}

// ---- instruction builder (distilled from the cursor engine) -----------------
// Natural-language direction is what makes this voice feel alive; every line
// below exists because its absence made a "newsreader" take over in testing.
function buildInstructions(opts: OpenAiVoiceOpts, text: string): string {
  const e = String(opts.emotion ?? 'neutral');
  const ex = Math.max(0.6, Math.min(1.8, opts.expressiveness ?? 1));
  const isEnglish = opts.lang === 'en';
  const isYue = opts.lang === 'yue';
  const isZh = opts.lang === 'zh';
  const isJa = opts.lang === 'ja';

  // affect: who is speaking right now
  const affect =
    e === 'joy' || e === 'excitement' || e === 'pride'
      ? 'A close friend on a video call who is genuinely delighted — audible smile, bright vowels, playful lift on exclamations.'
      : e === 'love' || e === 'contentment' || e === 'relief'
        ? 'A close friend who adores the person they are talking to — warm, soft, affectionate, close-mic.'
        : e === 'sadness' || e === 'shame' || e === 'guilt' || e === 'embarrassment'
          ? 'A close friend comforting you. Soft, warm, empathetic — voice trembles slightly on caring words, never flat.'
          : e === 'anger' || e === 'contempt' || e === 'disgust'
            ? 'A close friend who is firm and intense — sharper consonants, controlled heat, never shouting.'
            : e === 'surprise' || e === 'fear'
              ? 'A close friend gasping with delight — quick pitch jump, almost breathless, then warm recovery.'
              : e === 'confusion' || e === 'boredom'
                ? 'A close friend thinking out loud. Curious hums, breath before ideas, pitch that rises when a thought lands.'
                : 'ChatGPT Advanced Voice: a warm close friend on a video call. Emotionally alive on every syllable — never GPS, never newsreader.';
  const eff = ex >= 1.25
    ? (isEnglish ? 'Extra animated and bubbly — let feelings overflow a little.' : '特別生動活潑——俾啲情感流露晒出嚟。')
    : ex <= 0.9
      ? (isEnglish ? 'Calm and gentle, but still vary pitch naturally.' : '溫柔淡定，但聲調依然要有自然起伏。')
      : '';

  // language line — the model is multilingual; this anchors pronunciation
  const language = isYue
    ? 'Speak in Cantonese (Hong Kong, 廣東話) — colloquial, casual chat, NEVER formal reading or news style.'
    : isZh
      ? 'Speak in Mandarin Chinese (中文) — natural conversational tone, never a newsreader.'
      : isJa
        ? 'Speak in Japanese (日本語) — natural, friendly conversational tone.'
        : 'Speak in English — natural, friendly conversational tone.';

  // punctuation & laugh colour
  const laughs =
    /哈哈|呵呵|嘻嘻|haha|hehe/i.test(text)
      ? (isEnglish ? 'Play any laugh as a real chuckle, never spell "haha" as a word.' : '笑要真係笑出嚟，唔好將「哈哈」當字讀出嚟。')
      : /哇|嘩|wow/i.test(text)
        ? (isEnglish ? 'Let any "wow" land with a pitch jump.' : '「哇」要有驚喜嘅音調跳動。')
        : /嗯|唔|um+|hmm|呣/i.test(text)
          ? (isEnglish ? 'Natural thinking hum before the sentence — soft filler, not a word.' : '諗嘢嘅「嗯」要自然，似語氣唔似讀字。')
          : '';
  const pauses = /[…\.]{3,}/.test(text)
    ? (isEnglish ? 'Meaningful pause around ellipses.' : '省略號位要停一停，有意味。')
    : (isEnglish ? 'Light comma pauses. Tiny beat after ! or ? then continue. Do not rush.' : '逗號位輕輕停，感嘆號問號之後停一拍先繼續，唔好趕。');
  const question = /[?？]\s*$/.test(text)
    ? (isEnglish ? 'End the question with a rising, curious last word.' : '問句尾字音調上揚，帶好奇。')
    : '';

  const delivery = isEnglish
    ? 'You are ChatGPT Advanced Voice Mode. React. Never sound like Siri, GPS, a newsreader, or an audiobook.'
    : '你係 ChatGPT Advanced Voice。要有反應。絕對唔好似 Siri、導航、新聞報道或者朗讀。';
  const continuity = isEnglish
    ? 'One continuous take, one consistent voice identity start to finish — never switch speaker mid-sentence.'
    : '成段音係同一個人一次過講，由頭到尾同一把聲，絕對唔好講到一半似換咗人。';

  return [
    `Voice Affect: ${affect}`,
    eff,
    `Language: ${language}`,
    question,
    `Delivery: ${delivery}`,
    `Continuity: ${continuity}`,
    `Pauses: ${pauses}`,
    laughs ? `Color: ${laughs}` : '',
    'Never: monotone, robotic, even pitch, announcer cadence, or switching speaker mid-clip.',
  ].filter(Boolean).join('\n');
}

// ---- current playback (so stopSpeaking can cut it) — same contract as edge-tts
let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let pendingReject: ((err: Error) => void) | null = null;

export function stopOpenAi(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.onplay = null;
    currentAudio = null;
  }
  if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = null; }
  if (pendingReject) {
    const rejectPending = pendingReject;
    pendingReject = null;
    rejectPending(new Error('canceled'));
  }
}

/**
 * Speak `text` with OpenAI emotional TTS. Resolves when playback finishes;
 * rejects quickly (timeout / network / CORS / HTTP error) so the caller's
 * fallback chain takes over. A 'canceled' rejection means a newer line (or
 * stopSpeaking) cut this one — the caller must NOT fall through on it.
 */
export function speakOpenAi(text: string, opts: OpenAiVoiceOpts): Promise<void> {
  stopOpenAi();
  return new Promise<void>((resolve, reject) => {
    const clean = text.replace(/[*_`#>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
    if (!clean) { reject(new Error('openai-tts empty')); return; }

    const controller = new AbortController();
    let settled = false;
    const cleanup = () => { clearTimeout(timer); };
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      try { controller.abort(); } catch { /* ignore */ }
      stopOpenAi();
      reject(err);
    };
    const timer = setTimeout(() => {
      controller.abort();
      fail(new Error('openai-tts timeout'));
    }, TIMEOUT_MS);
    pendingReject = fail;

    const endpoint = openAiEndpoint() || DEFAULT_ENDPOINT;
    const body = {
      model: MODEL,
      voice: openAiVoiceFor(opts.gender, opts.character),
      input: clean,
      instructions: buildInstructions(opts, clean),
      response_format: 'mp3',
    };

    fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).then((res) => {
      if (!res.ok) {
        // short error detail (401 = bad key, 429 = quota; CORS never gets here)
        res.text().then((detail) => {
          fail(new Error(`openai-tts-${res.status}${detail ? `: ${detail.slice(0, 100)}` : ''}`));
        }).catch(() => fail(new Error(`openai-tts-${res.status}`)));
        return;
      }
      return res.blob();
    }).then((blob) => {
      if (!blob || settled) return;
      settled = true;
      cleanup();
      pendingReject = null;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      currentUrl = url;
      audio.onplay = () => { try { opts.onPlaying?.(); } catch { /* ignore */ } };
      audio.onended = () => {
        if (currentAudio === audio) { currentAudio = null; currentUrl = null; }
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        if (currentAudio === audio) { currentAudio = null; currentUrl = null; }
        URL.revokeObjectURL(url);
        reject(new Error('openai-tts playback failed'));
      };
      audio.play().catch((e: unknown) => {
        if (currentAudio === audio) { currentAudio = null; currentUrl = null; }
        URL.revokeObjectURL(url);
        reject(e instanceof Error ? e : new Error(String(e)));
      });
    }).catch((err: unknown) => {
      if (settled) return;
      // fetch rejection: AbortError (timeout) or TypeError (network/CORS block)
      fail(err instanceof Error ? err : new Error(String(err)));
    });
  });
}
