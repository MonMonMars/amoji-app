'use client';
// Speech-to-text via the browser's built-in Web Speech API — free, no key,
// and on-device on Apple platforms. Cantonese maps to zh-HK (Apple's
// Cantonese recognizer).

const LANG_MAP: Record<string, string> = {
  yue: 'zh-HK',
  zh: 'zh-CN',
  ja: 'ja-JP',
  en: 'en-US',
};

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognitionCtor = new () => RecognitionLike;

function ctor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function listenSupported(): boolean {
  return ctor() !== undefined;
}

export interface ListenOptions {
  onStart?: (rec: { stop: () => void }) => void;
}

/** Listen for one utterance; resolves with the transcript, rejects on error/no-speech. */
export function listenOnce(lang: string, opts?: ListenOptions): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const C = ctor();
    if (!C) { reject(new Error('unsupported')); return; }
    const rec = new C();
    rec.lang = LANG_MAP[lang] ?? 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    let settled = false;
    const finish = (fn: () => void) => { if (!settled) { settled = true; fn(); } };
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript;
      finish(() => (transcript ? resolve(transcript) : reject(new Error('empty'))));
    };
    rec.onerror = (e) => finish(() => reject(new Error(e?.error ?? 'error')));
    rec.onend = () => finish(() => reject(new Error('no-speech')));
    opts?.onStart?.({ stop: () => rec.stop() });
    try { rec.start(); } catch (err) { finish(() => reject(err instanceof Error ? err : new Error(String(err)))); }
  });
}
