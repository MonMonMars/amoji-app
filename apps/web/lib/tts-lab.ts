// TTS Lab — every free / research / backup engine listed so the user can
// click and audition one by one. Shipping chat still uses freeVoiceHops;
// this catalog is for listening and comparison only.

import type { EngineStatus } from './voice-capability';
import type { Lang } from './prefs';

export type TtsLabAudition =
  /** Play via Google Translate MP3. */
  | 'gtts'
  /** Try Edge neural (usually 403). */
  | 'edge'
  /** Browser speechSynthesis default for locale. */
  | 'synth'
  /** canto-nano stub (rejects until bundled). */
  | 'canto-nano'
  /** Open an external demo / docs URL (WASM models not in-app yet). */
  | 'external'
  /** Needs a paid key — explain only. */
  | 'gated'
  /** No play path — show status only. */
  | 'none';

export interface TtsLabEngine {
  id: string;
  /** Short display name. */
  name: string;
  /** One-line what it is. */
  blurb: string;
  status: EngineStatus | 'external-demo';
  audition: TtsLabAudition;
  /** Preferred locale for the sample line. */
  sampleLang: Lang;
  /** Optional demo / docs URL for external / gated engines. */
  demoUrl?: string;
  /** Cantonese usable today? */
  yue: 'yes' | 'no' | 'unverified' | 'n/a';
  /** Rough size / cost note. */
  costNote: string;
}

/**
 * Full lab list — research pack (2026-11-08) + existing engine audit.
 * Order: playable first, then demos, then gated/dead.
 */
export const TTS_LAB_ENGINES: readonly TtsLabEngine[] = [
  {
    id: 'gtts',
    name: 'Google Translate TTS',
    blurb: 'Keyless MP3 hop — one speaker per language code (tl).',
    status: 'works',
    audition: 'gtts',
    sampleLang: 'yue',
    yue: 'yes',
    costNote: '$0 · shipping default',
  },
  {
    id: 'speech',
    name: 'OS speechSynthesis',
    blurb: 'Device voices installed on this browser / OS.',
    status: 'browser',
    audition: 'synth',
    sampleLang: 'yue',
    yue: 'n/a',
    costNote: '$0 · last hop / offline',
  },
  {
    id: 'edge',
    name: 'Microsoft Edge neural',
    blurb: 'Read-aloud WebSocket — currently refuses this app (403).',
    status: 'dead',
    audition: 'edge',
    sampleLang: 'yue',
    yue: 'n/a',
    costNote: '$0 if it ever reopens',
  },
  {
    id: 'qwen3-tts-wasm',
    name: 'Qwen3-TTS WASM (clone)',
    blurb: 'Browser CPU clone from a short clip — Cantonese accent unverified.',
    status: 'external-demo',
    audition: 'external',
    sampleLang: 'zh',
    demoUrl: 'https://huggingface.co/spaces/fusorlabs/qwen3-tts-wasm',
    yue: 'unverified',
    costNote: '$0 · ~1068 MB opt-in download',
  },
  {
    id: 'canto-nano',
    name: 'canto-tts-nano',
    blurb: 'Proven HK Cantonese ONNX (CER ~12%) — runtime not in this app yet.',
    status: 'not-bundled',
    audition: 'canto-nano',
    sampleLang: 'yue',
    demoUrl: 'https://huggingface.co/typangaa/canto-tts-nano',
    yue: 'yes',
    costNote: '$0 · ~764 MB when ported',
  },
  {
    id: 'ming-tts',
    name: 'Ming-3.0-TTS WASM',
    blurb: 'MIT browser TTS; dialect field null in web build — no yue control.',
    status: 'external-demo',
    audition: 'external',
    sampleLang: 'zh',
    demoUrl: 'https://huggingface.co/spaces/fusorlabs/ming-3.0-tts-0.5b-web',
    yue: 'no',
    costNote: '$0 · ~850 MB web bundle',
  },
  {
    id: 'kokoro',
    name: 'Kokoro (zh fork)',
    blurb: 'Many Mandarin voices in ONNX — no Cantonese checkpoint.',
    status: 'not-bundled',
    audition: 'external',
    sampleLang: 'zh',
    demoUrl: 'https://huggingface.co/onnx-community/Kokoro-82M-v1.1-zh-ONNX',
    yue: 'no',
    costNote: '$0 · Mandarin only',
  },
  {
    id: 'piper',
    name: 'Piper',
    blurb: 'Lightweight ONNX TTS — no verified free yue voice in-browser.',
    status: 'not-bundled',
    audition: 'none',
    sampleLang: 'en',
    yue: 'no',
    costNote: '$0 · not bundled',
  },
  {
    id: 'melotts',
    name: 'MeloTTS',
    blurb: 'Multi-lingual research TTS — not in this web bundle.',
    status: 'not-bundled',
    audition: 'none',
    sampleLang: 'en',
    yue: 'no',
    costNote: '$0 · not bundled',
  },
  {
    id: 'bark',
    name: 'Bark',
    blurb: 'Expressive but slow — not suitable as a live chat hop.',
    status: 'not-bundled',
    audition: 'none',
    sampleLang: 'en',
    yue: 'no',
    costNote: 'not bundled',
  },
  {
    id: 'openai-tts',
    name: 'OpenAI TTS (BYOK)',
    blurb: 'gpt-4o-mini-tts voices — needs your own key + relay.',
    status: 'gated',
    audition: 'gated',
    sampleLang: 'en',
    yue: 'n/a',
    costNote: 'paid · user key',
  },
  {
    id: 'google-chirp3',
    name: 'Google Chirp 3 HD',
    blurb: 'Verified 34 yue-HK voices — Pro backup after revenue.',
    status: 'gated',
    audition: 'gated',
    sampleLang: 'yue',
    demoUrl: 'https://cloud.google.com/text-to-speech/docs/chirp3-hd',
    yue: 'yes',
    costNote: 'paid · ~$30/M chars',
  },
  {
    id: 'qwen3-tts-flash',
    name: 'Qwen3-TTS Flash (Alibaba)',
    blurb: 'Claimed ~$10/M with some Yue — CORS & voice list unverified.',
    status: 'gated',
    audition: 'gated',
    sampleLang: 'yue',
    yue: 'unverified',
    costNote: 'paid · verify later',
  },
];

export function ttsLabById(id: string): TtsLabEngine | undefined {
  return TTS_LAB_ENGINES.find((e) => e.id === id);
}

export function ttsLabPlayable(): readonly TtsLabEngine[] {
  return TTS_LAB_ENGINES.filter((e) => e.audition === 'gtts' || e.audition === 'synth' || e.audition === 'edge');
}
