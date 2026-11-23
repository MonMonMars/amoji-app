# Admin control for search: budgets, warnings, delay, and the kill switch

Status: **foundation only**. Nothing here is wired into the music path, no
backend is deployed, and no user-visible revision was bumped.
Branch: `cursor/search-budget-admin-foundation-0340-0eac` (from `main` @ `adfaec92`).

Owner request (verbatim): *"Manage the max limit on the admin side. Show me
warnings if too many people search. … one more backup solution is delay the
search if too many search at a time. Let the character say something long to
delay the search. Control at the back end."*

This document is the spec for the follow-up PR. It is deliberately blunt about
what each tier can and cannot enforce.

---

## 1. The honest constraint (read this first)

| Fact | Consequence |
|---|---|
| Production is a **static export** on GitHub Pages. `.github/workflows/pages.yml` runs `pnpm --filter @amoji/web build` with `AMOJI_EXPORT=1` and uploads `apps/web/out`. | There is **no Next.js server runtime in production**. |
| A Next.js `app/api/*` route handler is not emitted by a static export. | Adding `app/api/search/route.ts` **will not run on Pages**. Do not ship one expecting enforcement. |
| The client budget (`apps/web/lib/search-budget.ts`) lives in `localStorage`. | It is **advisory, not enforcement**. Clearing storage or using a private window resets it. It can only slow down cooperative clients. |
| The curated, keyless music list costs no API quota. `apps/web/lib/music-stream-catalog.ts` / `music-stream.ts` arrive with **PR #574 (unmerged)**; on `main` today there is no Jamendo search provider yet. | That list must **never** be rate-limited. A limit may only gate the optional API-search provider. |
| The optional API search uses `NEXT_PUBLIC_JAMENDO_CLIENT_ID`. `NEXT_PUBLIC_*` is compiled into the client bundle. | The key is **public today**, and every listener shares one Jamendo quota. Any real fix proxies the search through a server that holds the key. |
| `server/backend/` exists (Node `http`, `node:sqlite`, auth/billing/TTS) but the repo has **no deployment config** for it: no `vercel.json`, `wrangler.toml`, `fly.toml`, `Dockerfile`, or `netlify.toml`. | It is dormant and unproven in production. Do not assume it is reachable from the live site. |
| `apps/web/lib/music.ts` is owned by another agent; PR #574's files are still open. | This PR does not touch them. Integration is specified in §8, not applied. |

**What "true enforcement" requires:** a deployed service reachable from the
static site that (a) holds the Jamendo key, (b) counts searches per key and
globally, and (c) can refuse or delay before the upstream request is made.
Until that exists, everything is best-effort.

---

## 2. The two tiers

### Tier 1 — client budget (`apps/web/lib/search-budget.ts`, shipped here)

- Sliding-window counter over timestamps in an injected storage adapter.
- Defaults: **20 searches / 10 min** starts the soft delay; **30** refuses.
- Soft tier is a **delay, not a refusal**: `allowed: true`, `delayMs: 2500`.
  The caller speaks for `delayMs` and then searches. Only the hard tier sets
  `allowed: false`.
- Injected `now()` and storage; corrupt JSON self-heals; no top-level `window`
  access, so static rendering is safe.
- Cannot stop a determined user. Can keep normal users under the shared quota
  and gives the character a reason to talk.

Public API (see the file for full types):

```ts
const budget = createSearchBudget();          // defaults, localStorage when present
budget.check();                                // read-only verdict
budget.take();                                 // verdict + records unless hard
budget.reset();
budget.used();
```

Verdict fields: `allowed`, `tier` (`normal | soft | hard`), `reason`
(`null | 'soft' | 'hard'`), `used`, `max`, `softMax`, `remaining`, `delayMs`,
`retryAfterMs`, `windowMs`.

### Tier 2 — server enforcement (`server/backend/src/rate-limit.ts`, shipped here)

- Token bucket keyed by `(route, clientKey)`; `clientKey` is an IP or account id
  supplied by the caller. The module does not parse headers.
- Returns `remaining`, `used`, `limit`, `resetAt`, `retryAfterMs`, `delayMs`,
  and the current breaker state — enough for both the client banner and the
  admin dashboard.
- Global **circuit breaker**: `closed | soft | hard`, persisted through the
  store interface, settable at runtime by the owner.
  - `closed` — normal bucket.
  - `soft` — only `softLimit` requests per refill cycle (default 5 for search);
    allowed requests carry `delayMs`; the rest are refused with the delay hint.
  - `hard` — every API search is refused. `retryAfterMs` is still reported
    (advisory); only the owner reopens the breaker.
- No `node:sqlite` import and no DOM usage; it type-checks under the backend's
  ES2022-only tsconfig. A sqlite/Worker/Redis/Supabase store implements the
  four required methods (plus two optional daily-counter methods).

### What each tier can do

| Capability | Tier 1 (client) | Tier 2 (server) |
|---|---|---|
| Delay a cooperative user | Yes | Yes (`softDelayMs`) |
| Count per user/IP | Per browser only | Yes, per key |
| Survive cleared storage / private mode | No | Yes |
| Stop a scripted abuser | No | Yes (within store consistency) |
| Keep the Jamendo key secret | No | Yes, when proxying |
| Global kill switch | No (each browser is local) | Yes, persisted breaker |
| Show the owner warnings | Local only | Yes, via dashboard endpoint |

---

## 3. Deployment options (trade-offs, no final recommendation)

All four server options **can** keep the shared Jamendo key server-side, but only
if the search request is proxied through them. Nothing on the client tier can.
Costs are approximate as of 2026-11; re-check before committing money.

| Option | What it enforces | Cost | Setup effort | Jamendo key server-side? | Operational risk |
|---|---|---|---|---|---|
| **Cloudflare Worker + KV** | Per-key token bucket, global breaker in KV, search proxy. Free tier is generous for this traffic level. | Free tier likely enough; paid Workers $5/mo if exceeded. KV writes have a low free daily cap. | Medium: Cloudflare account, `wrangler.toml`, worker route, secret, CORS for `monmonmars.github.io`. No change to Pages hosting. | **Yes** — Worker secret (`JAMENDO_CLIENT_ID`). | KV is eventually consistent: a burst can briefly overshoot a counter. Accurate atomic counters need Durable Objects (paid). Another account/dashboard to operate. |
| **Vercel Edge/Serverless Function** | Same counters + breaker; proxy. Owner may already have Vercel. | Hobby tier usually enough for text API calls; check current invocation/bandwidth caps. | Low–medium **if** a Vercel account/project already exists; otherwise medium. The static-export build cannot host the function in the same Next app, so it is a second deployment (or you move hosting off Pages). | **Yes** — function env var. | Two origins to deploy and monitor; CORS; cold starts; env drift between Pages and Vercel. Moving hosting is a much larger change than adding a function. |
| **Supabase** (plugin available in this environment) | Postgres row counters + Edge Function proxy, or direct RPC. Strong consistency if done with SQL upserts. | Free tier generally sufficient for this volume; check DB/edge-function limits; free projects can pause when idle. | Medium–high: schema, RLS, Edge Function, secret, CORS, deploy. | **Yes** — Edge Function secret. | Per-search DB round trip if not cached; RLS/schema mistakes are security-sensitive; another dashboard and another cold path. |
| **Revive `server/backend` on Fly.io / VPS** | Full Node process: token bucket in `node:sqlite`, breaker, admin routes, proxy. Code already exists. | Fly shared CPU + volume ≈ $3–7/mo; a small VPS ≈ $5/mo. No meaningful free tier on Fly today. | High: Dockerfile/deploy config, persistent volume for sqlite, TLS, process supervision, backups, `node:sqlite` experimental flag on Node 24, monitoring. | **Yes** — server env var. | Dormant code never proven in production; single instance; sqlite volume is a single point of failure; manual ops. Most control, most work. |

Notes that cut across options:

- A **Workers KV counter is not strongly consistent**; if exact enforcement
  matters, budget for Durable Objects or Redis/Supabase atomic increments.
- A server tier also lets you **stop shipping** `NEXT_PUBLIC_JAMENDO_CLIENT_ID`.
- Hosting the proxy on a different origin means CSP/CORS work; plan it.
- None of this changes the static site's need to keep the keyless curated list.

---

## 4. Admin dashboard spec

The owner is **one person**. A single admin token in an env var is the right
scope; do not build accounts, roles, or a user system.

### Authentication

- Env: `AMOJI_ADMIN_TOKEN` (long random string, server-side only).
- Every `/api/admin/*` request: `Authorization: Bearer <token>`.
- Compare with a timing-safe comparison (`crypto.timingSafeEqual` on equal-length
  buffers) and return `401` on failure. Also apply an IP rate limit to the admin
  routes so the token cannot be brute-forced.
- No cookie, no session, no password reset. Rotate by changing the env var.

### What the owner sees

1. **Today's search count** — allowed API searches, split by tier
   (`normal`, `soft`) and refusals (`hard`, `bucket`).
2. **Top queries today** — needs query logging in the proxy. `rate-limit.ts`
   does not log query text; the follow-up proxy should append a bounded
   `(query, count)` row per search (or a capped in-memory top-N per process).
   Treat this as **not implemented yet**.
3. **Current breaker state** — `closed | soft | hard`, when it changed, and who
   changed it.
4. **Manual switch** — three buttons: Closed / Soft / Hard.
5. **Quota remaining today (estimate)** — derived from a configured daily or
   monthly Jamendo allowance and today's counted searches. Label it an
   **estimate**, because the upstream quota is not queryable from Jamendo's
   public API. Suggested env: `AMOJI_JAMENDO_DAILY_LIMIT` (optional).

### Endpoint shapes (proposed; wiring deferred)

```http
GET /api/admin/search-stats?range=today
Authorization: Bearer <AMOJI_ADMIN_TOKEN>

200 {
  "day": "2026-11-24",
  "breaker": { "state": "closed", "changedAt": 1790000000000, "changedBy": "owner" },
  "searches": { "allowed": 42, "normal": 39, "soft": 3, "refusedHard": 0, "refusedBucket": 1 },
  "topQueries": [{ "q": "lofi", "n": 12 }, { "q": "jazz", "n": 4 }],
  "quota": { "estimatedLimit": 500, "used": 42, "remaining": 458, "estimated": true }
}
```

```http
POST /api/admin/breaker
Authorization: Bearer <AMOJI_ADMIN_TOKEN>
Content-Type: application/json

{ "state": "soft" }

200 { "ok": true, "breaker": { "state": "soft", "changedAt": 1790000000000, "changedBy": "owner" } }
400 { "error": "invalid state" }
401 { "error": "unauthorized" }
```

```http
GET /api/search/quota
(public; no auth; cached briefly)

200 {
  "breaker": "closed",
  "limit": 20,
  "remaining": 14,
  "resetAt": 1790000600000,
  "delayMs": 0,
  "retryAfterMs": 0
}
```

```http
POST /api/search            (optional proxy; holds the Jamendo key)
{ "q": "lofi", "limit": 5 }

200 { "tracks": [...], "quota": { "remaining": 13, "resetAt": ..., "breaker": "closed" } }
429 { "error": "rate limited", "quota": { "reason": "hard", "retryAfterMs": 60000, "breaker": "hard" } }
```

The client can combine `/api/search/quota` with the local budget: whichever is
more restrictive wins, and a `hard` breaker always wins.

Storage for the admin view:

- counters: `RateLimitStore.incrementDaily(route, day)` (implemented in the
  in-memory store; sqlite/KV implementations must add it);
- breakpoint state: `setCircuitBreaker(store, state, { changedBy })`;
- top queries: new bounded table/stream — not part of this module.

**Not built in this PR:** routes, token handling, CORS, dashboard UI, query
logging, deployment. Only the pure engine and this spec exist.

---

## 5. The degradation ladder

Keep the keyless curated music **outside** every rung. It costs nothing, so it
must remain playable in every state, including when the backend is down.

| Rung | Trigger | Behaviour | Music outcome |
|---|---|---|---|
| 1. Normal | Breaker `closed`, bucket has tokens | Search immediately. | API search + curated list. |
| 2. Soft | Local soft threshold (20/10 min) **or** server breaker `soft` | Character speaks a **long** line for `delayMs` (2.5 s default), then the search runs. Server soft also caps how many searches are allowed in the cycle; later attempts get the delay message and fall back. | API search still possible; curated list untouched. |
| 3. Hard | Local hard ceiling (30/10 min) **or** owner flips the breaker to `hard` | No API search. Do **not** show an error; fall back silently. | **Curated keyless list plays normally.** |
| 4. Backend unreachable | Timeout / network error / 5xx from the proxy or quota endpoint | Ignore the server verdict and consult only the local budget; if that fails, allow search. | **Curated keyless list plays normally.** |

Additional invariants:

- The curated list is never passed through `take()` / `consumeRateLimit()`.
- A missing, corrupt, or throwing budget store must not block playback.
- The character's long line is a **UX delay**, never a substitute for server
  enforcement.
- Never claim on-screen that a limit is "enforced" while only the client tier
  exists.

---

## 6. Suggested thresholds (start here, tune with real telemetry)

| Knob | Default | Where |
|---|---|---|
| Client window | 10 min | `DEFAULT_SEARCH_BUDGET_CONFIG.windowMs` |
| Client soft | 20 searches/window | `softMax` |
| Client hard | 30 searches/window | `hardMax` |
| Client speech delay | 2500 ms | `softDelayMs` |
| Server search budget | 20 / 10 min per key | `SEARCH_RATE_LIMIT_RULE` |
| Server soft cap | 5 per refill cycle | `softLimit` |
| Server soft delay | 2500 ms | `softDelayMs` |

These are guesses, not measurements. Lower them if the shared Jamendo quota
still drains; raise them if the owner sees false warnings.

---

## 7. Wiring deferred (and why)

| File | Change | Why deferred |
|---|---|---|
| `apps/web/lib/music.ts` | Import `createSearchBudget`; gate only the API-search branch; soft → speak `delayMs` then continue; hard → fall back to curated. | Owned by another agent; no API provider to gate on `main` yet (PR #574). |
| `apps/web/lib/music-stream-providers.ts` (PR #574) | Same check at the provider seam, returning `null` on hard so the caller uses the curated list. | PR #574 is open/unmerged; touching it creates a conflict. |
| `apps/web/lib/music-stream.ts` (PR #574) | No direct budget logic; keep provider selection clean. | Same. |
| `server/backend/src/http.ts` | Add `/api/search`, `/api/search/quota`, `/api/admin/search-stats`, `/api/admin/breaker`; call `consumeRateLimit(store, 'search', clientKey(req), SEARCH_RATE_LIMIT_RULE)`. | Wiring requires a deployed service and an owner decision on §3; editing the only HTTP surface in this PR would be untestable here. |
| `server/backend/src/db.ts` | Add `rate_limit_kv` table + a `RateLimitStore` sqlite implementation. | No deployment target yet; module deliberately does not import `node:sqlite`. |
| `apps/web/lib/voice.ts`, `lib/fillers.ts` | Speak the long soft-tier line. | Explicitly owned by another agent; do not touch. |

---

## 8. Exact follow-up integration steps

1. **Pick a deployment from §3.** Nothing else can be claimed as enforcement
   until this exists.
2. **Server store:** implement `RateLimitStore` for the chosen platform.
   - sqlite (Fly/VPS): table `rate_limit_kv(key TEXT PRIMARY KEY, value TEXT,
     updated_at INTEGER)`; JSON for bucket/breaker; atomic upsert.
   - Redis/Upstash/Supabase: atomic `INCR`/SQL upsert.
   - Workers KV: simplest, but accept eventual consistency (or use Durable
     Objects for exact counts).
3. **Server routes** in `server/backend/src/http.ts` (or the Worker entry):
   - `POST /api/search` — parse `q`, call `consumeRateLimit` with
     `clientKey(req)`; on `allowed`, fetch Jamendo with the **server-side**
     `JAMENDO_CLIENT_ID`; on refusal return the decision with HTTP 429.
   - `GET /api/search/quota` — call `consumeRateLimit` with a **read-only**
     preview (or read the bucket) and return `remaining`/`resetAt`/breaker;
     do not consume a token for the status call.
   - `GET /api/admin/search-stats`, `POST /api/admin/breaker` — Bearer
     `AMOJI_ADMIN_TOKEN`, timing-safe compare, IP rate limit.
4. **Client call site** (after PR #574 merges):
   ```ts
   const verdict = budget.take();
   if (verdict.tier === 'hard') return null;            // caller uses curated list
   if (verdict.tier === 'soft') await speakLongLine();   // existing voice/fillers path, delayMs
   // only here: upstream API search
   ```
   Wrap the fetch in try/catch: on failure, ignore the server verdict and never
   block curated playback.
5. **Remove the public key:** move `NEXT_PUBLIC_JAMENDO_CLIENT_ID` to a server
   secret and point the client at `/api/search`. Keep the old variable only as
   a transitional fallback, clearly marked.
6. **Configure Pages:** set `NEXT_PUBLIC_AMOJI_API` (or equivalent) to the
   deployed origin; verify CORS from `https://monmonmars.github.io`.
7. **Bump the revision** (`APP_REVISION`, `public/sw.js` `CACHE`,
   `public/revision.txt`) only when the client actually calls the new path.
   This PR deliberately does not, because nothing user-visible changes.
8. **Real-device smoke:** add rows to `docs/PHONE_SMOKE.md` for normal, soft,
   hard, and backend-down states. Merged ≠ done until a phone confirms each.

---

## 9. Tests in this PR

- `apps/web/tests/search-budget.test.ts` — window expiry, soft/hard thresholds,
  `retryAfterMs` with an injected clock, corrupt-storage self-heal, future-stamp
  clamping, throwing adapter, SSR/no-window, localStorage adapter, and the
  advisory reset (fresh adapter → count 0).
- `server/backend/tests/rate-limit.test.ts` — bucket exhaustion/continuous
  refill, per-key/per-route isolation, breaker `closed → soft → hard → closed`,
  hard retry hint, token preservation in hard mode, invalid admin state, store
  swap, optional daily counters.

Verification commands:

```bash
cd apps/web && npm test -- --run && npx --no-install tsc --noEmit
cd server/backend && npm test && npm run typecheck
node scripts/check-repo-hygiene.mjs --strict
```

---

## 10. Unverified / open questions

- **Jamendo's actual quota** for the client id is unknown here; the dashboard
  "remaining today" is an estimate unless the owner supplies the number.
- **No server is deployed**, so no server-tier behaviour has been exercised
  against real traffic or a real store.
- **Cloudflare KV consistency, Vercel limits, Supabase free-tier limits, and Fly
  pricing** were not checked live; confirm before choosing.
- **Top queries** are not collected yet; the module only counts.
- The client budget is only as honest as localStorage; it is not a security
  boundary.
- `apps/web` has no API-search provider on `main` today (PR #574 is open), so
  the integration path cannot be tested end-to-end in this branch.
