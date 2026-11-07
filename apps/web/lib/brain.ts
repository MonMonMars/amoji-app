'use client';
// Brain routing (r2026-10-03.05): which LLM answers the chat, and with what key.
// Everything lives in localStorage on the user's own device — no key is ever
// committed to the repo. `auto` walks BRAIN_SPECS top-down and picks the first
// provider with a stored key; with no keys it falls back to keyless Pollinations.
// r2026-10-03.27: a provider that just failed hard (e.g. the key's account ran
// out of credit) is PARKED for the rest of the session — pickBrain skips it so
// the chat doesn't burn a 30s timeout on a dead key on every single message.
// Reloading the app clears the parking (the key might be topped up by then).
//
// r2026-11-08 — the brain list is now a HONG KONG list, not a global one.
// Every status below was measured from this machine (egress 223.19.127.18,
// AS9304 HGC, Kowloon) with curl on 2026-11-07, no credential attached, so the
// code is an auth answer and not an edge block:
//   api.z.ai/api/paas/v4/models               401  reachable (auth required)
//   api.deepseek.com/models                   401  reachable (auth required)
//   api.moonshot.ai/v1/models                 401  reachable (auth required)
//   openrouter.ai/api/v1/models               200  reachable
//   text.pollinations.ai/openai               200  reachable, keyless
//   api.groq.com/openai/v1/models             403  "Forbidden" — GEO-BLOCKED
//   api.cerebras.ai/v1/models                 403  GEO-BLOCKED
//   generativelanguage.googleapis.com/…       403  "Permission denied on the
//                                                  service" — the Gemini *web*
//                                                  app works in HK, the API is
//                                                  not in Google's region list
// Two consequences are baked into this file:
//  1. Groq is GONE from the list. A 403 with no key at all is a region block,
//     so no Hong Kong user can ever make that provider work — offering it was
//     a trap. (Its model also left Groq's free tier on 2026-08-16.) Only a
//     stored key from an older build keeps it resolvable; see LEGACY_BRAINS.
//  2. Ordering leads with Z.ai GLM, because it is the only provider whose free
//     tier is free FOREVER, email signup, no card, no +86 phone — the cheapest
//     possible path for a Hong Kong user (docs.z.ai/guides/overview/pricing,
//     checked 2026-11-07: GLM-4.7-Flash and GLM-4.5-Flash are "Free" on every
//     line item).
//
// BYOK is an OPTIONAL upgrade, never a setup step. Roughly 40–92% of users
// abandon a product at the API-key step, so the UI treats this list as an
// advanced extra and the app is fully usable with zero keys (keyless lane).

export type BrainProvider = 'auto' | 'pollinations' | 'zai' | 'deepseek' | 'moonshot' | 'openrouter' | 'groq';

export interface BrainSpec {
  id: Exclude<BrainProvider, 'auto'>;
  label: string;
  baseUrl: string;
  model: string;
  keyless: boolean;
  /** one-line hint shown in the optional Advanced section */
  blurb: string;
  /** where to get a key (shown next to the key field) */
  keyFrom: string;
  /** false = measured unusable from Hong Kong; never offered, never auto-picked */
  offered: boolean;
}

// Order matters: `auto` tries these top-down.
export const BRAIN_SPECS: BrainSpec[] = [
  {
    id: 'zai', label: 'Z.ai GLM', keyless: false, offered: true,
    baseUrl: 'https://api.z.ai/api/paas/v4', model: 'glm-4.7-flash',
    blurb: 'Free forever, email signup, no card — the easiest key from Hong Kong.',
    keyFrom: 'z.ai/manage-apikey/apikey-list',
  },
  {
    id: 'deepseek', label: 'DeepSeek', keyless: false, offered: true,
    baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash',
    blurb: 'Free trial credit, PayPal top-up accepted.',
    keyFrom: 'platform.deepseek.com',
  },
  {
    id: 'moonshot', label: 'Moonshot Kimi', keyless: false, offered: true,
    baseUrl: 'https://api.moonshot.ai/v1', model: 'kimi-k3',
    blurb: 'Best Cantonese & personality — paid per token.',
    keyFrom: 'platform.moonshot.ai',
  },
  {
    id: 'openrouter', label: 'OpenRouter', keyless: false, offered: true,
    // Only non-US-lab free models are listed anywhere in this file: OpenRouter
    // 403-bans OpenAI / Google / Anthropic / xAI models for Hong Kong traffic,
    // so `:free` picks have to come from elsewhere. Checked 2026-11-07.
    baseUrl: 'https://openrouter.ai/api/v1', model: 'xingchen-agi/xing4.0-29b-a4b:free',
    blurb: 'One key, many models. Free tier is China-lab models only in HK.',
    keyFrom: 'openrouter.ai/keys',
  },
  {
    id: 'pollinations', label: 'Pollinations', keyless: true, offered: true,
    baseUrl: 'https://text.pollinations.ai/openai', model: 'openai',
    blurb: 'Zero setup — free shared queue, slower when busy.',
    keyFrom: '',
  },
  {
    // Kept only so a key saved by an older build still resolves instead of
    // silently vanishing; never offered and never auto-picked. Groq answers
    // 403 (no credential at all) from Hong Kong, i.e. geo-blocked, and
    // llama-3.3-70b-versatile left the free tier on 2026-08-16.
    id: 'groq', label: 'Groq', keyless: false, offered: false,
    baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile',
    blurb: 'Legacy — not reachable from Hong Kong.',
    keyFrom: '',
  },
];

/** The providers a user may actually choose: reachable from HK and current. */
export const OFFERED_BRAINS: BrainSpec[] = BRAIN_SPECS.filter((s) => s.offered);

export function brainSpec(id: string): BrainSpec | undefined {
  return BRAIN_SPECS.find((s) => s.id === id);
}

/** Providers parked for this session after a hard failure (out of credit etc). */
const deadBrains = new Set<string>();

export function markBrainDead(id: string): void {
  deadBrains.add(id);
}

export function isBrainDead(id: string): boolean {
  return deadBrains.has(id);
}

/** Clear the parking (reload does this too — kept for tests & future retry UI). */
export function resetBrainDead(): void {
  deadBrains.clear();
}

const LS_PROVIDER = 'amoji.brain.provider';
const lsKey = (id: string) => `amoji.brain.key.${id}`;

const store = (): Storage | null =>
  typeof localStorage === 'undefined' ? null : localStorage;

/** Stored choice. A legacy id (e.g. the retired Groq entry) is honoured ONLY
 *  while its key is still on this device — otherwise it silently becomes the
 *  keyless lane instead of pointing at a provider that is blocked here. */
export function brainProvider(): BrainProvider {
  const v = store()?.getItem(LS_PROVIDER);
  const known = BRAIN_SPECS.some((s) => s.id === v);
  if (!v || !known) return 'auto';
  if (v === 'auto') return 'auto';
  const spec = brainSpec(v);
  if (spec && !spec.offered && !brainKey(v)) return 'auto';
  return v as BrainProvider;
}

export function setBrainProvider(p: BrainProvider): void {
  store()?.setItem(LS_PROVIDER, p);
}

export function brainKey(id: string): string {
  return (store()?.getItem(lsKey(id)) ?? '').trim();
}

export function setBrainKey(id: string, key: string): void {
  const s = store();
  if (!s) return;
  if (key.trim()) s.setItem(lsKey(id), key.trim());
  else s.removeItem(lsKey(id));
}

export interface PickedBrain { spec: BrainSpec; key: string }

/** Resolve which brain answers right now. Explicit choice wins if usable;
 *  otherwise `auto` prefers the first keyed spec, else keyless Pollinations.
 *  r.27: parked (dead) specs are skipped in every branch, and the pool can
 *  never empty out — the keyless lane is always the last resort.
 *  r2026-11-08: unoffered (geo-blocked) specs are never auto-picked; only an
 *  explicit choice backed by a stored key can reach them. */
export function pickBrain(): PickedBrain {
  const want = brainProvider();
  const alive = BRAIN_SPECS.filter((s) => !isBrainDead(s.id));
  const pool = alive.length ? alive : BRAIN_SPECS;
  if (want !== 'auto') {
    const spec = pool.find((s) => s.id === want);
    if (spec) {
      const key = brainKey(spec.id);
      if (spec.keyless || key) return { spec, key };
    }
    // forced provider without a key (or parked) → fall through to the free lane
  }
  for (const spec of pool) {
    if (!spec.offered) continue;
    const key = brainKey(spec.id);
    if (key) return { spec, key };
  }
  const fallback = pool.find((s) => s.id === 'pollinations') ?? pool[pool.length - 1]!;
  return { spec: fallback, key: '' };
}

// ── Per-provider request body ─────────────────────────────────────────────────
/** Extras merged into every chat request for this provider.
 *
 *  Z.ai needs one: the GLM-4.7 series has chain-of-thought ON by default and
 *  `reasoning_effort` cannot switch it off (`docs.z.ai/api-reference/llm/
 *  chat-completion`: that knob only takes effect on GLM-5.2 and above). The
 *  documented off switch is `thinking:{type:'disabled'}`
 *  (docs.z.ai/guides/capabilities/thinking-mode, checked 2026-11-07). Without
 *  it the hidden chain pushes the FIRST spoken token past the 20s keyed
 *  budget, so a key that just passed Test would still time out in chat.
 *
 *  Every other lane keeps `reasoning_effort:'low'`: the keyless lane is a
 *  reasoning model and low effort shortens the hidden chain before speech. */
export function brainBodyExtras(id: string): Record<string, unknown> {
  if (id === 'zai') return { thinking: { type: 'disabled' } };
  return { reasoning_effort: 'low' };
}

// ── Test button ───────────────────────────────────────────────────────────────
// The single highest-value affordance in the optional section: a non-technical
// user pastes a key, taps once, and learns "works" or exactly what is wrong,
// instead of discovering it mid-conversation when her reply degrades.
//
// The probe is a real (1-token) chat completion rather than a /models read,
// because it must exercise the same path the chat uses: endpoint + key + model
// id. A /models call on Z.ai/DeepSeek/Moonshot needs auth but never validates
// the model id, so a stale id would look healthy and then fail in chat.
//
// CORS matters for a browser-direct call; every offered provider answered the
// OPTIONS preflight for `authorization,content-type` on 2026-11-07 (Z.ai 200,
// DeepSeek 200, Moonshot 204, OpenRouter 204), so this works from a static host.

export type BrainProbe = 'ok' | 'nokey' | 'auth' | 'blocked' | 'model' | 'credit' | 'offline' | 'timeout';

const PROBE_CREDIT_RE = /insufficient|balance|credit|quota|余额|額度|余额不足/i;

/** Try one key against one provider. Never throws; returns a verdict word that
 *  the UI maps to one localized line. */
export async function probeBrain(
  id: string,
  key: string,
  opts?: { fetchImpl?: typeof fetch; timeoutMs?: number },
): Promise<BrainProbe> {
  const spec = brainSpec(id);
  if (!spec) return 'model';
  const k = key.trim();
  if (!k && !spec.keyless) return 'nokey';
  const doFetch = opts?.fetchImpl ?? (typeof fetch === 'undefined' ? null : fetch);
  if (!doFetch) return 'offline';

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts?.timeoutMs ?? 12_000);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (k) headers.Authorization = `Bearer ${k}`;
    if (spec.id === 'openrouter') {
      headers['HTTP-Referer'] = 'https://amoji.app';
      headers['X-Title'] = 'Amoji';
    }
    const res = await doFetch(`${spec.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      signal: ctl.signal,
      body: JSON.stringify({
        model: spec.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        stream: false,
        ...brainBodyExtras(spec.id),
      }),
    });
    if (res.ok) return 'ok';
    if (res.status === 401) return 'auth';
    // 403 is the Hong Kong edge block (Groq/Cerebras/Gemini answer this with no
    // credential at all) — distinct from a bad key, which is 401 everywhere.
    if (res.status === 403) return 'blocked';
    if (res.status === 402 || res.status === 429) return 'credit';
    if (res.status === 404 || res.status === 422 || res.status === 400) {
      // A retired model id shows up as 404 on every provider here; the body is
      // the only way to tell "no such model" from "bad request shape", which a
      // 1-token probe cannot otherwise trigger.
      let body = '';
      try { body = await res.text(); } catch { /* unreadable — fall through */ }
      return PROBE_CREDIT_RE.test(body) ? 'credit' : 'model';
    }
    return 'offline';
  } catch {
    return ctl.signal.aborted ? 'timeout' : 'offline';
  } finally {
    clearTimeout(timer);
  }
}
