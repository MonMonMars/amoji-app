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
// r2026-10-04.46 — the fast-brain pass ("replies feel slow"):
//  · PROMPT HISTORY CAP: only the most recent turns are sent — an
//    ever-growing history made every call slower for everyone; memory of
//    older topics still rides the separate memory block
//  · FREE-LANE RACE: two Pollinations models (openai + mistral) stream the
//    SAME prompt in parallel — the first one to emit a token wins and the
//    loser is aborted, so a busy shared queue can't hold her hostage
//  · TIGHT BUDGETS: 14s per racer / 20s per keyed provider, then fail fast
//  · INSTANT LOCAL LANE: if every brain is slow or down she still answers
//    immediately — a warm line in her own language that ends with a
//    question (continuity rule), wearing the emotion read from your words
// r2026-10-04.68 — race models re-aligned with the live free lane:
//  · text.pollinations.ai/models (checked 2026-10-04) now serves the
//    anonymous tier as `openai-fast` (GPT-OSS-20B reasoning) with aliases
//    openai / gpt-oss / gpt-oss-20b / ovh-reasoning — the old `mistral`
//    racer was failing instantly, silently shrinking the race to ONE model
//  · RACE_MODELS now lists every alias we know: dead aliases fail fast and
//    cost nothing, live ones race in parallel — first token still wins
// r2026-10-05.97 — first-token latency:
//  · openai-fast now LEADS the race (it is the anonymous tier's primary
//    model); the plain `openai` alias follows as backup
//  · PROMPT_HISTORY_CAP 12 → 8 — every extra streamed turn costs
//    time-to-first-token on the free shared queue; older topics still ride
//    the separate memory block
import { analyzeText } from '@amoji/emotion-core';
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

/** only the most recent turns go into the prompt — old topics live in memory.
 *  r97: 12 → 8 — every extra streamed turn costs time-to-first-token on the
 *  free shared queue; older topics still ride the separate memory block. */
export const PROMPT_HISTORY_CAP = 8;
export function trimHistoryForPrompt(messages: ChatMessage[]): ChatMessage[] {
  return messages.length > PROMPT_HISTORY_CAP ? messages.slice(-PROMPT_HISTORY_CAP) : messages;
}

/** the free lane races these models; first token wins, loser is aborted.
 *  Aliases of the same backend are fine — two in-flight requests on a busy
 *  shared queue can land on different workers, and any alias that no longer
 *  exists rejects immediately without slowing the race.
 *  r97: openai-fast (GPT-OSS-20B) leads; plain 'openai' is its alias backup. */
export const RACE_MODELS = ['openai-fast', 'openai', 'mistral', 'llama'];
const RACER_BUDGET_MS = 14_000;
const KEYED_BUDGET_MS = 20_000;

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

/** The one-line note when the free lane itself is too slow and she goes local. */
function slowLaneNote(lang?: string): string {
  if (lang === 'zh') return '（免费通道这会儿有点慢，我先用最快速度陪你聊着——之后会自动恢复。）';
  if (lang === 'ja') return '（無料チャンネルが少し混んでいるみたい、いまは最速でおしゃべりするね——あとで自動的に戻るよ。）';
  if (lang === 'en') return '(The free lane is a bit slow right now — I\'m answering at full speed instead; it recovers on its own.)';
  return '（免費通道而家有啲慢，我先用最快速度陪住你傾——之後會自動回復㗎。）';
}

let slowLaneNoted = false;
function noteSlowLane(lang?: string): void {
  if (slowLaneNoted) return;
  slowLaneNoted = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('amoji:brain-degraded', { detail: slowLaneNote(lang) }));
  }
}

/** The instant local lane: warm, her own language, always ends with a question. */
const FALLBACK_BANKS: Record<string, string[]> = {
  yue: [
    '我喺度㗎，慢慢嚟——你最想講邊樣先？',
    '聽到喇，我陪住你。不如講下你而家最掛住嘅嘢？',
    '唔使急，我有的是時間——話俾我聽多啲吖？',
  ],
  zh: [
    '我在呀，慢慢来——你最想先聊哪件事？',
    '听到了，我陪着你。聊聊你现在最惦记的事？',
    '不着急，我有的是时间——再多跟我说一点？',
  ],
  ja: [
    'ここにいるよ、ゆっくりでいい——何から話したい？',
    '聞こえてる、付き合うよ。いま一番気になってること、教えて？',
    '急がなくていいから、もっと聞かせて？',
  ],
  en: [
    "I'm right here, take your time — what do you want to talk about first?",
    'I hear you, and I\'m with you. What\'s on your mind the most right now?',
    'No rush at all — tell me a little more?',
  ],
};

/** Last-resort reply that keeps the conversation alive at zero latency. */
export function localFallbackReply(lastUser: string, lang?: string): ClientChatResult {
  const bank = FALLBACK_BANKS[lang ?? 'yue'] ?? FALLBACK_BANKS.yue!;
  const line = bank[(lastUser.length + bank.length) % bank.length]!;
  const hints = analyzeText(lastUser) as Record<string, number>;
  return { reply: line, emotionHints: hints };
}

interface Racer {
  /** resolves on the first content token; rejects if the stream errors first */
  first: Promise<void>;
  /** resolves with the full accumulated text (rejects on mid-stream errors) */
  finish: () => Promise<string>;
  abort: () => void;
}

/**
 * One streaming attempt for one model. `gate` decides whether an emit may
 * reach the UI (the race uses it so a losing racer can't scribble into the
 * winner's bubble after the decision). Aborts cleanly on `abort()` and on
 * the budget timer; all rejections are funnelled into `first` as well so a
 * race can observe failures.
 */
function launchRacer(
  spec: BrainSpec,
  model: string,
  key: string,
  system: string,
  messages: ChatMessage[],
  gate: (emit: () => void) => void,
  budgetMs: number,
  onPartial?: (text: string) => void,
): Racer {
  const ctl = new AbortController();
  let fired = false;
  let report: (e?: Error) => void = () => {};
  const first = new Promise<void>((resolve, reject) => {
    report = (e?: Error) => {
      if (fired) return;
      fired = true;
      if (e) reject(e); else resolve();
    };
  });
  // silenced here; a race attaches its own handlers (or doesn't care)
  void first.catch(() => {});
  const timer = setTimeout(() => {
    ctl.abort();
    report(new Error(`${model} too slow`));
  }, budgetMs);
  let text = '';
  const done = (async () => {
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
          model,
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
        if (CREDIT_RE.test(body)) throw new Error(`${model} out of credit`);
        throw new Error(`${model} ${res.status}`);
      }
      // Some endpoints ignore `stream` and answer with plain JSON.
      if (!(res.headers.get('content-type') ?? '').includes('text/event-stream') || !res.body) {
        const data = (await res.json()) as { choices?: Array<{ message: { content: string } }> };
        const content = data.choices?.[0]?.message.content ?? '';
        if (!content.trim()) throw new Error(`${model} empty`);
        gate(() => onPartial?.(content));
        report();
        return content;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
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
            if (delta) { text += delta; gate(() => onPartial?.(text)); report(); }
          } catch { /* partial JSON line — keep buffering */ }
        }
      }
      if (!text.trim()) throw new Error(`${model} empty`);
      return text;
    } catch (e) {
      report(e instanceof Error ? e : new Error(`${model} failed`));
      throw e;
    } finally {
      clearTimeout(timer);
    }
  })();
  // silenced here; finish() re-awaits it for the winner, losers drop it
  void done.catch(() => {});
  return { first, finish: () => done, abort: () => ctl.abort() };
}

/** Keyed providers: one stream, tight budget, fail fast. */
async function streamCompletion(
  spec: BrainSpec,
  key: string,
  system: string,
  messages: ChatMessage[],
  onPartial?: (text: string) => void,
): Promise<string> {
  const racer = launchRacer(spec, spec.model, key, system, messages, (emit) => emit(), KEYED_BUDGET_MS, onPartial);
  await racer.first;
  return racer.finish();
}

/** Free lane: race the model list, first token wins, losers are aborted. */
async function racedPollinations(
  spec: BrainSpec,
  key: string,
  system: string,
  messages: ChatMessage[],
  onPartial?: (text: string) => void,
): Promise<string> {
  // gate: before the decision everyone may paint (a loser delta gets
  // overwritten by the winner's own accumulation on the next token);
  // after it, only the winner's tokens reach the bubble
  let leader = -1;
  const racers = RACE_MODELS.map((model, i) =>
    launchRacer(spec, model, key, system, messages, (emit) => {
      if (leader === -1 || leader === i) emit();
    }, RACER_BUDGET_MS, onPartial),
  );
  let winIdx: number;
  try {
    winIdx = await Promise.any(racers.map((r, i) => r.first.then(() => i)));
  } catch (err) {
    racers.forEach((r) => r.abort());
    throw err instanceof Error ? err : new Error('pollinations unavailable');
  }
  leader = winIdx;
  racers.forEach((r, j) => { if (j !== winIdx) r.abort(); });
  const text = await racers[winIdx].finish();
  if (!text.trim()) throw new Error('pollinations empty');
  return text;
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
  const recent = trimHistoryForPrompt(messages);
  const lastUser = recent[recent.length - 1]?.content ?? '';
  const first = pickBrain();
  try {
    const content = first.spec.id === 'pollinations'
      ? await racedPollinations(first.spec, first.key, system, recent, opts?.onPartial)
      : await streamCompletion(first.spec, first.key, system, recent, opts?.onPartial);
    // r.27 — some gateways answer HTTP 200 with the out-of-credit sentence AS
    // the content; that is a failed provider, not something she should speak
    if (first.spec.id !== 'pollinations' && content.length < 160 && CREDIT_RE.test(content)) {
      throw new Error(`${first.spec.id} out of credit`);
    }
    return finishReply(content);
  } catch (err) {
    if (first.spec.id === 'pollinations') {
      // r.46 — the free lane itself is too slow/down: she answers instantly
      // from her local heart instead of dead-ending the chat with an error
      noteSlowLane(opts?.language);
      return localFallbackReply(lastUser, opts?.language);
    }
    // Free fallback: retry once on the keyless lane so a bad/expired key
    // degrades gracefully instead of dead-ending the chat.
    // r.27 — park the failed brain for the rest of the session so the next
    // messages don't keep timing out on a dead key; note it once in history
    const credit = /out of credit$/.test((err as Error)?.message ?? '');
    markBrainDead(first.spec.id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('amoji:brain-degraded', { detail: degradedNote(first.spec, opts?.language, credit) }));
    }
    const free = BRAIN_SPECS.find((s) => s.id === 'pollinations') ?? first.spec;
    try {
      const content = await racedPollinations(free, '', system, recent, opts?.onPartial);
      if (content.length < 160 && CREDIT_RE.test(content)) throw new Error('pollinations credit');
      return finishReply(content);
    } catch {
      // r.46 — even the free race lost: keep the conversation alive NOW
      noteSlowLane(opts?.language);
      return localFallbackReply(lastUser, opts?.language);
    }
  }
}
