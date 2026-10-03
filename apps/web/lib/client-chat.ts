'use client';
// Browser-direct chat for static hosting (GitHub Pages): no server route, so we
// call OpenAI-compatible endpoints straight from the browser.
//
// r2026-10-03.05 — brain router:
//  · Provider/key resolved by ../lib/brain (localStorage only, never in code)
//  · One shared streaming path (SSE) for every provider — first tokens arrive
//    fast; the [emotion:{...}] tag is parsed after the full reply lands
//  · On failure, falls back once to keyless Pollinations so the app never dies
import { BASE_SYSTEM, languageBlock, parseEmotionHints, type ChatMessage } from './llm';
import { BRAIN_SPECS, pickBrain, type BrainSpec } from './brain';

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
    if (!res.ok) throw new Error(`${spec.id} ${res.status}`);
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
    return finishReply(content);
  } catch (err) {
    // Free fallback: retry once on the keyless lane so a bad/expired key
    // degrades gracefully instead of dead-ending the chat.
    if (first.spec.id === 'pollinations') throw err;
    const free = BRAIN_SPECS.find((s) => s.id === 'pollinations') ?? first.spec;
    const content = await streamCompletion(free, '', system, messages, opts?.onPartial);
    return finishReply(content);
  }
}
