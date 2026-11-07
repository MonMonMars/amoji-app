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
// r2026-10-06.126 — speed tier (Master Simon: "the LLM seems loading very
// slow… make conversations reply much faster"):
//  · PRECONNECT + WARM LANE: the layout preconnects text.pollinations.ai and
//    warmLane() pings its /models list once at chat-room mount, so DNS+TLS+
//    a live connection are ready BEFORE the first message — the first turn
//    no longer eats the ~1s handshake stall
//  · NO DEAD PROBE: static hosts (GitHub Pages) have no /api/chat; the first
//    send of a session still probes it, but the 404 is remembered in
//    sessionStorage and every later message goes straight to the browser
//    lane instead of wasting a round-trip per message
//  · TAIL CAP: max_tokens 240 on every request — her replies are 1-3 cozy
//    sentences by design (r97/r106), so capping the tail shaves the last
//    seconds off reasoning-prone free models without ever biting real text
// r2026-10-06.136 — keyless third racer (Master Simon: "free and fast and
// can access all around the world"):
//  · Puter.ai joins the free lane — puter.ai.chat needs NO API key, works
//    worldwide, and streams tokens the same way; its script loads lazily on
//    the first call and races Pollinations alongside the other models,
//    first token wins
//  · If Puter shows its "user pays" gate, the 14s race budget absorbs it —
//    the racer just loses that round and Pollinations carries the reply
// r2026-11-08.142 — the free lane races HOSTS, not aliases (see the
// RACER_COOLDOWN_MS block below for the evidence). One Pollinations request,
// one OVHcloud request, one Puter call — three companies, three budgets.
import { analyzeText } from '@amoji/emotion-core';
import { BASE_SYSTEM, languageBlock, parseEmotionHints, type ChatMessage } from './llm';
import { brainBodyExtras, markBrainDead, pickBrain, type BrainSpec } from './brain';
import { cleanForDisplay, stripLaughTokens } from './speak-text';
import { withQuestion } from './follow-up';
import { preferLiveReply, worldBlock } from './live-tools';
import { shapeCompanionReply } from './reply-shape';

export interface ClientChatResult { reply: string; emotionHints: Record<string, number> }

export interface ClientChatOptions {
  language?: string;
  persona?: string;
  memory?: string;
  /** live weather / news / search facts for the system prompt */
  world?: string;
  /** spoken fallback already in `language`, used only if every brain fails */
  worldSpoken?: string;
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

// r2026-11-08.142 — the free lane races HOSTS, not aliases:
//  · `GET text.pollinations.ai/models` (checked live) lists exactly one
//    anonymous model — openai-fast, "GPT-OSS 20B Reasoning LLM (OVH)" — with
//    aliases openai / gpt-oss / gpt-oss-20b / ovh-reasoning. The old
//    RACE_MODELS = ['openai-fast', 'openai'] therefore sent TWO requests to
//    the SAME model at the SAME provider: two slots spent on one IP budget
//    for zero diversity. A 5-request burst 402s from the third request on.
//  · The race is now `{ id, host, buildRequest, parseChunk }` specs, one per
//    company: Pollinations (exactly ONE request), OVHcloud's keyless trial
//    endpoint, and Puter.js. Different hosts, different budgets — one going
//    down or out of budget cannot take the reply hostage.
//  · Anonymous budgets are respected with a per-host cooldown: a host that
//    just answered is skipped, so one user's rapid messages don't drain it.
//  · Kilo Gateway (api.kilocode.ai) answers anonymously from here but sends
//    NO `Access-Control-Allow-Origin` and `Cross-Origin-Resource-Policy:
//    same-origin`, so a browser can never read its reply — left out on
//    purpose rather than shipped as a racer that always throws.

/** Pollinations' origin; preconnected in the layout and warmed by warmLane()
 *  so the first real turn starts on a hot connection. */
export const LANE_ORIGIN = 'https://text.pollinations.ai';
/** OVHcloud's public "kepler" OpenAI-compatible endpoint — no key, CORS `*`. */
export const OVH_ORIGIN = 'https://oai.endpoints.kepler.ai.cloud.ovh.net';
/** Puter's keyless browser SDK (loaded lazily by its racer). */
export const PUTER_SDK_URL = 'https://js.puter.com/v2/';

/** The ONE model Pollinations' anonymous tier serves (plus dead aliases). */
export const POLLINATIONS_MODEL = 'openai-fast';
/** Fastest of OVH's 21 keyless models (~0.9s to first token) and it speaks
 *  Cantonese. NOTE: it rejects `reasoning_effort` with HTTP 400, so only
 *  Pollinations' buildRequest sets that field. */
export const OVH_MODEL = 'Mistral-Small-3.2-24B-Instruct-2506';

/** Per-host anonymous-budget cooldown, in ms. A racer inside its window is
 *  skipped and the other hosts answer instead.
 *  · pollinations — ~1 request / 30-45s per IP; 35s sits inside that
 *  · ovhcloud     — measured: exactly 2 requests per ~60s, then HTTP 429, so
 *                   a 30s gate spends that budget evenly instead of bursting
 *  · puter        — no anonymous per-IP budget to protect */
export const RACER_COOLDOWN_MS = {
  pollinations: 35_000,
  ovhcloud: 30_000,
  puter: 0,
} as const;

export const RACER_BUDGET_MS = 14_000;
const KEYED_BUDGET_MS = 20_000;

/** What every racer is asked to generate. */
export interface RacerRequestContext {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
}

/** How a racer reaches its host: an OpenAI-compatible POST, or an SDK call
 *  (Puter hands us an async iterator instead of a stream of bytes). */
export type RacerRequest =
  | { transport: 'http'; url: string; headers: Record<string, string>; body: Record<string, unknown> }
  | { transport: 'sdk'; sdk: 'puter'; messages: Array<{ role: string; content: string }> };

/** One independent racer. `host` is the company/endpoint — the whole point of
 *  the lane is that no two racers share it. */
export interface RacerSpec {
  id: string;
  /** owning company/endpoint; the race must span several of these */
  host: string;
  /** model id sent to that host (`host` + `model` is globally unique) */
  model: string;
  /** ms to wait after a dispatch to this host before dispatching again */
  cooldownMs: number;
  buildRequest: (ctx: RacerRequestContext) => RacerRequest;
  /** the spoken delta inside one stream part (SSE `data:` JSON or SDK chunk) */
  parseChunk: (payload: unknown) => string;
}

interface StreamChunk {
  choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
}

/** Speech delta from one OpenAI-compatible SSE payload — shared by every
 *  racer that speaks that shape, so nobody re-implements the parse. */
export function openAiDelta(payload: unknown): string {
  const j = payload as StreamChunk | null;
  return j?.choices?.[0]?.delta?.content ?? j?.choices?.[0]?.message?.content ?? '';
}

const chatBody = (
  model: string,
  { system, messages, maxTokens }: RacerRequestContext,
  extra: Record<string, unknown> = {},
): Record<string, unknown> => ({
  model,
  messages: [{ role: 'system', content: system }, ...messages],
  temperature: 0.7,
  // Tail cap: her replies are 1-3 cozy sentences, so the last seconds of a
  // reasoning-prone free model never bite real text.
  max_tokens: maxTokens,
  stream: true,
  ...extra,
});

const withSystem = (system: string, messages: ChatMessage[]) =>
  [{ role: 'system', content: system }, ...messages];

/** The free lane. One request per host per turn, first token wins. */
export const FREE_RACERS: RacerSpec[] = [
  {
    id: 'pollinations',
    host: 'pollinations',
    model: POLLINATIONS_MODEL,
    cooldownMs: RACER_COOLDOWN_MS.pollinations,
    buildRequest: (ctx) => ({
      transport: 'http',
      url: `${LANE_ORIGIN}/openai`,
      headers: { 'Content-Type': 'application/json' },
      // `reasoning_effort: low` skips the hidden chain so the first spoken
      // token arrives sooner — Pollinations accepts it, OVH does not.
      body: chatBody(POLLINATIONS_MODEL, ctx, { reasoning_effort: 'low' }),
    }),
    parseChunk: openAiDelta,
  },
  {
    id: 'ovhcloud',
    host: 'ovhcloud',
    model: OVH_MODEL,
    cooldownMs: RACER_COOLDOWN_MS.ovhcloud,
    buildRequest: (ctx) => ({
      transport: 'http',
      url: `${OVH_ORIGIN}/v1/chat/completions`,
      // No Authorization header at all — the trial tier is anonymous.
      headers: { 'Content-Type': 'application/json' },
      body: chatBody(OVH_MODEL, ctx),
    }),
    parseChunk: openAiDelta,
  },
  {
    id: 'puter',
    host: 'puter',
    model: 'puter-auto',
    cooldownMs: RACER_COOLDOWN_MS.puter,
    buildRequest: ({ system, messages }) => ({
      transport: 'sdk',
      sdk: 'puter',
      messages: withSystem(system, messages),
    }),
    parseChunk: (payload) => (payload as { text?: string } | null)?.text ?? '',
  },
];

// ---------- per-host cooldown ----------
// r2026-10-06.136 — keyless Puter racer plumbing (one of the FREE_RACERS
// below); declared here so the cooldown reset can clear the cached promise.
type PuterPart = { text?: string };
type PuterAI = { chat: (messages: unknown[], opts?: Record<string, unknown>) => Promise<AsyncIterable<PuterPart>> };
type PuterSDK = { ai: PuterAI };

const racerLastSentAt = new Map<string, number>();
// Puter's SDK promise, reset alongside the windows so a retry really retries.
let puterLoader: Promise<PuterSDK> | null = null;

/** True while this host is still inside its anonymous-budget window. */
export function racerCoolingDown(
  spec: Pick<RacerSpec, 'id' | 'cooldownMs'>,
  at: number = Date.now(),
): boolean {
  if (spec.cooldownMs <= 0) return false;
  const last = racerLastSentAt.get(spec.id);
  return last !== undefined && at - last < spec.cooldownMs;
}

/** Record a dispatch (or a 402/429) so the window starts now. */
export function markRacerSent(id: string, at: number = Date.now()): void {
  racerLastSentAt.set(id, at);
}

/** Test hook: clear every window. */
export function resetRacerCooldowns(): void {
  racerLastSentAt.clear();
  puterLoader = null;
}

/** Which racers may fire right now. */
export function eligibleRacers(at: number = Date.now()): RacerSpec[] {
  return FREE_RACERS.filter((r) => !racerCoolingDown(r, at));
}

/**
 * The lanes this turn should actually race. Cooling lanes are skipped so the
 * other hosts answer and the spent host keeps its slot for later. If every
 * lane happens to be inside its window (a rapid burst across all hosts), the
 * longest-idle one is used rather than dead-ending the chat — silence is worse
 * than one extra request.
 */
export function selectRacers(at: number = Date.now()): RacerSpec[] {
  const fresh = eligibleRacers(at);
  if (fresh.length) return fresh;
  const oldest = longestIdleRacer(at);
  return oldest ? [oldest] : [];
}

/** The cooling host that has been waiting longest — the reserve of last resort. */
export function longestIdleRacer(at: number = Date.now()): RacerSpec | undefined {
  let oldest: RacerSpec | undefined;
  for (const r of FREE_RACERS) {
    if (!racerCoolingDown(r, at)) continue;
    if (!oldest || (racerLastSentAt.get(r.id) ?? -Infinity) < (racerLastSentAt.get(oldest.id) ?? -Infinity)) oldest = r;
  }
  return oldest ?? FREE_RACERS[0];
}

let laneWarmed = false;
/** Fire-and-forget lane warm-up: GET /models keeps DNS+TLS+connection hot
 *  without touching the LLM queue. Best-effort; aborts quietly at 6s. */
export function warmLane(): void {
  if (laneWarmed || typeof fetch === 'undefined') return;
  laneWarmed = true;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6_000);
  fetch(`${LANE_ORIGIN}/models`, { signal: ctl.signal, cache: 'no-store' })
    .catch(() => { /* warm-up is best-effort */ })
    .finally(() => clearTimeout(timer));
}

// r126 — static hosts have no /api/chat. The FIRST send of a session still
// probes it (a real server must be used when one exists); the failure is
// remembered so every later message skips the dead round-trip.
const NO_ROUTE_KEY = 'amoji.noApiRoute';
/** in-memory mirror for environments with no sessionStorage (private-mode
 *  quirks, tests) — the skip must hold for the session either way */
const noRouteMemory = { set: false };
export function shouldSkipServerProbe(): boolean {
  try { return sessionStorage.getItem(NO_ROUTE_KEY) === '1'; } catch { return noRouteMemory.set; }
}
export function markNoApiRoute(): void {
  noRouteMemory.set = true;
  try { sessionStorage.setItem(NO_ROUTE_KEY, '1'); } catch { /* in-memory only */ }
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

// r2026-10-06.136 — keyless Puter racer: puter.ai.chat needs NO API key and
// works worldwide; the SDK script loads lazily on the first call (8s ceiling).
// r142 — it is now just one of the FREE_RACERS and its request comes from its
// spec's buildRequest, so the loader only has to hand back the SDK.
export function loadPuter(): Promise<PuterSDK> {
  if (puterLoader) return puterLoader;
  puterLoader = new Promise<PuterSDK>((resolve, reject) => {
    const w = typeof window === 'undefined' ? undefined : window as unknown as { puter?: PuterSDK };
    if (w?.puter) { resolve(w.puter); return; }
    if (typeof document === 'undefined') { puterLoader = null; reject(new Error('no dom')); return; }
    const s = document.createElement('script');
    s.src = PUTER_SDK_URL;
    const timer = setTimeout(() => { puterLoader = null; reject(new Error('puter sdk timeout')); }, 8_000);
    s.onload = () => {
      clearTimeout(timer);
      const sdk = (window as unknown as { puter?: PuterSDK }).puter;
      if (sdk) resolve(sdk); else { puterLoader = null; reject(new Error('puter sdk missing')); }
    };
    s.onerror = () => { clearTimeout(timer); puterLoader = null; reject(new Error('puter sdk failed')); };
    document.head.appendChild(s);
  });
  return puterLoader;
}

/**
 * One streaming attempt for one racer spec. Both transports share the same
 * contract (`first` on the first token, `finish` with the full text) so a race
 * can treat them identically. `gate` decides whether an emit may reach the UI
 * (the race uses it so a losing racer can't scribble into the winner's bubble
 * after the decision). Aborts cleanly on `abort()` and on the budget timer;
 * every rejection is funnelled into `first` so a race can observe failures.
 */
function launchSpecRacer(
  spec: RacerSpec,
  ctx: RacerRequestContext,
  gate: (emit: () => void) => void,
  budgetMs: number,
  onPartial?: (text: string) => void,
): Racer {
  const req = spec.buildRequest(ctx);
  // A host only spends its anonymous budget when this actually dispatches.
  markRacerSent(spec.id);
  const ctl = new AbortController();
  let abortedByCaller = false;
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
    report(new Error(`${spec.id} too slow`));
  }, budgetMs);
  let text = '';
  const note = (delta: string) => {
    if (!delta) return;
    text += delta;
    gate(() => onPartial?.(text));
    report();
  };
  const done = (async () => {
    try {
      if (req.transport === 'sdk') {
        const sdk = await loadPuter();
        if (ctl.signal.aborted) throw new Error(`${spec.id} aborted`);
        const res = await sdk.ai.chat(req.messages, { stream: true });
        // Manual next() so no tsconfig async-iteration flag is required.
        const iter = res[Symbol.asyncIterator]();
        for (;;) {
          if (ctl.signal.aborted) throw new Error(`${spec.id} aborted`);
          const step = await iter.next();
          if (step.done) break;
          note(spec.parseChunk(step.value));
        }
      } else {
        const res = await fetch(req.url, {
          method: 'POST',
          headers: req.headers,
          signal: ctl.signal,
          body: JSON.stringify(req.body),
        });
        if (!res.ok) {
          // r.27 — read the error body: an out-of-credit gateway gets a clear
          // signal instead of a bare status code. 402/429 mean the anonymous
          // budget is spent, so the host's cooldown restarts from now.
          let body = '';
          try { body = await res.text(); } catch { /* unreadable — ignore */ }
          if (res.status === 402 || res.status === 429) markRacerSent(spec.id);
          if (CREDIT_RE.test(body)) throw new Error(`${spec.id} out of credit`);
          throw new Error(`${spec.id} ${res.status}`);
        }
        // Some endpoints ignore `stream` and answer with plain JSON.
        if (!(res.headers.get('content-type') ?? '').includes('text/event-stream') || !res.body) {
          const data = (await res.json()) as { choices?: Array<{ message: { content: string } }> };
          const content = data.choices?.[0]?.message.content ?? '';
          if (!content.trim()) throw new Error(`${spec.id} empty`);
          note(content);
          return content;
        }
        await readEventStream(res, spec.parseChunk, (accumulated) => {
          text = accumulated;
          gate(() => onPartial?.(text));
          report();
        });
      }
      if (!text.trim()) throw new Error(`${spec.id} empty`);
      return text;
    } catch (e) {
      if (!abortedByCaller) report(e instanceof Error ? e : new Error(`${spec.id} failed`));
      throw e;
    } finally {
      clearTimeout(timer);
    }
  })();
  // silenced here; finish() re-awaits it for the winner, losers drop it
  void done.catch(() => {});
  return {
    first,
    finish: () => done,
    abort: () => {
      abortedByCaller = true;
      ctl.abort();
      report(new Error(`${spec.id} aborted`));
    },
  };
}

/** Pump an OpenAI-compatible SSE body through `onText` (which receives the
 *  text accumulated so far), returning the whole reply. Shared by the keyed
 *  brains and the host racers so the parse lives in exactly one place. */
async function readEventStream(
  res: Response,
  parse: (payload: unknown) => string,
  onText: (accumulated: string) => void,
): Promise<string> {
  let text = '';
  const reader = res.body!.getReader();
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
        const delta = parse(JSON.parse(payload));
        if (delta) { text += delta; onText(text); }
      } catch { /* partial JSON line — keep buffering */ }
    }
  }
  return text;
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
  maxTokens = 280,
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
          temperature: 0.7,
          // Provider-specific extras. The keyless lane is a reasoning model and
          // low effort skips the long hidden chain so the first spoken token
          // arrives sooner; Z.ai needs its documented thinking-off switch instead
          // (see brainBodyExtras) or the GLM-4.7 chain blows the keyed budget.
          ...brainBodyExtras(spec.id),
          // Tail cap. Recipes need room for numbered steps; ordinary replies stay short.
          max_tokens: maxTokens,
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
      text = await readEventStream(res, openAiDelta, (accumulated) => { gate(() => onPartial?.(accumulated)); report(); });
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
  maxTokens = 280,
): Promise<string> {
  const racer = launchRacer(spec, spec.model, key, system, messages, (emit) => emit(), KEYED_BUDGET_MS, onPartial, maxTokens);
  await racer.first;
  return racer.finish();
}

/** Free lane: race independent HOSTS, first token wins, losers are aborted.
 *  r142 — no longer takes a BrainSpec: the racers are host specs, so this can
 *  no longer accidentally fire two requests at one provider's budget. */
export async function raceFreeLanes(
  system: string,
  messages: ChatMessage[],
  onPartial?: (text: string) => void,
  maxTokens = 280,
): Promise<string> {
  const ctx: RacerRequestContext = { system, messages, maxTokens };
  // r142 — hosts whose anonymous budget is still fresh. Pollinations is in
  // here at most once (it is one spec, not two aliases), and a host inside
  // its cooldown is skipped so the others answer instead.
  const lanes = selectRacers();
  if (!lanes.length) throw new Error('no free lane available');
  try {
    return await launchRace(lanes, ctx, onPartial);
  } catch (err) {
    // Every FRESH host failed. Rather than dropping straight to the canned
    // line, borrow the host that has been cooling longest — one extra request
    // beats silence. Only if that also fails does the caller's unchanged
    // fallback (live facts, then the local lane) take over.
    const freshIds = new Set(lanes.map((r) => r.id));
    const spare = longestIdleRacer();
    if (!spare || freshIds.has(spare.id) || !(err instanceof Error)) throw err;
    return launchRace([spare], ctx, onPartial);
  }
}

/** One round: launch these lanes, first token wins, losers are aborted. */
async function launchRace(
  lanes: RacerSpec[],
  ctx: RacerRequestContext,
  onPartial?: (text: string) => void,
): Promise<string> {
  // gate: before the decision everyone may paint (a loser delta gets
  // overwritten by the winner's own accumulation on the next token);
  // after it, only the winner's tokens reach the bubble
  let leader = -1;
  const racers = lanes.map((lane, i) =>
    launchSpecRacer(lane, ctx, (emit) => {
      if (leader === -1 || leader === i) emit();
    }, RACER_BUDGET_MS, onPartial),
  );
  let winIdx: number;
  try {
    winIdx = await Promise.any(racers.map((r, i) => r.first.then(() => i)));
  } catch (err) {
    racers.forEach((r) => r.abort());
    throw err instanceof Error ? err : new Error('every free lane failed');
  }
  leader = winIdx;
  racers.forEach((r, j) => { if (j !== winIdx) r.abort(); });
  const text = await racers[winIdx]!.finish();
  if (!text.trim()) throw new Error(`${lanes[winIdx]!.id} empty`);
  return text;
}

/** Strip the trailing emotion tag → final chat result. Exported for tests. */
export function finishReply(content: string, opts?: { detailed?: boolean; world?: string }): ClientChatResult {
  const hints = parseEmotionHints(content) as Record<string, number>;
  // Strip the machine tag, display chrome, then banned giggle tokens so neither
  // the bubble nor TTS can reintroduce hehe/haha/hey-hey (laughs = SFX only).
  const cleaned = stripLaughTokens(
    cleanForDisplay(content.replace(/\[emotion:\{[^}]*\}\]/g, '')),
  );
  const reply = shapeCompanionReply(cleaned, { detailed: opts?.detailed, world: opts?.world });
  return { reply: reply || '…', emotionHints: hints };
}

/** A cook-along turn legitimately needs more room than a chat turn. */
function wantsDetail(world?: string): boolean {
  return /\b(?:Recipe|Learn)\s*:/.test(world ?? '');
}

export async function clientChat(
  messages: ChatMessage[],
  opts?: ClientChatOptions,
): Promise<ClientChatResult> {
  const system = `${BASE_SYSTEM}\nReply in speakable sentences only. NEVER show chain-of-thought, plans, analysis, markdown, code, or emotion labels in the prose. No "the user wants". Never type hehe/haha/hey-hey. The only machine tag is the final [emotion:{...}] line — weight real feelings 0.7–1.0 when strong so voice can carry them.\n${languageBlock(opts?.language)}${opts?.persona ? `\nPersona: ${opts.persona}` : ''}${opts?.memory ? `\n${opts.memory}` : ''}${worldBlock(opts?.world)}`;
  const detailed = wantsDetail(opts?.world);
  const maxTokens = detailed ? 520 : 280;
  const onPartial = opts?.onPartial
    ? (partial: string) => { opts.onPartial?.(shapeCompanionReply(partial, { streaming: true, world: opts?.world })); }
    : undefined;
  const factsReply = (): ClientChatResult | null => {
    const spoken = opts?.worldSpoken?.trim();
    if (!spoken) return null;
    return { reply: withQuestion(spoken, opts?.language), emotionHints: analyzeText(spoken) as Record<string, number> };
  };
  const recent = trimHistoryForPrompt(messages);
  const lastUser = recent[recent.length - 1]?.content ?? '';
  const first = pickBrain();
  try {
    const content = first.spec.id === 'pollinations'
      ? await raceFreeLanes(system, recent, onPartial, maxTokens)
      : await streamCompletion(first.spec, first.key, system, recent, onPartial, maxTokens);
    // r.27 — some gateways answer HTTP 200 with the out-of-credit sentence AS
    // the content; that is a failed provider, not something she should speak
    if (first.spec.id !== 'pollinations' && content.length < 160 && CREDIT_RE.test(content)) {
      throw new Error(`${first.spec.id} out of credit`);
    }
    const done = finishReply(content, { detailed, world: opts?.world });
    const reply = preferLiveReply(withQuestion(done.reply, opts?.language), opts?.world, opts?.worldSpoken, opts?.language);
    return { ...done, reply };
  } catch (err) {
    if (first.spec.id === 'pollinations') {
      // r.46 — the free lane itself is too slow/down: she answers instantly
      // from her local heart instead of dead-ending the chat with an error.
      // Live facts (weather, news, a lookup) still get spoken if we have them.
      const facts = factsReply();
      if (facts) return facts;
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
    try {
      const content = await raceFreeLanes(system, recent, onPartial, maxTokens);
      if (content.length < 160 && CREDIT_RE.test(content)) throw new Error('pollinations credit');
      const done = finishReply(content, { detailed, world: opts?.world });
      const reply = preferLiveReply(withQuestion(done.reply, opts?.language), opts?.world, opts?.worldSpoken, opts?.language);
      return { ...done, reply };
    } catch {
      // r.46 — even the free race lost: keep the conversation alive NOW
      const facts = factsReply();
      if (facts) return facts;
      noteSlowLane(opts?.language);
      return localFallbackReply(lastUser, opts?.language);
    }
  }
}
