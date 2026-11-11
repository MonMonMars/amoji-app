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
// one OVHcloud request, one Puter call.
// r2026-11-08.143 — two premises corrected, capacity 3x higher:
//  · NOT three companies. Pollinations' only anonymous model is literally
//    described as "GPT-OSS 20B Reasoning LLM (OVH)", so Pollinations is a
//    SECOND QUOTA on OVH's upstream, not a second host. Puter is the only
//    genuinely independent third. Quota separation is still worth racing for;
//    upstream diversity is not what we get from those two.
//  · OVH's budget is per-IP PER MODEL, not per-IP (measured below), so one
//    model id was throwing away ~5/6 of the capacity. OVH now rotates across
//    a small verified-working model set with a per-(host, model) cooldown — a
//    second message inside 30s still reaches OVH through a DIFFERENT model.
import { analyzeText } from '@amoji/emotion-core';
import { BASE_SYSTEM, languageBlock, parseEmotionHints, type ChatMessage } from './llm';
import { brainBodyExtras, markBrainDead, pickBrain, type BrainSpec } from './brain';
import { cleanForDisplay, stripLaughTokens } from './speak-text';
import { withQuestion } from './follow-up';
import { preferLiveReply, worldBlock } from './live-tools';
import { replyLooksNonsense, STRICT_REPLY_APPENDIX } from './reply-sanity';
import { shapeCompanionReply } from './reply-shape';
import { wantsLongCompanionReply } from './topic-suggestions';
import { wantsStoryTurn } from './story-reply';
import {
  detectLongTalkKind,
  longTalkSystemBlock,
  maxTokensForLongTalk,
  type LongTalkKind,
} from './long-talk';
import { mustStayOneTopic, stripOffTopicAbilityTacks } from './topic-mixture';

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
  /** Live Story Mode session — long narrative budget for every turn. */
  storySession?: boolean;
  /** Cast id — picks a home OVH model and keys conversation sticky. */
  characterId?: string;
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
//  · The race is now `{ id, host, buildRequest, parseChunk }` specs: exactly
//    ONE Pollinations request, the freshest OVHcloud model requests and one
//    Puter call per turn (r143 raised OVH to one racer per model).
//  · Anonymous budgets are respected with a cooldown: a (host, model) that
//    just answered is skipped, so one user's rapid messages don't drain it.
// r2026-11-08.143 — what is actually true about the three racers:
//  · OVHcloud is THE upstream. Pollinations resells the same GPT-OSS 20B
//    weights behind its own queue, so it is a second QUOTA on that upstream,
//    not an independent company. That is still useful — two queues, two
//    budget counters, two places one reply can come from — but a single OVH
//    outage takes BOTH of them out together.
//  · Puter is the only genuinely independent third: its own infra, its own
//    budget, unaffected by anything OVH does.
//  · OVH's anonymous budget is per-IP PER MODEL (see OVH_MODELS), so racing
//    one model id there was leaving most of the capacity unused.
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

/** The ONE model Pollinations' anonymous tier serves (plus dead aliases).
 *  Pollinations describes it as "GPT-OSS 20B Reasoning LLM (OVH)" — the same
 *  weights OVH serves as `gpt-oss-20b`. That is why this racer buys a second
 *  QUOTA, not a second upstream (see the r143 note above). */
export const POLLINATIONS_MODEL = 'openai-fast';

/**
 * OVH's keyless chat models we are willing to ask, in preference order.
 * Ranked by the 2026-11-09 multi-language A/B (yue/zh/en/ja × companion+ability+reason):
 *   Qwen2.5-VL-72B      overall 90.2 · med TTFC 932ms · lang 85.0 · reason 90 · 0 empty
 *   Mistral-Small-3.2   overall 88.4 · med TTFC 982ms · lang 84.2 · reason 82.5 · 0 empty
 *   Meta-Llama-3_3-70B  overall 80.5 · med TTFC 5028ms · lang 85.0 · reason 81.2 · 0 empty
 *     (Llama language quality still strong; TTFC spikes 16–100s+ tanked overall)
 * Earlier same-day shallow bench had Llama ahead (91.7) — deeper multi-lang retest
 * flipped the primary to Qwen for stable first-token latency across all 4 locales.
 * Pollinations openai-fast kept as a separate thin-quota racer only.
 * gpt-oss / Qwen3.8 — often EMPTY `content` (reasoning-only) → excluded.
 *
 * Only models that emit `delta.content` may be listed. Reasoning-only empties
 * burn the 14s race budget for nothing.
 *
 * Ordering: multi-lang quality + stable TTFC first. All are $0 (2 req/min per
 * IP per model). No `Authorization` header — `Bearer no-key` returns HTTP 403.
 * Do not send `reasoning_effort` (OVH 400 on Llama/Mistral).
 */
export const OVH_MODELS = [
  'Qwen2.5-VL-72B-Instruct',
  'Mistral-Small-3.2-24B-Instruct-2506',
  'Meta-Llama-3_3-70B-Instruct',
] as const;

export type OvhModelId = (typeof OVH_MODELS)[number];

/** Catalog default — also the fallback home when no character is set. */
export const OVH_MODEL = OVH_MODELS[0];

const STICKY_STORAGE_KEY = 'amoji.ovhSticky.v1';
/** In-memory sticky OVH model per conversation (character). Keeps reasoning
 *  aligned across turns; sessionStorage mirrors so a refresh keeps the same
 *  brain. Failover (dead / cooling / timed-out lane) rewrites the sticky. */
const stickyMemory = new Map<string, OvhModelId>();

function hashCharacter(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Conversation key for sticky brain — one cast member, one thread. */
export function conversationBrainKey(characterId?: string): string {
  return (characterId?.trim() || 'default').toLowerCase();
}

/** Stable home OVH model for a character — spreads the cast across the three. */
export function preferOvhForCharacter(characterId?: string): OvhModelId {
  const id = conversationBrainKey(characterId);
  return OVH_MODELS[hashCharacter(id) % OVH_MODELS.length]!;
}

function readStickyStore(): Record<string, string> {
  try {
    if (typeof sessionStorage === 'undefined') return {};
    const raw = sessionStorage.getItem(STICKY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}

function writeStickyStore(all: Record<string, string>): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(STICKY_STORAGE_KEY, JSON.stringify(all));
  } catch { /* in-memory only */ }
}

export function getStickyOvh(conversationKey: string): OvhModelId | null {
  const mem = stickyMemory.get(conversationKey);
  if (mem && (OVH_MODELS as readonly string[]).includes(mem)) return mem;
  const stored = readStickyStore()[conversationKey];
  if (stored && (OVH_MODELS as readonly string[]).includes(stored)) {
    const model = stored as OvhModelId;
    stickyMemory.set(conversationKey, model);
    return model;
  }
  return null;
}

/** Pin (or re-pin after failover) the OVH model for this conversation. */
export function setStickyOvh(conversationKey: string, model: OvhModelId): void {
  stickyMemory.set(conversationKey, model);
  const all = readStickyStore();
  all[conversationKey] = model;
  writeStickyStore(all);
}

/** Test / character-switch hook. */
export function clearStickyOvh(conversationKey?: string): void {
  if (!conversationKey) {
    stickyMemory.clear();
    writeStickyStore({});
    return;
  }
  stickyMemory.delete(conversationKey);
  const all = readStickyStore();
  delete all[conversationKey];
  writeStickyStore(all);
}

export type PreferOvhOpts = {
  characterId?: string;
  /** defaults to conversationBrainKey(characterId) */
  conversationKey?: string;
};

/**
 * OVH order for this turn: sticky (same conversation) → character home → siblings.
 * Failover walks the list when the lead is cooling or dead in this region.
 */
export function preferOvhModels(opts: PreferOvhOpts | string = {}): OvhModelId[] {
  // string form kept for older call sites / tests that pass a conversation key
  const normalized: PreferOvhOpts = typeof opts === 'string' ? { conversationKey: opts } : opts;
  const key = normalized.conversationKey ?? conversationBrainKey(normalized.characterId);
  const home = preferOvhForCharacter(normalized.characterId);
  const sticky = getStickyOvh(key);
  const primary = sticky ?? home;
  return [primary, ...OVH_MODELS.filter((m) => m !== primary)];
}

/** Per-(host, model) anonymous-budget cooldown, in ms.
 *
 *  What the OVH budget actually is (measured 2026-11-08, from one IP):
 *   · per-IP PER MODEL, not per-IP. Two quick calls to ONE model succeed, the
 *     third is HTTP 429; the same two calls to a DIFFERENT model succeed
 *     again straight away. Rotating 3 models gave 6 successful calls back to
 *     back where one model allowed 2, and a 20-request burst across 5 models
 *     landed exactly 10 OK (2 per model) in 4.7s.
 *   · the window is ~25s, not 60s. After 2 calls, one more succeeded again
 *     at 25s and was still refused at 15s and 20s.
 *  So the old "2 requests per 60s, 30s per host" rule was spending about a
 *  ninth of the real allowance. A model that just answered now rests 25s
 *  while its siblings carry the next turn — a second message 5s later still
 *  reaches OVH, on a different model, instead of being told to wait.
 *
 *  The budget is enforced per (host, model), which is why the map is keyed by
 *  `host::model`: same host + different model is a DIFFERENT budget.
 *
 *   · pollinations — ~1 request / 30-45s per IP; 35s sits inside that
 *   · ovhcloud     — 2 requests / 25s per (IP, model), re-checked below
 *   · puter        — no anonymous per-IP budget to protect
 */
export const RACER_COOLDOWN_MS = {
  pollinations: 35_000,
  ovhcloud: 25_000,
  puter: 0,
} as const;

/** How many dispatches one (host, model) slot may spend inside its window.
 *  Measured on OVH: two quick calls to one model both succeed and only the
 *  THIRD is refused, so a single-shot window per 25s would leave half of each
 *  model's allowance on the table. The cap exists so a hot retry loop cannot
 *  burst straight into a 429. */
export const RACER_MAX_SENDS = {
  pollinations: 1,
  ovhcloud: 2,
  puter: Number.POSITIVE_INFINITY,
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

/** One racer = one (host, model) budget slot. Two racers may share a `host`
 *  when that host meters quota PER MODEL (OVH does); they must never share a
 *  `host` + `model` pair, because that spends one budget twice for nothing. */
export interface RacerSpec {
  id: string;
  /** owning endpoint. NOTE: a shared host does not mean an independent
   *  upstream — Pollinations and OVHcloud both land on OVH's inference, so
   *  they are two quotas on one upstream, not two companies. Puter is the
   *  only genuinely independent third. */
  host: string;
  /** model id sent to that host. `host::model` is the budget key, so it must
   *  be globally unique. */
  model: string;
  /** ms to wait after a dispatch to this (host, model) before dispatching
   *  again — the anonymous quota is counted per pair, not per host */
  cooldownMs: number;
  /** dispatches allowed per window; the measured allowance, so a fast retry
   *  cannot waste it and cannot burst past it either */
  maxSends: number;
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

/** The free lane. One request per racer per turn, first token wins.
 *  r143 — OVH is expanded into one racer PER MODEL: its anonymous quota is
 *  metered per (IP, model), so N model racers give ~N x the turns before any
 *  of them is refused. The list below is therefore ordered "best Cantonese
 *  first, then speed", and `selectRacers` walks it in that order. */
export const FREE_RACERS: RacerSpec[] = [
  {
    id: 'pollinations',
    host: 'pollinations',
    model: POLLINATIONS_MODEL,
    cooldownMs: RACER_COOLDOWN_MS.pollinations,
    maxSends: RACER_MAX_SENDS.pollinations,
    buildRequest: (ctx) => ({
      transport: 'http',
      url: `${LANE_ORIGIN}/openai`,
      headers: { 'Content-Type': 'application/json' },
      // `reasoning_effort: low` skips the hidden chain so the first spoken
      // token arrives sooner. Pollinations accepts it; OVH answers 400, so
      // no OVH racer below may set it.
      body: chatBody(POLLINATIONS_MODEL, ctx, { reasoning_effort: 'low' }),
    }),
    parseChunk: openAiDelta,
  },
  // One OVH racer per verified-working model, best Cantonese first. Each has
  // its own quota, so they race side by side instead of queueing.
  ...OVH_MODELS.map((model, i): RacerSpec => ({
    id: i === 0 ? 'ovhcloud' : `ovhcloud-${model}`,
    host: 'ovhcloud',
    model,
    cooldownMs: RACER_COOLDOWN_MS.ovhcloud,
    maxSends: RACER_MAX_SENDS.ovhcloud,
    buildRequest: (ctx) => ({
      transport: 'http',
      url: `${OVH_ORIGIN}/v1/chat/completions`,
      // No Authorization header at all — the trial tier is anonymous, and a
      // placeholder (`Bearer no-key`) is answered with 403, so an SDK that
      // injects a dummy key silently kills this whole host.
      headers: { 'Content-Type': 'application/json' },
      body: chatBody(model, ctx),
    }),
    parseChunk: openAiDelta,
  })),
  {
    id: 'puter',
    host: 'puter',
    model: 'puter-auto',
    cooldownMs: RACER_COOLDOWN_MS.puter,
    maxSends: RACER_MAX_SENDS.puter,
    buildRequest: ({ system, messages }) => ({
      transport: 'sdk',
      sdk: 'puter',
      messages: withSystem(system, messages),
    }),
    parseChunk: (payload) => (payload as { text?: string } | null)?.text ?? '',
  },
];

// ---------- per-(host, model) cooldown ----------
// r2026-10-06.136 — keyless Puter racer plumbing (one of the FREE_RACERS
// above); declared here so the cooldown reset can clear the cached promise.
type PuterPart = { text?: string };
type PuterAI = { chat: (messages: unknown[], opts?: Record<string, unknown>) => Promise<AsyncIterable<PuterPart>> };
type PuterSDK = { ai: PuterAI };

/** The anonymity budget key. Quota is counted per model, so OVH sharing one
 *  host across three racers still gets three separate windows. */
export function racerKey(spec: Pick<RacerSpec, 'host' | 'model'>): string {
  return `${spec.host}::${spec.model}`;
}

/** Dispatch timestamps inside each (host, model)'s current window. A list,
 *  not one number, because OVH's allowance is TWO requests per window — a
 *  single timestamp could only enforce one, or none. */
const racerSends = new Map<string, number[]>();
// Puter's SDK promise, reset alongside the windows so a retry really retries.
let puterLoader: Promise<PuterSDK> | null = null;

/** The window this key is currently in, pruned to `cooldownMs` of history. */
function sendsInWindow(key: string, cooldownMs: number, at: number): number[] {
  const sends = racerSends.get(key) ?? [];
  const live = cooldownMs > 0 ? sends.filter((t) => at - t < cooldownMs) : sends;
  if (live.length !== sends.length) {
    if (live.length) racerSends.set(key, live); else racerSends.delete(key);
  }
  return live;
}

/** True while this (host, model) has spent its allowance for the window. */
export function racerCoolingDown(
  spec: Pick<RacerSpec, 'id' | 'host' | 'model' | 'cooldownMs' | 'maxSends'>,
  at: number = Date.now(),
): boolean {
  if (spec.cooldownMs <= 0) return false;
  const sends = sendsInWindow(racerKey(spec), spec.cooldownMs, at);
  return sends.length >= (spec.maxSends ?? 1);
}

/** Record a dispatch — or a 402/429, which spends the window's whole
 *  allowance — for this (host, model). Accepts a racer id for convenience;
 *  ids are unique per racer. */
export function markRacerSent(id: string, at: number = Date.now(), exhausted = false): void {
  const spec = FREE_RACERS.find((r) => r.id === id);
  const key = spec ? racerKey(spec) : id;
  if (exhausted && spec) {
    // A refusal means the rest of the allowance is gone too, so stamp the
    // window full instead of letting the next turn walk into another 429.
    const max = Number.isFinite(spec.maxSends) ? spec.maxSends : 1;
    racerSends.set(key, Array.from({ length: Math.max(max, 1) }, () => at));
    return;
  }
  const sends = (racerSends.get(key) ?? []).filter((t) => spec ? at - t < spec.cooldownMs : true);
  sends.push(at);
  racerSends.set(key, sends);
}

/** Test hook: clear every window (and conversation sticky brains). */
export function resetRacerCooldowns(): void {
  racerSends.clear();
  puterLoader = null;
  clearStickyOvh();
}

/** How many racers one turn should launch at once. The whole point of the
 *  rotation is that a burst spreads across (host, model) slots instead of
 *  re-asking one, so a turn takes the freshest few rather than all of them —
 *  firing every slot every turn would spend five racers' allowances to answer
 *  one line (and both of each OVH model's two sends). */
export const RACERS_PER_TURN = 3;

/** Which racers may fire right now, best-first. */
export function eligibleRacers(at: number = Date.now()): RacerSpec[] {
  return FREE_RACERS.filter((r) => !racerCoolingDown(r, at));
}

export type SelectRacersOpts = {
  at?: number;
  /** Preferred OVH model order for this turn's situation. */
  preferOvh?: readonly OvhModelId[];
};

/**
 * The lanes this turn should actually race: the best few racers that are not
 * cooling down. Cooling lanes are skipped so their budget refills.
 *
 * Puter stays in the round when fresh (only independent racer). OVH is capped
 * to ONE model per turn — sticky / character home when fresh, otherwise the
 * next sibling — so a conversation does not hop brains mid-thread. Sibling
 * OVH models are the failover when the preferred lane is cooling, dead, or
 * slow in this region.
 */
export function selectRacers(atOrOpts: number | SelectRacersOpts = Date.now()): RacerSpec[] {
  const opts: SelectRacersOpts = typeof atOrOpts === 'number' ? { at: atOrOpts } : atOrOpts;
  const at = opts.at ?? Date.now();
  const prefer = opts.preferOvh ?? preferOvhModels();
  const fresh = oneOvhMax(rankForTurn(eligibleRacers(at), prefer), prefer);
  if (fresh.length >= RACERS_PER_TURN) return fresh.slice(0, RACERS_PER_TURN);
  // Already have a viable set (e.g. Puter + sticky OVH). Do not pull cooling
  // Pollinations / sibling OVH back in — that broke per-IP windows and could
  // hop the conversation onto another brain. Only when EVERY lane is cooling
  // do we fall through to the longest-idle spare.
  if (fresh.length > 0) return fresh;
  return [longestIdleRacer(at) ?? FREE_RACERS[0]!];
}

/** Newest dispatch to this slot, or -Infinity if it has never been asked. */
function lastSendOf(spec: Pick<RacerSpec, 'host' | 'model'>): number {
  const sends = racerSends.get(racerKey(spec));
  return sends?.length ? sends[sends.length - 1]! : -Infinity;
}

/** Index in the preference list; unknown models sort last. */
function ovhPreferRank(model: string, prefer: readonly OvhModelId[]): number {
  const i = prefer.indexOf(model as OvhModelId);
  return i < 0 ? prefer.length + 1 : i;
}

/** Best-first: Puter first (independent), then non-OVH, then OVH by preference. */
function rankForTurn(specs: RacerSpec[], prefer: readonly OvhModelId[]): RacerSpec[] {
  const puter = specs.filter((r) => r.host === 'puter');
  const ovh = specs
    .filter((r) => r.host === 'ovhcloud')
    .sort((a, b) => ovhPreferRank(a.model, prefer) - ovhPreferRank(b.model, prefer));
  const other = specs.filter((r) => r.host !== 'puter' && r.host !== 'ovhcloud');
  return [...puter, ...other, ...ovh];
}

/** At most one OVH racer: preferred when fresh, else the first sibling in order. */
export function oneOvhMax(specs: RacerSpec[], prefer: readonly OvhModelId[]): RacerSpec[] {
  const preferred = prefer[0];
  const preferredFresh = preferred
    ? specs.find((r) => r.host === 'ovhcloud' && r.model === preferred)
    : undefined;
  let keptOvh = false;
  const out: RacerSpec[] = [];
  for (const r of specs) {
    if (r.host !== 'ovhcloud') {
      out.push(r);
      continue;
    }
    if (preferredFresh) {
      if (r.model === preferred) out.push(r);
      continue;
    }
    if (!keptOvh) {
      out.push(r);
      keptOvh = true;
    }
  }
  return out;
}

/** The cooling (host, model) that has been waiting longest — last resort. */
export function longestIdleRacer(at: number = Date.now()): RacerSpec | undefined {
  const cooling = FREE_RACERS.filter((r) => racerCoolingDown(r, at));
  if (!cooling.length) return FREE_RACERS[0];
  return cooling.reduce((oldest, r) => (lastSendOf(r) < lastSendOf(oldest) ? r : oldest));
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

/** The instant local lane: caring ack + concrete offer — never "on your mind" / presence nags / opaque jargon. */
const FALLBACK_BANKS: Record<string, string[]> = {
  yue: [
    '我喺度聽緊你㗎，慢慢嚟——想講天氣、小事，定係聽個冷知識？',
    '聽到喇，唔緊要。不如講下今日一件細細嘅事，或者我講個短故事你聽？',
    '唔使急，我陪住你。想聽首歌、伸展一下，定係繼續傾你頭先嗰樣？',
  ],
  zh: [
    '我在听着你，慢慢来——想聊天气、小事，还是听个冷知识？',
    '听到了，没事。不如说说今天一件小事，或者我讲个短故事给你听？',
    '不着急，我陪着你。想听首歌、伸展一下，还是继续你刚才那件事？',
  ],
  ja: [
    'ちゃんと聞いてるよ、ゆっくりでいい——天気、小さなこと、それとも豆知識？',
    '聞こえてる、大丈夫。今日の小さな話でもいいし、短いお話でもいいよ。',
    '急がなくていい、そばにいるよ。歌、ストレッチ、それともさっきの続き？',
  ],
  en: [
    "I'm listening — weather, a tiny story, or a fun fact, whichever you want.",
    'I hear you; no pressure. We can talk about one small thing from today, or I can tell a short story.',
    "I'm with you — a song, a stretch, or we stay with what you just said.",
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
  // Only a real dispatch spends an anonymous slot, and it spends the slot of
  // this (host, model) — a sibling model on the same host keeps its own.
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
          // signal instead of a bare status code. 402/429 mean this slot's
          // anonymous allowance is gone, so its window restarts from now —
          // and it is stamped FULL, because a refusal promises nothing about
          // the rest of the allowance.
          let body = '';
          try { body = await res.text(); } catch { /* unreadable — ignore */ }
          if (res.status === 402 || res.status === 429) markRacerSent(spec.id, Date.now(), true);
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

/** Free lane: race the freshest few racers, first token wins, losers aborted.
 *  r142 — no longer takes a BrainSpec: the racers are host specs, so this can
 *  no longer accidentally fire two requests at one provider's budget.
 *  r143 — a racer is one (host, model) budget slot, not one company, so a
 *  turn can legitimately include several OVH models at once. */
export type RaceFreeLanesOpts = {
  characterId?: string;
  conversationKey?: string;
};

export async function raceFreeLanes(
  system: string,
  messages: ChatMessage[],
  onPartial?: (text: string) => void,
  maxTokens = 280,
  raceOpts?: RaceFreeLanesOpts,
): Promise<string> {
  const ctx: RacerRequestContext = { system, messages, maxTokens };
  const conversationKey = raceOpts?.conversationKey ?? conversationBrainKey(raceOpts?.characterId);
  const preferOvh = preferOvhModels({ characterId: raceOpts?.characterId, conversationKey });
  // One OVH brain per conversation when healthy; siblings only on failover
  // (cooling / dead / slow in this region). Puter + Pollinations still race
  // as independent quotas beside that sticky OVH slot.
  const lanes = selectRacers({ preferOvh });
  if (!lanes.length) throw new Error('no free lane available');
  try {
    return await launchRace(lanes, ctx, onPartial, conversationKey);
  } catch (err) {
    // Every FRESH lane failed. Rather than dropping straight to the canned
    // line, borrow the (host, model) that has been cooling longest — one
    // extra request beats silence. Only if that also fails does the caller's
    // unchanged fallback (live facts, then the local lane) take over.
    const tried = new Set(lanes.map((r) => r.id));
    const spare = longestIdleRacer();
    if (!spare || tried.has(spare.id) || !(err instanceof Error)) throw err;
    return launchRace([spare], ctx, onPartial, conversationKey);
  }
}

/** One round: launch these lanes, first token wins, losers are aborted. */
async function launchRace(
  lanes: RacerSpec[],
  ctx: RacerRequestContext,
  onPartial?: (text: string) => void,
  conversationKey?: string,
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
  const winner = lanes[winIdx]!;
  // Pin the conversation to the OVH model that actually answered — including
  // failover onto a sibling when the home / sticky lane was dead or slow.
  if (conversationKey && winner.host === 'ovhcloud'
    && (OVH_MODELS as readonly string[]).includes(winner.model)) {
    setStickyOvh(conversationKey, winner.model as OvhModelId);
  }
  const text = await racers[winIdx]!.finish();
  if (!text.trim()) throw new Error(`${winner.id} empty`);
  return text;
}

/** Strip the trailing emotion tag → final chat result. Exported for tests. */
export function finishReply(content: string, opts?: { detailed?: boolean; world?: string; language?: string }): ClientChatResult {
  const hints = parseEmotionHints(content) as Record<string, number>;
  // Strip the machine tag, display chrome, then banned giggle tokens so neither
  // the bubble nor TTS can reintroduce hehe/haha/hey-hey (laughs = SFX only).
  const cleaned = stripLaughTokens(
    cleanForDisplay(content.replace(/\[emotion:\{[^}]*\}\]/g, '')),
  );
  const reply = shapeCompanionReply(cleaned, {
    detailed: opts?.detailed,
    world: opts?.world,
    language: opts?.language,
  });
  return { reply: reply || '…', emotionHints: hints };
}

interface SanityContext {
  language?: string;
  persona?: string;
  lastUser: string;
  detailed: boolean;
}

function sanityOpts(ctx: SanityContext) {
  return {
    language: ctx.language,
    persona: ctx.persona,
    lastUser: ctx.lastUser,
    detailed: ctx.detailed,
  };
}

async function streamModelReply(
  spec: ReturnType<typeof pickBrain>['spec'],
  key: string,
  system: string,
  messages: ChatMessage[],
  onPartial: ClientChatOptions['onPartial'],
  maxTokens: number,
  raceOpts?: RaceFreeLanesOpts,
): Promise<string> {
  return spec.id === 'pollinations'
    ? raceFreeLanes(system, messages, onPartial, maxTokens, raceOpts)
    : streamCompletion(spec, key, system, messages, onPartial, maxTokens);
}

function packageReply(
  content: string,
  ctx: SanityContext & { world?: string; worldSpoken?: string; story?: boolean },
): ClientChatResult {
  const done = finishReply(content, {
    detailed: ctx.detailed,
    world: ctx.world,
    language: ctx.language,
  });
  // Ability/showcase invites stay idle-only — strip offtopic tack-ons even on
  // rich/long paths (exception never authorizes dance-on-Jupiter).
  const cleaned = stripOffTopicAbilityTacks(done.reply, ctx.lastUser) || done.reply;
  const factsTurn = Boolean(ctx.worldSpoken?.trim()) || /\b(?:Weather|Light news|Recent news)\s*:/i.test(ctx.world ?? '');
  const spoken = ctx.story || factsTurn
    ? cleaned
    : withQuestion(cleaned, ctx.language);
  const reply = preferLiveReply(spoken, ctx.world, ctx.worldSpoken, ctx.language);
  return { ...done, reply };
}


/** Keyed BYOK / capable brain (not the keyless free lane). */
export function isKeyedBrain(picked?: ReturnType<typeof pickBrain>): boolean {
  const p = picked ?? pickBrain();
  return !p.spec.keyless && !!p.key;
}

/** A cook-along / long companion turn legitimately needs more room than a chat turn. */
export function wantsDetail(world?: string, userText?: string): boolean {
  if (/\b(?:Recipe|Learn)\s*:/.test(world ?? '')) return true;
  return userText ? wantsLongCompanionReply(userText) : false;
}

/** Resolve story / science / help mode for budgets + system addenda. */
export function resolveLongTalkKind(
  lastUser: string,
  opts?: Pick<ClientChatOptions, 'persona' | 'storySession'>,
): LongTalkKind | null {
  return detectLongTalkKind(lastUser, {
    persona: opts?.persona,
    storySession: opts?.storySession,
  });
}

export async function clientChat(
  messages: ChatMessage[],
  opts?: ClientChatOptions,
): Promise<ClientChatResult> {
  const recent = trimHistoryForPrompt(messages);
  const lastUser = recent[recent.length - 1]?.content ?? '';
  const longKind = resolveLongTalkKind(lastUser, opts);
  const story = longKind === 'story' || wantsStoryTurn(lastUser, {
    persona: opts?.persona,
    storySession: opts?.storySession,
  });
  const recipeDetail = wantsDetail(opts?.world, lastUser);
  const detailed = recipeDetail || longKind != null || story;
  const raceOpts: RaceFreeLanesOpts = {
    characterId: opts?.characterId,
    conversationKey: conversationBrainKey(opts?.characterId),
  };
  const shapeLong = detailed;
  const keyedBrain = isKeyedBrain(pickBrain());
  // Free short / demo stays one-topic; story + keyed detailed get the multi-beat exception.
  const oneTopicAppendix = mustStayOneTopic({ story, detailed, keyedBrain })
    ? '\nTOPIC MIXTURE: Stay on ONE topic this turn. Never bolt dance/sing/music/weather/news/story invites onto an unrelated answer. Ability invites are idle-only.'
    : '';
  const longBlock = longKind ? `\n${longTalkSystemBlock(longKind, opts?.language)}` : '';
  const system = `${BASE_SYSTEM}${oneTopicAppendix}\nReply in speakable sentences only. NEVER show chain-of-thought, plans, analysis, markdown, code, or emotion labels in the prose. No "the user wants". Never type hehe/haha/hey-hey. The only machine tag is the final [emotion:{...}] line — weight real feelings 0.7–1.0 when strong so voice can carry them.\n${languageBlock(opts?.language)}${longBlock}${opts?.persona ? `\nPersona: ${opts.persona}` : ''}${opts?.memory ? `\n${opts.memory}` : ''}${worldBlock(opts?.world)}`;
  const maxTokens = maxTokensForLongTalk(longKind, recipeDetail && longKind == null);
  const onPartial = opts?.onPartial
    ? (partial: string) => {
        opts.onPartial?.(shapeCompanionReply(partial, {
          streaming: true,
          detailed: shapeLong,
          world: opts?.world,
          language: opts?.language,
        }));
      }
    : undefined;
  const factsReply = (): ClientChatResult | null => {
    const spoken = opts?.worldSpoken?.trim();
    if (!spoken) return null;
    // Live weather/news already spoken — never append a follow-up question.
    return { reply: spoken, emotionHints: analyzeText(spoken) as Record<string, number> };
  };
  const first = pickBrain();
  const sanityCtx: SanityContext = {
    language: opts?.language,
    persona: opts?.persona,
    lastUser,
    detailed,
  };
  const finalize = (raw: string) =>
    packageReply(raw, { ...sanityCtx, world: opts?.world, worldSpoken: opts?.worldSpoken, story });
  const rejectCreditBody = (specId: string, content: string) => {
    if (specId !== 'pollinations' && content.length < 160 && CREDIT_RE.test(content)) {
      throw new Error(`${specId} out of credit`);
    }
  };
  try {
    const content = await streamModelReply(first.spec, first.key, system, recent, onPartial, maxTokens, raceOpts);
    rejectCreditBody(first.spec.id, content);
    const out = finalize(content);
    if (replyLooksNonsense(out.reply, sanityOpts(sanityCtx))) {
      const strict = `${system}\n${STRICT_REPLY_APPENDIX}`;
      try {
        const retry = await streamModelReply(first.spec, first.key, strict, recent, undefined, maxTokens, raceOpts);
        rejectCreditBody(first.spec.id, retry);
        const retryOut = finalize(retry);
        if (!replyLooksNonsense(retryOut.reply, sanityOpts(sanityCtx))) return retryOut;
      } catch { /* local fallback */ }
      return localFallbackReply(lastUser, opts?.language);
    }
    return out;
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
      const content = await raceFreeLanes(system, recent, onPartial, maxTokens, raceOpts);
      if (content.length < 160 && CREDIT_RE.test(content)) throw new Error('pollinations credit');
      const out = finalize(content);
      if (replyLooksNonsense(out.reply, sanityOpts(sanityCtx))) {
        const strict = `${system}\n${STRICT_REPLY_APPENDIX}`;
        try {
          const retry = await raceFreeLanes(strict, recent, undefined, maxTokens, raceOpts);
          const retryOut = finalize(retry);
          if (!replyLooksNonsense(retryOut.reply, sanityOpts(sanityCtx))) return retryOut;
        } catch { /* local fallback */ }
        return localFallbackReply(lastUser, opts?.language);
      }
      return out;
    } catch {
      // r.46 — even the free race lost: keep the conversation alive NOW
      const facts = factsReply();
      if (facts) return facts;
      noteSlowLane(opts?.language);
      return localFallbackReply(lastUser, opts?.language);
    }
  }
}
