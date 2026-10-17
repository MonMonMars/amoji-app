export interface TtsRequest {
  text: string;
  lang: string;
  gender: 'female' | 'male';
  voice?: string;
}

const VOICES: Record<string, { female: string; male: string; xml: string }> = {
  yue: { female: 'zh-HK-HiuMaanNeural', male: 'zh-HK-WanLungNeural', xml: 'zh-HK' },
  zh: { female: 'zh-CN-XiaoxiaoNeural', male: 'zh-CN-YunjianNeural', xml: 'zh-CN' },
  ja: { female: 'ja-JP-NanamiNeural', male: 'ja-JP-KeitaNeural', xml: 'ja-JP' },
  en: { female: 'en-US-JennyNeural', male: 'en-US-GuyNeural', xml: 'en-US' },
};

const VOICE_RE = /^[a-z]{2}-[A-Z]{2}-[A-Za-z0-9]+Neural$/;

export function resolveEdgeVoice(req: Pick<TtsRequest, 'lang' | 'gender' | 'voice'>): { name: string; xml: string } {
  if (req.voice && VOICE_RE.test(req.voice)) {
    const xml = req.voice.slice(0, 5);
    return { name: req.voice, xml };
  }
  const row = VOICES[req.lang] ?? VOICES.yue!;
  return { name: row[req.gender], xml: row.xml };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildEdgeSsml(text: string, voice: { name: string; xml: string }): string {
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${voice.xml}'><voice name='${voice.name}'>${escapeXml(text)}</voice></speak>`;
}

export function parseTtsBody(body: unknown): TtsRequest | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'bad json' };
  const rec = body as Record<string, unknown>;
  if (typeof rec.text !== 'string' || !rec.text.trim()) return { error: 'text required' };
  const text = rec.text.trim().slice(0, 800);
  const lang = typeof rec.lang === 'string' && VOICES[rec.lang] ? rec.lang : 'yue';
  const gender = rec.gender === 'male' ? 'male' : 'female';
  const voice = typeof rec.voice === 'string' ? rec.voice : undefined;
  return { text, lang, gender, ...(voice ? { voice } : {}) };
}

export const PUBLIC_EDGE_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WS_BASE = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';

/** Edge read-aloud is the default voice. Token is the public client id, not an account key. */
export async function synthesizeEdge(ssml: string, token = process.env.EDGE_TTS_TOKEN?.trim() || PUBLIC_EDGE_TOKEN): Promise<Uint8Array> {
  const requestId = crypto.randomUUID().replaceAll('-', '');
  const ws = new WebSocket(`${WS_BASE}?TrustedClientToken=${token}&ConnectionId=${crypto.randomUUID().replaceAll('-', '')}`);
  const chunks: Uint8Array[] = [];
  const pending: Promise<void>[] = [];
  const blob = await new Promise<Blob>((resolve, reject) => {
    const timer = setTimeout(() => {
      try { ws.close(); } catch { /* ignore */ }
      reject(new Error('upstream timeout'));
    }, 15_000);
    const finish = (fn: (v: Blob | Error) => void, arg: Blob | Error) => {
      clearTimeout(timer);
      fn(arg);
    };
    ws.addEventListener('open', () => {
      const now = () => new Date().toISOString();
      const config =
        `X-Timestamp:${now()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}';
      const msg =
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${now()}\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(`${config}\x00`);
      ws.send(`${msg}\x00`);
    });
    ws.addEventListener('message', (ev) => {
      const data = ev.data;
      if (typeof data === 'string') return;
      const asBuf = data instanceof Blob ? data.arrayBuffer() : data instanceof ArrayBuffer ? Promise.resolve(data) : null;
      if (!asBuf) return;
      pending.push(asBuf.then((buf) => {
        const u8 = new Uint8Array(buf);
        let headerEnd = -1;
        const scan = Math.min(u8.length - 3, 160);
        for (let i = 0; i < scan; i++) {
          if (u8[i] === 13 && u8[i + 1] === 10 && u8[i + 2] === 13 && u8[i + 3] === 10) {
            headerEnd = i + 4;
            break;
          }
        }
        if (headerEnd >= 0 && u8.length > headerEnd) chunks.push(u8.slice(headerEnd));
      }));
    });
    ws.addEventListener('close', () => {
      void Promise.all(pending).then(
        () => finish(chunks.length ? (v) => resolve(v as Blob) : (e) => reject(e as Error), chunks.length ? new Blob(chunks, { type: 'audio/mpeg' }) : new Error('no audio from upstream')),
        (err) => finish((e) => reject(e as Error), err instanceof Error ? err : new Error(String(err))),
      );
    });
    ws.addEventListener('error', () => finish((e) => reject(e as Error), new Error('upstream socket error')));
  });
  return new Uint8Array(await blob.arrayBuffer());
}
