'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Free neural TTS, straight from the browser — the Microsoft Edge read-aloud
// endpoint (the same engine behind the edge-tts project). No API key, no server,
// no cost: real emotional voices — Cantonese 曉曼 HiuMaan / 雲龍 WanLung,
// 中文 Xiaoxiao / Yunjian, 日本語 Nanami / Keita, English Aria / Guy — with
// SSML prosody (pitch/rate/volume) driven by the emotion engine.
// If the socket is unreachable (some networks block it), voice.ts falls back
// to the browser's speechSynthesis automatically.
// ─────────────────────────────────────────────────────────────────────────────

export interface EdgeVoiceOpts {
  /** 'yue' | 'zh' | 'ja' | 'en' */
  lang: string;
  gender: 'female' | 'male';
  /** SSML prosody deltas — rate/pitch as fractions (-0.5..0.5), volume in dB (-1..1 → ±8dB) */
  rateDelta?: number;
  pitchDelta?: number;
  volumeDelta?: number;
  /** word-boundary events (for precise lip-sync) */
  onWord?: (word: string) => void;
}

const TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WS_BASE = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';

const VOICES: Record<string, { female: string; male: string; ssmlLang: string }> = {
  yue: { female: 'zh-HK-HiuMaanNeural', male: 'zh-HK-WanLungNeural', ssmlLang: 'zh-HK' },
  zh:  { female: 'zh-CN-XiaoxiaoNeural', male: 'zh-CN-YunjianNeural', ssmlLang: 'zh-CN' },
  ja:  { female: 'ja-JP-NanamiNeural', male: 'ja-JP-KeitaNeural', ssmlLang: 'ja-JP' },
  en:  { female: 'en-US-AriaNeural', male: 'en-US-GuyNeural', ssmlLang: 'en-US' },
};

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

// ---- current playback (so stopSpeaking can cut it) ----
let currentAudio: HTMLAudioElement | null = null;

export function stopEdge(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio = null;
  }
}

export function edgeTtsPossible(): boolean {
  return typeof WebSocket !== 'undefined';
}

/**
 * Speak `text` with a neural voice. Resolves when playback finishes,
 * rejects quickly if the endpoint is unreachable (caller falls back).
 */
export function speakEdge(text: string, opts: EdgeVoiceOpts): Promise<void> {
  stopEdge();
  return new Promise<void>((resolve, reject) => {
    const v = VOICES[opts.lang] ?? VOICES.en!;
    const voiceName = opts.gender === 'male' ? v.male : v.female;
    const requestId = guid();
    const ssml =
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${v.ssmlLang}'>` +
      `<voice name='${voiceName}'>` +
      `<prosody pitch='${pct(opts.pitchDelta ?? 0)}' rate='${pct(opts.rateDelta ?? 0)}' volume='${db(opts.volumeDelta ?? 0)}'>` +
      escapeXml(text) +
      `</prosody></voice></speak>`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(`${WS_BASE}?TrustedClientToken=${TRUSTED_TOKEN}&ConnectionId=${guid()}`);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    ws.binaryType = 'arraybuffer';

    const chunks: ArrayBuffer[] = [];
    let settled = false;
    let gotAudio = false;

    const cleanup = () => { clearTimeout(timer); try { ws.close(); } catch { /* already closed */ } };
    const fail = (err: Error) => { if (!settled) { settled = true; cleanup(); stopEdge(); reject(err); } };
    const timer = setTimeout(() => fail(new Error('edge-tts timeout')), 12_000);

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
            const body = str.slice(str.indexOf('\r\n\r\n') + 4);
            const meta = JSON.parse(body) as {
              Metadata?: Array<{ Type: string; Data?: { text?: { Text?: string } } }>;
            };
            for (const m of meta.Metadata ?? []) {
              if (m.Type === 'WordBoundary' && m.Data?.text?.Text) opts.onWord?.(m.Data.text.Text);
            }
          } catch { /* metadata is best-effort */ }
        }
        return;
      }
      // binary frame: ASCII headers first, terminated by \r\n\r\n, then mp3 bytes
      const buf = new Uint8Array(ev.data as ArrayBuffer);
      let headerEnd = -1;
      const scan = Math.min(buf.length - 3, 160);
      for (let i = 0; i < scan; i++) {
        if (buf[i] === 13 && buf[i + 1] === 10 && buf[i + 2] === 13 && buf[i + 3] === 10) { headerEnd = i + 4; break; }
      }
      if (headerEnd >= 0 && buf.length > headerEnd) {
        chunks.push(buf.slice(headerEnd).buffer);
        gotAudio = true;
      }
    };

    ws.onerror = () => fail(new Error('edge-tts socket error'));
    ws.onclose = () => {
      clearTimeout(timer);
      if (settled) return;
      if (!gotAudio || chunks.length === 0) { fail(new Error('edge-tts no audio')); return; }
      settled = true;
      const blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
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
    };
  });
}
