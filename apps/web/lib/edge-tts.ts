'use client';
// ─────────────────────────────────────────────────────────────────────────────
// Free neural TTS, straight from the browser — the Microsoft Edge read-aloud
// endpoint (the same engine behind the edge-tts project). No API key, no server,
// no cost: real emotional voices with per-character casting — Cantonese
// 曉曼 HiuMaan / 雲龍 WanLung, 中文 Xiaoxiao / Xiaoyi / Xiaohan / Xiaomo / Yunxi /
// Yunyang, 日本語 Nanami / Keita, English Jenny / Aria / Ana / Michelle / Guy /
// Christopher — driven by SSML prosody with a ChatGPT-style per-clause
// pitch/rate contour (sing-song), sentence pauses, and per-character
// expressiveness. If the socket is unreachable (some networks block it),
// voice.ts falls back to the browser's speechSynthesis automatically.
// ─────────────────────────────────────────────────────────────────────────────

export interface EdgeVoiceOpts {
  /** 'yue' | 'zh' | 'ja' | 'en' */
  lang: string;
  gender: 'female' | 'male';
  /** character id — picks her/his specific voice from the cast */
  character?: string;
  /** how animated the contour is: 0.6 calm … 1.6 very bubbly (default 1) */
  expressiveness?: number;
  /** SSML prosody deltas — rate/pitch as fractions (-0.5..0.5), volume in dB (-1..1 → ±8dB) */
  rateDelta?: number;
  pitchDelta?: number;
  volumeDelta?: number;
  /** word-boundary events (for precise lip-sync) */
  onWord?: (word: string) => void;
}

const TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WS_BASE = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';

/** gender fallback when a character isn't in the cast */
const VOICES: Record<string, { female: string; male: string; ssmlLang: string }> = {
  yue: { female: 'zh-HK-HiuMaanNeural', male: 'zh-HK-WanLungNeural', ssmlLang: 'zh-HK' },
  zh:  { female: 'zh-CN-XiaoxiaoNeural', male: 'zh-CN-YunjianNeural', ssmlLang: 'zh-CN' },
  ja:  { female: 'ja-JP-NanamiNeural', male: 'ja-JP-KeitaNeural', ssmlLang: 'ja-JP' },
  en:  { female: 'en-US-AriaNeural', male: 'en-US-GuyNeural', ssmlLang: 'en-US' },
};

/**
 * Per-character voice cast. Young female characters get bright young voices
 * (Xiaoyi / Ana), calm ones lower (Xiaohan / Aria), male characters real male
 * voices (Yunyang / Yunxi / WanLung / Keita / Guy / Christopher).
 */
const CAST: Record<string, Record<string, string>> = {
  juno:  { yue: 'zh-HK-HiuMaanNeural',   zh: 'zh-CN-XiaoxiaoNeural', ja: 'ja-JP-NanamiNeural', en: 'en-US-JennyNeural' },
  nova:  { yue: 'zh-HK-HiuMaanNeural',   zh: 'zh-CN-XiaohanNeural',  ja: 'ja-JP-NanamiNeural', en: 'en-US-AriaNeural' },
  mochi: { yue: 'zh-HK-HiuMaanNeural',   zh: 'zh-CN-XiaoyiNeural',   ja: 'ja-JP-NanamiNeural', en: 'en-US-AnaNeural' },
  blaze: { yue: 'zh-HK-WanLungNeural',   zh: 'zh-CN-YunyangNeural',  ja: 'ja-JP-KeitaNeural',  en: 'en-US-GuyNeural' },
  kai:   { yue: 'zh-HK-WanLungNeural',   zh: 'zh-CN-YunxiNeural',    ja: 'ja-JP-KeitaNeural',  en: 'en-US-ChristopherNeural' },
  luna:  { yue: 'zh-HK-HiuMaanNeural',   zh: 'zh-CN-XiaomoNeural',   ja: 'ja-JP-NanamiNeural', en: 'en-US-MichelleNeural' },
};

function voiceFor(opts: EdgeVoiceOpts): { name: string; ssmlLang: string } {
  const v = VOICES[opts.lang] ?? VOICES.en!;
  const casted = opts.character ? CAST[opts.character]?.[opts.lang] : undefined;
  const name = casted ?? (opts.gender === 'male' ? v.male : v.female);
  return { name, ssmlLang: v.ssmlLang };
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
function clauses(text: string): string[] {
  return text
    .split(/(?<=[。！？!?；;，,、—…\.])\s*|(?<=[。！？!?…\.])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

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
 *
 * The SSML carries one <prosody> per clause with a ChatGPT-style contour:
 * the line drifts up mid-sentence, questions lift at the tail, statements
 * settle down, and a short <break> lands after each sentence end.
 */
export function speakEdge(text: string, opts: EdgeVoiceOpts): Promise<void> {
  stopEdge();
  return new Promise<void>((resolve, reject) => {
    const voice = voiceFor(opts);
    const requestId = guid();

    const expr = clamp(opts.expressiveness ?? 1, 0.5, 1.8);
    const baseRate = opts.rateDelta ?? 0;
    const basePitch = opts.pitchDelta ?? 0;
    const baseVol = opts.volumeDelta ?? 0;
    const rising = /[？?]\s*$/.test(text);
    const parts = clauses(text);

    const body = parts
      .map((part, i) => {
        const contour = parts.length > 1
          ? 1 + 0.07 * expr * Math.sin((i / (parts.length - 1)) * Math.PI * (rising ? 1 : 0.7))
          : 1;
        const isTail = i === parts.length - 1;
        const tailLift = isTail && rising ? 1.15 : isTail && !rising ? 0.92 : 1;
        const rate = clamp(baseRate * contour * (isTail ? 0.96 : 1), -0.5, 0.5);
        const pitch = clamp(basePitch * contour * tailLift, -0.5, 0.5);
        const breakAfter = /[。！？!?….]$/.test(part) && !isTail ? `<break time='220ms'/>` : '';
        return `<prosody pitch='${pct(pitch)}' rate='${pct(rate)}' volume='${db(baseVol)}'>${escapeXml(part)}</prosody>${breakAfter}`;
      })
      .join('');

    const ssml =
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${voice.ssmlLang}'>` +
      `<voice name='${voice.name}'>${body}</voice></speak>`;

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
