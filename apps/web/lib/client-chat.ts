'use client';
// Browser-direct chat for static hosting (GitHub Pages): no server route, so we
// call OpenAI-compatible endpoints straight from the browser.
//
// r2026-10-03.05 — brain router:
//  · Provider/key resolved by ../lib/brain (localStorage only, never in code)
//  · One shared streaming path (SSE) for every provider — first tokens arrive
//    fast; the [emotion:{...}] tag is parsed after the full reply lands
//  · On failure, falls back once to keyless Pollinations so the app never dies
// r2026-10-03.27 — out-of-credit resilience:
//  · A gateway that answers HTTP 200 with an out-of-credit message as content
//    (or an error body that says credit/balance/quota) is treated as a FAILED
//    provider, not spoken aloud as her reply
//  · The failed brain is parked for the session (brain.ts) so the next
//    messages go straight to the free lane instead of timing out for 30s
//    on a dead key every time; the user gets one small note in the history
import { BASE_SYSTEM, languageBlock, parseEmotionHints, type ChatMessage } from './llm';
import { BRAIN_SPECS, markBrainDead, pickBrain, type BrainSpec } from './brain';

export interface ClientChatResult { reply: string; emotionHints: Record<string, number> }

export interface ClientChatOptions {
  language?: string;
  persona?: string;
  memory?: string;
  /** fired with the accumulated text as stream chunks arrive */
  onPartial?: (text: string) => void;
}

const TIMEOUT_MS: Partial<Record<BrainSpec['id'], number>> = { pollinations: 45000 };

interface StreamChunk {
  choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
}

/** Gateways (and the free shared queue) phrase money trouble a few ways. */
const CREDIT_RE = /not enough credit|insufficient (credit|balance|quota)|out of credit|quota exceeded|credit balance|余额不足|额度不足|額度不足/i;

/** The one-line history note shown when her brain degrades to the free lane. */
function degradedNote(spec: BrainSpec, lang?: string, credit = true): string {
  const name = spec.label;
  if (lang === 'zh') return credit
    ? `（${name} 的额度用完了，我先自动切换到免费通道，之后你可以在设置里换回来。）`
    : `（${name} 连不上，我先自动切换到免费通道，之后你可以在设置里换回来。）`;
  if (lang === 'ja') return credit
    ? `（${name}のクレジットが不足したため、無料チャンネルに切り替えました。設定で元に戻せます。）`
    : `（${name}に接続できないため、無料チャンネルに切り替えました。設定で元に戻せます。）`;
  if (lang === 'en') return credit
    ? `(${name} is out of credit — I've switched to the free lane. You can switch back in Settings.)`
    : `(${name} is unreachable — I've switched to the free lane. You can switch back in Settings.)`;
  return credit
    ? `（${name} 嘅額度用晒喇，我自動轉咗去免費通道，之後你可以喺設定度換返。）`
    : `（${name} 連唔上，我自動轉咗去免費通道，之後你可以喺設定度換返。）`;
}

/** One OpenAI-compatible streaming call; resolves with the full reply text. */
async function streamCompletion(
  spec: BrainSpec,
  key: string,
  system: string,
  messages: ChatMessage[],
  onPartial?: (text: string) => void,
): Promise<string> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS[spec.id] ?? 30000);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (key) headers.Authorization = `Bearer ${key}`;
    if (spec.id === 'openrouter') {
      headers['HTTP-Referer'] = 'https://amoji.app';
      headers['X-Title'] = 'Amoji';
    }
    const res = await fetch(`${spec.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      signal: ctl.signal,
      body: JSON.stringify({
        model: spec.model,
        messages: [{ role: 'system', content: system }, ...messages],
        temperature: 0.85,
        stream: true,
      }),
    });
    if (!res.ok) {
      // r.27 — read the error body: an out-of-credit gateway gets a clear
      // signal (so it can be parked) instead of a bare status code
      let body = '';
      try { body = await res.text(); } catch { /* unreadable — ignore */ }
      if (CREDIT_RE.test(body)) throw new Error(`${spec.id} out of credit`);
      throw new Error(`${spec.id} ${res.status}`);
    }
    // Some endpoints ignore `stream` and answer with plain JSON.
    if (!(res.headers.get('content-type') ?? '').includes('text/event-stream') || !res.body) {
      const data = (await res.json()) as { choices?: Array<{ message: { content: string } }> };
      const content = data.choices?.[0]?.message.content ?? '';
      if (!content.trim()) throw new Error(`${spec.id} empty`);
      return content;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let text = '';
    let eof = false;
    while (!eof) {
      const chunk = await reader.read();
      eof = chunk.done;
      if (chunk.value) buf += decoder.decode(chunk.value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') { eof = true; break; }
        try {
          const j = JSON.parse(payload) as StreamChunk;
          const delta = j.choices?.[0]?.delta?.content ?? j.choices?.[0]?.message?.content ?? '';
          if (delta) { text += delta; onPartial?.(text); }
        } catch { /* partial JSON line — keep buffering */ }
      }
    }
    if (!text.trim()) throw new Error(`${spec.id} empty`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** Strip the trailing emotion tag → final chat result. Exported for tests. */
export function finishReply(content: string): ClientChatResult {
  const hints = parseEmotionHints(content) as Record<string, number>;
  const reply = content.replace(/\[emotion:\{[^}]*\}\]/, '').trim();
  return { reply: reply || '…', emotionHints: hints };
}

export async function clientChat(
  messages: ChatMessage[],
  opts?: ClientChatOptions,
): Promise<ClientChatResult> {
  const system = `${BASE_SYSTEM}\n${languageBlock(opts?.language)}${opts?.persona ? `\nPersona: ${opts.persona}` : ''}${opts?.memory ? `\n${opts.memory}` : ''}`;
  const first = pickBrain();
  try {
    const content = await streamCompletion(first.spec, first.key, system, messages, opts?.onPartial);
    // r.27 — some gateways answer HTTP 200 with the out-of-credit sentence AS
    // the content; that is a failed provider, not something she should speak
    if (first.spec.id !== 'pollinations' && content.length < 160 && CREDIT_RE.test(content)) {
      throw new Error(`${first.spec.id} out of credit`);
    }
    return finishReply(content);
  } catch (err) {
    // Free fallback: retry once on the keyless lane so a bad/expired key
    // degrades gracefully instead of dead-ending the chat.
    if (first.spec.id === 'pollinations') throw err;
    // r.27 — park the failed brain for the rest of the session so the next
    // messages don't keep timing out on a dead key; note it once in history
    const credit = /out of credit$/.test((err as Error)?.message ?? '');
    markBrainDead(first.spec.id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('amoji:brain-degraded', { detail: degradedNote(first.spec, opts?.language, credit) }));
    }
    const free = BRAIN_SPECS.find((s) => s.id === 'pollinations') ?? first.spec;
    const content = await streamCompletion(free, '', system, messages, opts?.onPartial);
    if (content.length < 160 && CREDIT_RE.test(content)) throw new Error('pollinations credit');
    return finishReply(content);
  }
}
