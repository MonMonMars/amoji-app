'use client';
// Optional Azure Speech TTS (free F0 tier) for the voice bake-off panel.
// Uses the Cognitive Services REST endpoint — no npm SDK (GitHub Pages friendly).
// Keys stay in localStorage or build-time NEXT_PUBLIC_* / EXPO_PUBLIC_* env vars;
// never commit secrets.

import type { Lang } from './prefs';

const KEY_STORAGE = 'amoji.azure.speech.key';
const REGION_STORAGE = 'amoji.azure.speech.region';
const DEFAULT_REGION = 'eastasia';

const VOICES: Record<Lang, { female: string; male: string }> = {
  yue: { female: 'zh-HK-HiuMaanNeural', male: 'zh-HK-WanLungNeural' },
  zh: { female: 'zh-CN-XiaoxiaoNeural', male: 'zh-CN-YunjianNeural' },
  ja: { female: 'ja-JP-NanamiNeural', male: 'ja-JP-KeitaNeural' },
  en: { female: 'en-US-JennyNeural', male: 'en-US-GuyNeural' },
};

function envKey(): string {
  const v = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY ?? process.env.EXPO_PUBLIC_AZURE_SPEECH_KEY ?? '';
  return v.trim();
}

function envRegion(): string {
  const v = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION
    ?? process.env.EXPO_PUBLIC_AZURE_SPEECH_REGION
    ?? DEFAULT_REGION;
  return v.trim() || DEFAULT_REGION;
}

export function azureSpeechKey(): string {
  const fromEnv = envKey();
  if (fromEnv) return fromEnv;
  try { return (localStorage.getItem(KEY_STORAGE) ?? '').trim(); } catch { return ''; }
}

export function setAzureSpeechKey(key: string): void {
  try { localStorage.setItem(KEY_STORAGE, key.trim()); } catch { /* ignore */ }
}

export function azureSpeechRegion(): string {
  try {
    const stored = (localStorage.getItem(REGION_STORAGE) ?? '').trim();
    if (stored) return stored;
  } catch { /* ignore */ }
  return envRegion();
}

export function setAzureSpeechRegion(region: string): void {
  try { localStorage.setItem(REGION_STORAGE, region.trim() || DEFAULT_REGION); } catch { /* ignore */ }
}

/** True when a subscription key is available (env or saved). */
export function azureSpeechReady(): boolean {
  return azureSpeechKey().length > 0;
}

let currentAudio: HTMLAudioElement | null = null;

export function stopAzureSpeech(): void {
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio = null;
  }
}

export interface AzureSpeechOpts {
  lang: Lang;
  gender: 'female' | 'male';
  onPlaying?: () => void;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function speakAzure(text: string, opts: AzureSpeechOpts): Promise<void> {
  stopAzureSpeech();
  const key = azureSpeechKey();
  if (!key) return Promise.reject(new Error('Azure Speech key not configured'));
  const region = azureSpeechRegion();
  const voice = VOICES[opts.lang]?.[opts.gender] ?? VOICES.en.female;
  const ssml = `<speak version="1.0" xml:lang="${voice.slice(0, 5)}" xmlns="http://www.w3.org/2001/10/synthesis"><voice name="${voice}">${escapeXml(text)}</voice></speak>`;
  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  return fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
    },
    body: ssml,
  }).then(async (res) => {
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Azure TTS ${res.status}${detail ? `: ${detail.slice(0, 120)}` : ''}`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(blobUrl);
      currentAudio = audio;
      const cleanup = () => URL.revokeObjectURL(blobUrl);
      audio.onended = () => { cleanup(); currentAudio = null; resolve(); };
      audio.onerror = () => { cleanup(); currentAudio = null; reject(new Error('Azure playback failed')); };
      void audio.play().then(() => {
        try { opts.onPlaying?.(); } catch { /* ignore */ }
      }).catch((e: unknown) => {
        cleanup();
        currentAudio = null;
        reject(e instanceof Error ? e : new Error(String(e)));
      });
    });
  });
}
