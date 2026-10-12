'use client';
// Voice engine metadata + isolated TTS/STT runners for the Settings bake-off UI.

import type { Lang } from './prefs';
import { speakEdge, stopEdge, edgeTtsPossible } from './edge-tts';
import { speakGtts, stopGtts } from './gtts';
import { speakBrowserOnly, stopSpeaking } from './voice';
import { azureSpeechReady, speakAzure, stopAzureSpeech } from './azure-speech';
import { listenOnce, listenSupported } from './listen';
import { characterVoiceGender } from './voice-gender';

export type BakeoffEngineId = 'browser' | 'edge' | 'gtts' | 'azure';

export interface BakeoffEngine {
  id: BakeoffEngineId;
  name: string;
  costNote: string;
  cantoNote: string;
  latencyNote: string;
  sttAvailable: boolean;
  enabled: boolean;
  disabledReason?: string;
}

export const BAKEOFF_PHRASES: Record<Lang, string[]> = {
  yue: [
    '喂，你聽唔聽到我講嘢呀？今日天氣真係好靚。',
    '我哋試下呢個聲線，睇邊個最似真人講廣東話。',
    '你好呀，我係你嘅 AI 朋友，好開心同你傾計！',
  ],
  zh: [
    '你好，你能听到我说话吗？今天天气真的很不错。',
    '我们一起试试这个声音，看哪个最自然。',
  ],
  ja: [
    'ねえ、聞こえる？今日は本当にいい天気だね。',
  ],
  en: [
    'Hey, can you hear me clearly? The weather is beautiful today.',
    'Let\'s compare these free voices side by side.',
  ],
};

export function bakeoffEngines(): BakeoffEngine[] {
  const azureOk = azureSpeechReady();
  const edgeOk = edgeTtsPossible();
  const stt = listenSupported();

  return [
    {
      id: 'browser',
      name: 'Browser Web Speech',
      costNote: 'Free — built into Chrome / Safari / Edge',
      cantoNote: stt
        ? 'TTS: zh-HK voices on Apple (Sin-ji / HiuMaan); quality varies by OS. STT: zh-HK when available.'
        : 'TTS: zh-HK on Apple devices; Android/Windows may fall back to Mandarin voices.',
      latencyNote: 'Instant (local synth); no network for TTS',
      sttAvailable: stt,
      enabled: typeof speechSynthesis !== 'undefined',
      disabledReason: typeof speechSynthesis === 'undefined' ? 'speechSynthesis unavailable' : undefined,
    },
    {
      id: 'edge',
      name: 'Microsoft Edge neural (edge-tts)',
      costNote: 'Free — same engine as Edge read-aloud; no API key',
      cantoNote: 'Strong free Cantonese: 曉曼 HiuMaan / 雲龍 WanLung neural voices',
      latencyNote: 'Low–medium (~1–3s first byte; WebSocket or your HTTP proxy)',
      sttAvailable: false,
      enabled: edgeOk,
      disabledReason: edgeOk ? undefined : 'WebSocket blocked in this browser',
    },
    {
      id: 'gtts',
      name: 'Google Translate TTS (gTTS)',
      costNote: 'Free — unofficial public endpoint; may change',
      cantoNote: 'zh-HK locale; flatter / less natural than Edge neural',
      latencyNote: 'Medium (HTTPS fetch per clause)',
      sttAvailable: false,
      enabled: true,
    },
    {
      id: 'azure',
      name: 'Azure Speech (F0 free tier)',
      costNote: 'Free tier: 500k chars/month — needs your Azure key (not committed to repo)',
      cantoNote: 'Excellent zh-HK neural (HiuMaan / WanLung) — same family as Edge voices',
      latencyNote: 'Low–medium (REST from browser; CORS may require same-region / key policy)',
      sttAvailable: false,
      enabled: azureOk,
      disabledReason: azureOk
        ? undefined
        : 'Set NEXT_PUBLIC_AZURE_SPEECH_KEY at build or paste key below',
    },
  ];
}

export interface BakeoffRunResult {
  ok: boolean;
  latencyMs: number | null;
  detail: string;
}

export function stopAllBakeoff(): void {
  stopSpeaking();
  stopEdge();
  stopGtts();
  stopAzureSpeech();
}

export async function runBakeoffTts(
  engineId: BakeoffEngineId,
  text: string,
  characterId: string,
  lang: Lang,
): Promise<BakeoffRunResult> {
  stopAllBakeoff();
  const gender = characterVoiceGender(characterId);
  const t0 = performance.now();
  let firstAudioMs: number | null = null;
  const onPlaying = () => {
    if (firstAudioMs === null) firstAudioMs = Math.round(performance.now() - t0);
  };

  try {
    switch (engineId) {
      case 'browser':
        await speakBrowserOnly(text, characterId, lang);
        if (firstAudioMs === null) firstAudioMs = Math.round(performance.now() - t0);
        break;
      case 'edge':
        await speakEdge(text, { lang, gender, character: characterId, onPlaying });
        break;
      case 'gtts':
        await speakGtts(text, { lang, onPlaying });
        break;
      case 'azure':
        await speakAzure(text, { lang, gender, onPlaying });
        break;
      default: {
        const _exhaustive: never = engineId;
        throw new Error(`Unknown engine ${_exhaustive}`);
      }
    }
    const totalMs = Math.round(performance.now() - t0);
    return {
      ok: true,
      latencyMs: firstAudioMs ?? totalMs,
      detail: firstAudioMs != null ? `heard in ~${firstAudioMs}ms (${totalMs}ms total)` : `finished in ${totalMs}ms`,
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: firstAudioMs,
      detail: (err as Error | undefined)?.message ?? 'failed',
    };
  }
}

export async function runBakeoffMic(lang: Lang): Promise<BakeoffRunResult> {
  if (!listenSupported()) {
    return { ok: false, latencyMs: null, detail: 'Web Speech STT not supported in this browser' };
  }
  const t0 = performance.now();
  try {
    const transcript = await listenOnce(lang);
    const ms = Math.round(performance.now() - t0);
    return { ok: true, latencyMs: ms, detail: transcript.trim() || '(empty)' };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - t0),
      detail: (err as Error | undefined)?.message ?? 'listen failed',
    };
  }
}
