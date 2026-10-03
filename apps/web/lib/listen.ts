'use client';
// Speech-to-text via the browser's built-in Web Speech API — free, no key,
// and on-device on Apple platforms. Cantonese maps to zh-HK (Apple's
// Cantonese recognizer).
//
// r2026-10-03.13: listenContinuous() adds ChatGPT-style voice mode — the mic
// stays open across utterances and auto-restarts through silences, while
// onSpeechStart fires the moment REAL talking is detected (the API never
// emits results for background noise), so the caller can barge-in and cut
// the companion's voice instantly.

const LANG_MAP: Record<string, string> = {
  yue: 'zh-HK',
  zh: 'zh-CN',
  ja: 'ja-JP',
  en: 'en-US',
};

interface SpeechAlternative { transcript: string }
interface SpeechResult extends ArrayLike<SpeechAlternative> { isFinal?: boolean }

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<SpeechResult> }) => void) | null;
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

export interface ContinuousListenOptions {
  /** fired each time the recognizer actually starts capturing */
  onStart?: () => void;
  /**
   * First REAL talking detected in the current burst of speech. The Web
   * Speech API only produces results for actual human speech — background
   * noise, music and TV never fire this — so this is a trustworthy
   * voice-activity signal. Use it to barge-in: cut the companion's voice
   * off the instant the user starts talking, exactly like ChatGPT.
   */
  onSpeechStart?: () => void;
  /** each finished utterance — typically fed straight into the chat send() */
  onFinal: (text: string) => void;
  /** mode ended permanently (unsupported / mic permission denied) */
  onEnd?: (reason?: string) => void;
}

/**
 * ChatGPT-style voice mode: the mic stays open and keeps listening across
 * utterances. Browsers silently drop continuous sessions after a silence —
 * this restarts the recognizer automatically until you call the returned
 * stop() (or the mic errors out for good).
 */
export function listenContinuous(lang: string, opts: ContinuousListenOptions): () => void {
  const C = ctor();
  if (!C) { opts.onEnd?.('unsupported'); return () => {}; }
  let active = true;
  let rec: RecognitionLike | null = null;
  let bargeInFired = false;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;

  const start = () => {
    if (!active) return;
    rec = new C();
    rec.lang = LANG_MAP[lang] ?? 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = true;
    rec.onresult = (e) => {
      let interim = '';
      let finalText = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]!;
        const t = r[0]?.transcript ?? '';
        if (r.isFinal) finalText += t;
        else interim += t;
      }
      const heard = (finalText + interim).trim();
      // any recognized text means a real voice (noise never reaches here),
      // so barge-in exactly once per burst of talking
      if (heard && !bargeInFired) { bargeInFired = true; opts.onSpeechStart?.(); }
      const said = finalText.trim();
      if (said) { bargeInFired = false; opts.onFinal(said); }
    };
    rec.onerror = (e) => {
      const err = e?.error ?? 'error';
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        active = false;
        opts.onEnd?.(err);
      }
      // 'no-speech' / 'aborted' / network hiccups fall through to onend → restart
    };
    rec.onend = () => {
      if (!active) return;
      restartTimer = setTimeout(start, 250);
    };
    try { rec.start(); opts.onStart?.(); } catch { restartTimer = setTimeout(start, 500); }
  };
  start();

  return () => {
    active = false;
    if (restartTimer) clearTimeout(restartTimer);
    try { rec?.stop(); } catch { /* already stopped */ }
  };
}
