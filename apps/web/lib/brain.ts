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
// r2026-11-08 — BYOK is a reachable feature again (Settings → 🧠 Sharper
// brain), so these ids are load-bearing once more. Re-verified against each
// provider's live model list on 2026-11-08; three had quietly died and would
// have hard-failed on every single call:
//  · Groq `llama-3.3-70b-versatile` — shut down 2026-08-16 (Groq's own
//    deprecation page lists `openai/gpt-oss-120b` as the replacement).
//  · Moonshot `kimi-k2.5` — listed as Deprecated; only K3-series is open to
//    new sign-ups now.
//  · OpenRouter `openai/gpt-oss-20b:free` — no longer in the catalogue at all
//    (GET /api/v1/models returns only the paid gpt-oss rows). Replaced by the
//    `openrouter/free` router, which always resolves to a live free model.
// probeBrain() below is the one-tap "Test" behind that UI: one minimal real
// request to the exact endpoint the chat uses, so a green verdict means this
// key + model + region works right now, and a red one names the cause.

export type BrainProvider = 'auto' | 'pollinations' | 'deepseek' | 'groq' | 'moonshot' | 'openrouter';

/** A concrete provider — everything except the `auto` meta-choice. */
export type BrainId = Exclude<BrainProvider, 'auto'>;

/**
 * A regional caveat worth showing, or nothing.
 * Only ever set from something verified — never guessed:
 *  · blockedInHkCn — no data centre in HK/CN, and api.groq.com answers a bare
 *    403 (empty body) from a Hong Kong connection, even for GET /models.
 *  · someModelsRestricted — reachable from HK/CN, but OpenRouter forwards the
 *    upstream ban on GPT/Claude/Gemini for HK/CN billing addresses.
 */
export type BrainRegionNote = 'blockedInHkCn' | 'someModelsRestricted';

export interface BrainSpec {
  id: BrainId;
  label: string;
  baseUrl: string;
  model: string;
  keyless: boolean;
  /** one-line hint shown in Settings → Brain */
  blurb: string;
  /** where to get a key (shown next to the key field) */
  keyFrom: string;
  /** full URL of the page that issues this provider's keys */
  keyUrl: string;
  /** regional caveat, only when verified (see BrainRegionNote) */
  region?: BrainRegionNote;
}

// Order matters: `auto` tries these top-down.
export const BRAIN_SPECS: BrainSpec[] = [
  {
    id: 'deepseek', label: 'DeepSeek', keyless: false,
    baseUrl: 'https://api.deepseek.com', model: 'deepseek-v4-pro',
    blurb: 'DeepSeek V4 Pro — strong, cheap, reachable from Hong Kong and mainland China.',
    keyFrom: 'platform.deepseek.com',
    keyUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'moonshot', label: 'Moonshot Kimi', keyless: false,
    baseUrl: 'https://api.moonshot.ai/v1', model: 'kimi-k3',
    blurb: 'Kimi K3 — strongest at Cantonese and personality.',
    keyFrom: 'platform.moonshot.ai',
    keyUrl: 'https://platform.moonshot.ai/console/api-keys',
  },
  {
    id: 'groq', label: 'Groq', keyless: false,
    baseUrl: 'https://api.groq.com/openai/v1', model: 'openai/gpt-oss-120b',
    blurb: 'Groq — fastest free plan, running gpt-oss-120b.',
    keyFrom: 'console.groq.com',
    keyUrl: 'https://console.groq.com/keys',
    region: 'blockedInHkCn',
  },
  {
    id: 'openrouter', label: 'OpenRouter', keyless: false,
    baseUrl: 'https://openrouter.ai/api/v1', model: 'openrouter/free',
    blurb: 'One key for many providers; the free router always picks a live free model.',
    keyFrom: 'openrouter.ai',
    keyUrl: 'https://openrouter.ai/keys',
    region: 'someModelsRestricted',
  },
  {
    id: 'pollinations', label: 'Pollinations', keyless: true,
    baseUrl: 'https://text.pollinations.ai/openai', model: 'openai',
    blurb: 'No key at all — free shared queue, slower when busy.',
    keyFrom: '',
    keyUrl: '',
  },
];

/** Providers parked for this session after a hard failure (out of credit etc). */
const deadBrains = new Set<string>();

export function markBrainDead(id: string): void {
  deadBrains.add(id);
}

export function isBrainDead(id: string): boolean {
  return deadBrains.has(id);
}

/** Un-park one provider — a freshly tested key deserves a fresh try. */
export function reviveBrain(id: string): void {
  deadBrains.delete(id);
}

/** Clear the parking (reload does this too — kept for tests & future retry UI). */
export function resetBrainDead(): void {
  deadBrains.clear();
}

export const BRAIN_PROVIDER_KEY = 'amoji.brain.provider';
const lsKey = (id: string) => `amoji.brain.key.${id}`;

/** The exact localStorage slot a provider's key lives in. */
export function brainKeyStorageKey(id: BrainId): string {
  return lsKey(id);
}

const store = (): Storage | null =>
  typeof localStorage === 'undefined' ? null : localStorage;

export function brainProvider(): BrainProvider {
  const v = store()?.getItem(BRAIN_PROVIDER_KEY);
  return v === 'pollinations' || v === 'deepseek' || v === 'groq' || v === 'moonshot' || v === 'openrouter'
    ? v
    : 'auto';
}

export function setBrainProvider(p: BrainProvider): void {
  store()?.setItem(BRAIN_PROVIDER_KEY, p);
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

/** Store a key and un-park the provider. Returns false for a blank paste, so
 *  the caller never clears a good key on an accidental empty save. */
export function saveBrainKey(id: BrainId, key: string): boolean {
  const k = key.trim();
  if (!k) return false;
  setBrainKey(id, k);
  reviveBrain(id);
  return true;
}

export interface PickedBrain { spec: BrainSpec; key: string }

/** Resolve which brain answers right now. Explicit choice wins if usable;
 *  otherwise `auto` prefers the first keyed spec, else keyless Pollinations.
 *  r.27: parked (dead) specs are skipped in every branch, and the pool can
 *  never empty out — the keyless lane is always the last resort. */
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
    const key = brainKey(spec.id);
    if (key) return { spec, key };
  }
  const fallback = pool.find((s) => s.id === 'pollinations') ?? pool[pool.length - 1]!;
  return { spec: fallback, key: '' };
}

export function brainSpec(id: BrainId): BrainSpec {
  return BRAIN_SPECS.find((s) => s.id === id) ?? BRAIN_SPECS[BRAIN_SPECS.length - 1]!;
}

// ---------------------------------------------------------------------------
// One-tap key test (r2026-11-08)
//
// The single most useful affordance in this whole feature: "did I paste it
// right?" answered by the provider itself, in one tap, with its own words when
// it fails. The probe uses the SAME base URL, headers and body shape as
// launchRacer() in client-chat.ts, so a green verdict predicts real chat
// success instead of testing a different code path.
// ---------------------------------------------------------------------------

export type BrainProbeVerdict =
  | 'ok' | 'nokey' | 'auth' | 'blocked' | 'model' | 'credit' | 'offline' | 'timeout' | 'error';

export interface BrainProbeResult {
  verdict: BrainProbeVerdict;
  ok: boolean;
  /** the provider's own words, trimmed and key-redacted; '' when ok */
  detail: string;
  /** the model id that was actually tried */
  model: string;
  /** round-trip time */
  ms: number;
}

export interface BrainProbeOptions {
  /** key to test; defaults to the stored key for this provider */
  key?: string;
  /** abort after this long (default: 20s keyed / 14s keyless) */
  timeoutMs?: number;
  /** injectable for tests */
  fetchImpl?: typeof fetch;
}

/** Same budget the real chat path allows, so a pass here means a pass there. */
export const BRAIN_PROBE_KEYED_MS = 20_000;
export const BRAIN_PROBE_KEYLESS_MS = 14_000;

/** Gateways (and the free shared queue) phrase money trouble a few ways.
 *  Mirrors CREDIT_RE in client-chat.ts — kept separate because the probe must
 *  not depend on the chat transport. */
const CREDIT_RE = /not enough credit|insufficient (credit|balance|quota)|out of credit|quota exceeded|credit balance|余额不足|额度不足|額度不足/i;

/** Never let a key reach a log, a title, a data-attribute or an error line. */
export function redactKey(text: string, key: string): string {
  const k = key.trim();
  if (!k || k.length < 6) return text;
  return text.split(k).join('***');
}

/** Pull the human-readable sentence out of an error body (JSON or plain). */
function errorMessage(text: string): string {
  const raw = text.trim();
  if (!raw) return '';
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const err = j.error;
    if (typeof err === 'string') return err.slice(0, 200);
    if (err && typeof err === 'object') {
      const m = (err as Record<string, unknown>).message;
      if (typeof m === 'string') return m.slice(0, 200);
    }
    if (typeof j.message === 'string') return j.message.slice(0, 200);
    if (typeof j.detail === 'string') return j.detail.slice(0, 200);
  } catch { /* not JSON — fall through to the plain-text path */ }
  return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}

function classify(status: number, body: string): BrainProbeVerdict {
  if (status === 401) return 'auth';
  if (status === 403) {
    // A wrong key gets a 401, or a 403 WITH an explanation. A bare 403 is the
    // CDN / edge refusing the connection itself — verified live on
    // api.groq.com, which answers 403 with an empty body from a HK network
    // for any endpoint, valid key or not. That is a region/network block.
    return body.trim() ? 'auth' : 'blocked';
  }
  if (status === 402 || status === 429) return 'credit';
  if (status === 404) return 'model';
  if (status === 400 && /model/i.test(body)) return 'model';
  if (status === 451) return 'blocked';
  return 'error';
}

/**
 * Make one minimal, real completion call and report what happened.
 * Pass = the provider accepted this key and answered (HTTP 200), which proves
 * key validity, model availability and regional reachability in one shot.
 * Content is deliberately not inspected: reasoning models can answer 200 with
 * an empty string when max_tokens is tiny, and that is still a working brain.
 */
export async function probeBrain(id: BrainId, opts: BrainProbeOptions = {}): Promise<BrainProbeResult> {
  const spec = brainSpec(id);
  const model = spec.model;
  const key = (opts.key ?? brainKey(id)).trim();
  if (!spec.keyless && !key) return { verdict: 'nokey', ok: false, detail: '', model, ms: 0 };

  const doFetch = opts.fetchImpl ?? (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) return { verdict: 'offline', ok: false, detail: 'fetch unavailable', model, ms: 0 };

  const timeoutMs = opts.timeoutMs ?? (spec.keyless ? BRAIN_PROBE_KEYLESS_MS : BRAIN_PROBE_KEYED_MS);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const started = Date.now();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers.Authorization = `Bearer ${key}`;
  if (spec.id === 'openrouter') {
    headers['HTTP-Referer'] = 'https://amoji.app';
    headers['X-Title'] = 'Amoji';
  }

  try {
    const res = await doFetch(`${spec.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      signal: ctl.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
        temperature: 0.7,
        reasoning_effort: 'low',
        max_tokens: 24,
        stream: false,
      }),
    });
    const body = await res.text().catch(() => '');
    const ms = Date.now() - started;
    if (!res.ok) {
      const verdict = classify(res.status, body);
      const detail = errorMessage(redactKey(body, key)) || `HTTP ${res.status}`;
      return { verdict, ok: false, detail, model, ms };
    }
    // r.27 rule, kept: a gateway can answer 200 with the out-of-credit
    // sentence as the content. That is a failed provider, not a pass.
    if (body.length < 400 && CREDIT_RE.test(body)) {
      return { verdict: 'credit', ok: false, detail: errorMessage(redactKey(body, key)), model, ms };
    }
    return { verdict: 'ok', ok: true, detail: '', model, ms };
  } catch (e) {
    const ms = Date.now() - started;
    const err = e instanceof Error ? e : new Error(String(e));
    if (err.name === 'AbortError') return { verdict: 'timeout', ok: false, detail: '', model, ms };
    // A CORS refusal and a dead network both surface as TypeError "Failed to fetch".
    return { verdict: 'offline', ok: false, detail: redactKey(err.message, key).slice(0, 200), model, ms };
  } finally {
    clearTimeout(timer);
  }
}
