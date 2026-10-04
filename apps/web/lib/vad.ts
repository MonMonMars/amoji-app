'use client';
// r2026-10-04.87 — Silero VAD alongside the Web Speech mic.
//
// Research summary (why this design): the SOTA browser voice-activity
// detector used by the open-source ChatGPT voice clones is Silero VAD via
// @ricky0123/vad-web — a ~2MB ONNX model running client-side in ONNX
// Runtime Web, free, no API key. The Web Speech API alone is accurate but
// slow to react: it cannot say "a human just started talking" until the
// first recognized word lands, and its end-of-speech timing is a black box.
// The VAD watches raw audio frames, so it gives us two things the recognizer
// can't:
//   1. onSpeechStart the INSTANT real speech begins — noise, music and TV
//      never cross the threshold, so mic-level barge-in is trustworthy;
//   2. onSpeechEnd with a short hangover — a true "you stopped talking"
//      signal instead of a blind silence timer.
//
// Loaded from CDN at runtime ON PURPOSE: package.json (and the CI lockfile)
// stays untouched, and any failure — offline, CDN blocked, old browser,
// mic denied — resolves null, so the caller falls back to the previous
// behaviour instead of breaking voice mode.

export interface VadHooks {
  /** real human speech detected — barge-in, wake the UI */
  onSpeechStart(): void;
  /** speech ended (short hangover applied) — safe to flush the utterance */
  onSpeechEnd(): void;
}

export interface VadHandle {
  stop(): void;
}

const ORT_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.js';
const BUNDLE_URL = 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/bundle.min.js';
const ASSET_BASE = 'https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.29/dist/';
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';

let loadPromise: Promise<boolean> | null = null;

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`script failed: ${src}`));
    document.head.appendChild(s);
  });
}

/** inject the ONNX runtime + the VAD bundle exactly once; never throws */
function loadRuntime(): Promise<boolean> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') return false;
      const w = window as unknown as { vad?: unknown };
      if (!w.vad) {
        await injectScript(ORT_URL);
        await injectScript(BUNDLE_URL);
      }
      return !!w.vad;
    } catch {
      return false;
    }
  })();
  return loadPromise;
}

/**
 * Start voice-activity detection. Resolves a handle with stop(), or null
 * when the runtime could not load (offline / CDN blocked / unsupported) —
 * callers MUST treat null as "keep the previous behaviour", never an error.
 */
export async function startVad(hooks: VadHooks): Promise<VadHandle | null> {
  if (typeof window === 'undefined') return null;
  if (!(await loadRuntime())) return null;
  const w = window as unknown as {
    vad?: { MicVAD?: { 'new': (options: Record<string, unknown>) => Promise<unknown> } };
  };
  const micVadStatic = w.vad?.MicVAD;
  if (!micVadStatic) return null;
  try {
    const micVad = (await micVadStatic['new']({
      baseAssetPath: ASSET_BASE,
      onnxWASMBasePath: WASM_BASE,
      // per the integration guides: 0.5/0.35 balances sensitivity against
      // false triggers; minSpeechFrames≈3 ignores blips; redemptionFrames≈10
      // (~200ms hangover) keeps a breath mid-sentence from "ending" speech
      positiveSpeechThreshold: 0.5,
      negativeSpeechThreshold: 0.35,
      minSpeechFrames: 3,
      redemptionFrames: 10,
      onSpeechStart: () => hooks.onSpeechStart(),
      onSpeechEnd: () => hooks.onSpeechEnd(),
    })) as { destroy(): void };
    return { stop: () => { try { micVad.destroy(); } catch { /* already gone */ } } };
  } catch {
    return null;
  }
}
