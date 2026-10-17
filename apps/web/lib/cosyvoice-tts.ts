'use client';
// Optional CosyVoice experiment. Off unless Settings turns it on AND a
// self-hosted server URL is saved. This module does not download weights
// and does not replace Edge or speechSynthesis.
//
// The client speaks only the official FastAPI route POST /inference_sft
// (FunAudioLLM/CosyVoice runtime/python/fastapi/server.py). That route
// returns raw mono int16 PCM, not a WAV file. Playback wraps a header at
// CosyVoice-300M-SFT's 22050 Hz. CosyVoice2 / CosyVoice3 are zero-shot
// and are not this client — their default server has no SFT speakers and
// answers with a speaker KeyError, which falls through to Edge.

import type { Lang } from './prefs';
import { pinDefaultOutput } from './audio-output';
import { applyPlaybackVolume } from './playback-volume';

const FLAG_KEY = 'amoji.cosyvoice.experimental.v1';
const ENDPOINT_KEY = 'amoji.cosyvoice.endpoint.v1';

/** CosyVoice-300M-SFT sample rate. v2/v3 are 24000 Hz and are out of scope. */
export const COSYVOICE_SFT_SAMPLE_RATE_HZ = 22050;

/**
 * How long a live reply waits on the server before the next hop (Edge)
 * speaks. A cold GPU or a CPU box will miss this and fall through.
 */
export const COSYVOICE_ATTEMPT_MS = 8_000;

/**
 * Speakers baked into CosyVoice-300M-SFT `spk2info`
 * (中文女 / 中文男 / 日语男 / 粤语女 / 英文女 / 英文男 / 韩语女).
 * Null means that model has no matching speaker — the hop rejects
 * immediately and Edge speaks. There is no 粤语男 and no 日语女.
 */
export const COSYVOICE_SFT_SPEAKERS: Record<Lang, { female: string | null; male: string | null }> = {
  yue: { female: '粤语女', male: null },
  zh: { female: '中文女', male: '中文男' },
  ja: { female: null, male: '日语男' },
  en: { female: '英文女', male: '英文男' },
};

export function cosyvoiceSpeaker(lang: Lang, gender: 'female' | 'male'): string | null {
  return COSYVOICE_SFT_SPEAKERS[lang]?.[gender] ?? null;
}

/** Experiment switch. Missing storage is off. */
export function experimentalCosyvoiceEnabled(): boolean {
  try { return localStorage.getItem(FLAG_KEY) === 'on'; } catch { return false; }
}

export function setExperimentalCosyvoiceEnabled(on: boolean): void {
  try { localStorage.setItem(FLAG_KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
  if (!on) stopCosyVoice();
}

/**
 * Saved server origin, else build-time NEXT_PUBLIC_COSYVOICE_URL.
 * A saved empty string overrides the env URL (Clear in Settings).
 */
export function cosyvoiceEndpoint(): string {
  try {
    const stored = localStorage.getItem(ENDPOINT_KEY);
    if (stored !== null) return stored.trim().replace(/\/+$/, '');
  } catch { /* ignore */ }
  return (process.env.NEXT_PUBLIC_COSYVOICE_URL ?? '').trim().replace(/\/+$/, '');
}

export function setCosyvoiceEndpoint(url: string | null): void {
  try {
    if (url === null) localStorage.removeItem(ENDPOINT_KEY);
    else localStorage.setItem(ENDPOINT_KEY, url.trim().replace(/\/+$/, ''));
  } catch { /* ignore */ }
}

/** True only when the experiment is on and a URL is configured. */
export function cosyvoiceActive(): boolean {
  try {
    return experimentalCosyvoiceEnabled() && cosyvoiceEndpoint().length > 0;
  } catch {
    return false;
  }
}

export function cosyvoiceInferenceUrl(endpoint: string): string {
  const base = endpoint.trim().replace(/\/+$/, '');
  if (!base) throw new Error('cosyvoice: no endpoint');
  if (base.endsWith('/inference_sft')) return base;
  return `${base}/inference_sft`;
}

export function cosyvoiceSftFields(text: string, spkId: string): { tts_text: string; spk_id: string } {
  return { tts_text: text, spk_id: spkId };
}

export type CosyvoicePlan =
  | { ok: true; url: string; fields: { tts_text: string; spk_id: string } }
  | { ok: false; reason: string };

/** Pure request plan. No fetch. Used by the client and by tests. */
export function planCosyvoiceRequest(
  text: string,
  lang: Lang,
  gender: 'female' | 'male',
  endpoint: string,
): CosyvoicePlan {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!endpoint.trim()) return { ok: false, reason: 'cosyvoice: no endpoint' };
  if (!clean) return { ok: false, reason: 'cosyvoice: empty' };
  const spk = cosyvoiceSpeaker(lang, gender);
  if (!spk) return { ok: false, reason: `cosyvoice: no SFT speaker for ${lang}/${gender}` };
  return { ok: true, url: cosyvoiceInferenceUrl(endpoint), fields: cosyvoiceSftFields(clean, spk) };
}

/**
 * Wrap raw little-endian int16 mono PCM in a 44-byte WAV header so an
 * `<audio>` element can play the FastAPI body. An odd trailing byte is dropped.
 */
export function wrapPcm16Wav(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const dataSize = pcm.byteLength - (pcm.byteLength % 2);
  const buf = new Uint8Array(44 + dataSize);
  const view = new DataView(buf.buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) buf[offset + i] = text.charCodeAt(i);
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, dataSize, true);
  buf.set(pcm.subarray(0, dataSize), 44);
  return buf;
}

let generation = 0;
let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let abort: AbortController | null = null;
let pendingReject: ((err: Error) => void) | null = null;

export function stopCosyVoice(): void {
  generation += 1;
  if (abort) {
    try { abort.abort(); } catch { /* ignore */ }
    abort = null;
  }
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.onplay = null;
    try { currentAudio.pause(); } catch { /* ignore */ }
    currentAudio = null;
  }
  if (currentUrl) {
    try { URL.revokeObjectURL(currentUrl); } catch { /* ignore */ }
    currentUrl = null;
  }
  if (pendingReject) {
    const rejectPending = pendingReject;
    pendingReject = null;
    rejectPending(new Error('canceled'));
  }
}

export interface CosyvoiceSpeakOpts {
  lang: Lang;
  gender: 'female' | 'male';
  onPlaying?: () => void;
}

/**
 * Speak `text` through a user-hosted CosyVoice-300M-SFT server.
 * Resolves when playback ends. Rejects with Error('canceled') when
 * stopCosyVoice() cuts the line — callers must not fall through on that.
 * Any other rejection is a cue to speak Edge / Web Speech instead.
 */
export function speakCosyVoice(text: string, opts: CosyvoiceSpeakOpts): Promise<void> {
  stopCosyVoice();
  const gen = generation;
  const plan = planCosyvoiceRequest(text, opts.lang, opts.gender, cosyvoiceEndpoint());
  if (!plan.ok) return Promise.reject(new Error(plan.reason));

  return new Promise<void>((resolve, reject) => {
    const controller = new AbortController();
    abort = controller;
    let done = false;
    const timer = setTimeout(() => {
      try { controller.abort(); } catch { /* ignore */ }
      finish(new Error('cosyvoice timeout'));
    }, COSYVOICE_ATTEMPT_MS);

    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      pendingReject = null;
      abort = null;
      if (err) reject(err);
      else resolve();
    };
    pendingReject = (err) => finish(err);

    const body = new URLSearchParams(plan.fields);
    fetch(plan.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    }).then(async (res) => {
      if (done || gen !== generation) return;
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        finish(new Error(`cosyvoice-${res.status}${detail ? `: ${detail.slice(0, 80)}` : ''}`));
        return;
      }
      const pcm = new Uint8Array(await res.arrayBuffer());
      if (done || gen !== generation) return;
      if (pcm.byteLength < 2) {
        finish(new Error('cosyvoice: empty audio'));
        return;
      }
      clearTimeout(timer);
      const wav = wrapPcm16Wav(pcm, COSYVOICE_SFT_SAMPLE_RATE_HZ);
      const copy = new ArrayBuffer(wav.byteLength);
      new Uint8Array(copy).set(wav);
      const url = URL.createObjectURL(new Blob([copy], { type: 'audio/wav' }));
      const audio = new Audio(url);
      pinDefaultOutput(audio);
      applyPlaybackVolume(audio);
      currentAudio = audio;
      currentUrl = url;
      audio.onplay = () => { try { opts.onPlaying?.(); } catch { /* ignore */ } };
      audio.onended = () => {
        if (currentAudio === audio) currentAudio = null;
        if (currentUrl === url) currentUrl = null;
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
        finish();
      };
      audio.onerror = () => {
        if (currentAudio === audio) currentAudio = null;
        if (currentUrl === url) currentUrl = null;
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
        finish(new Error('cosyvoice playback failed'));
      };
      audio.play().catch((e: unknown) => {
        if (currentAudio === audio) currentAudio = null;
        if (currentUrl === url) currentUrl = null;
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
        finish(e instanceof Error ? e : new Error(String(e)));
      });
    }).catch((err: unknown) => {
      if (done || gen !== generation) return;
      const aborted = err instanceof Error && err.name === 'AbortError';
      finish(aborted ? new Error('cosyvoice timeout') : (err instanceof Error ? err : new Error(String(err))));
    });
  });
}
