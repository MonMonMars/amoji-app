# Admin control for search: one breaker, enforced server-side

Status: **the breaker is enforced** at `POST /api/search`, with real volume
counters feeding `/api/admin/warnings`. The optional API-search **provider** is
not merged (#574), so the route gates and counts but returns no tracks yet.
Branch: `cursor/admin-backend-and-panel-0340-0eac` (the #578 search-budget
branch is merged in).

Owner request (verbatim): *"Manage the max limit on the admin side. Show me
warnings if too many people search. … one more backup solution is delay the
search if too many search at a time. Let the character say something long to
delay the search. Control at the back end."*

---

## 1. What exists now

| Piece | File | State |
|---|---|---|
| Token bucket + breaker engine | `server/backend/src/rate-limit.ts` | **single source of truth** for `closed / soft / hard` |
| Durable store | `server/backend/src/rate-limit-sqlite.ts` | `rate_limit_kv`, `rate_limit_daily`, `rate_limit_window` |
| Admin adapter | `server/backend/src/admin-limits.ts` | breaker via the engine; cap + history in `admin_settings` / `admin_events` |
| Search route | `server/backend/src/http.ts` | `POST /api/search`, `GET /api/search/quota` |
| Admin warnings | `server/backend/src/admin.ts` | real `searchUsage` + volume warnings |
| Panel | `apps/web/public/docs/admin.html` | unchanged HTTP shapes; shows live numbers |
| Client gate | `apps/web/lib/search-gate.ts` | local budget + server verdict; **off** without an API origin |
| Long delay line | `apps/web/lib/fillers.ts` | `pickSearchDelayLine(lang)` |

The previous two-breaker split (`admin_settings.search.breaker` read by the
panel, `rate_limit_kv.breaker` read by the limiter) is gone. `admin-limits.ts`
is an adapter: an admin PUT writes the same row `consumeRateLimit` reads, which
is pinned by `server/backend/tests/search-route.test.ts`. A legacy
`admin_settings.search.breaker` row is migrated into the shared store once.

---

## 2. The honest constraint

| Fact | Consequence |
|---|---|
| Production is a **static export** on GitHub Pages. | There is no Next.js server runtime in production. |
| The optional API-search provider (#574, Jamendo) is **not merged**. | `POST /api/search` returns `tracks: []` and `upstream: "not_configured"`; the client uses the curated keyless list. |
| The curated, keyless music list costs no quota. | It is **never** passed through `consumeRateLimit` and must play in every state. |
| The static site only calls the search route when `NEXT_PUBLIC_AMOJI_API` is set. | The published demo has no API origin → the gate is a no-op (no fetch, no timer, no budget write). |
| `server/backend` has **no deployment config** in this repo. | Enforcement is real in the code and tests, but not live until the owner deploys (see `docs/ADMIN_BACKEND.md` §5). |

---

## 3. The two tiers (both are now wired)

### Tier 1 — client budget (`apps/web/lib/search-budget.ts`)

Advisory, device-local, localStorage. Defaults: **20 searches / 10 min** starts
the spoken delay; **30** refuses. `take()` returns
`allowed / tier / delayMs / retryAfterMs`. Soft is a delay, not a refusal.

### Tier 2 — server enforcement (`rate-limit.ts` + `rate-limit-sqlite.ts`)

Token bucket keyed by `(route, clientKey)`, plus a persisted global breaker the
owner flips at runtime:

- `closed` — normal bucket. Over budget → `429` `reason: "bucket"`.
- `soft` — allowed, and the JSON carries `delayMs` (2 500 ms). The client
  speaks `pickSearchDelayLine(lang)`, waits, then continues. (The rule is built
  with `softLimit = limit` so soft delays rather than refuses.)
- `hard` — every API search is `429` with a positive `retryAfterMs`; **no token
  is consumed**, so reopening the breaker restores the full budget.

`consumeRateLimit` never parses headers; `http.ts` passes `clientKey(req)`.

### Degradation ladder

| Rung | Trigger | Behaviour | Music |
|---|---|---|---|
| 1 Normal | breaker `closed`, token available | search immediately | API (when wired) + curated |
| 2 Soft | local soft tier **or** server `soft` | speak the long line for `delayMs`, then search | API still possible |
| 3 Hard | local hard tier **or** owner sets `hard` | no API search, silent fallback | **curated list plays** |
| 4 Backend down | timeout / 5xx / non-JSON | ignore the server verdict; local budget already allowed | **curated list plays** |

---

## 4. Admin API (shapes are stable)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/limits` | `{ ok, limits: { breaker, maxSearchesPerWindow, windowSeconds, updatedAt }, history, generatedAt }` |
| PUT | `/api/admin/limits` | body `{ breaker?, maxSearchesPerWindow? }`; writes through to the engine; appends a `limits.update` event |
| GET | `/api/admin/events?limit=` | `{ ok, events: [{ id, kind, detail, createdAt }] }` |
| GET | `/api/admin/warnings` | adds `searchUsage` and the volume warnings below |
| GET | `/api/admin/stats` | unchanged |

Auth is the single `AMOJI_ADMIN_TOKEN` bearer token; timing-safe compare; 503
when unset. The panel's request/response handling did not change.

`searchUsage` (additive to `/api/admin/warnings`):

```json
{
  "breaker": "closed",
  "searchesToday": 42,
  "searchesThisWindow": 8,
  "windowStartedAt": 1790000000000,
  "windowSeconds": 3600,
  "maxSearchesPerWindow": 30,
  "windowUtilisation": 0.27
}
```

Warnings: `search_volume_at_limit` (warn) at `searchesThisWindow >=
maxSearchesPerWindow`; `search_volume_rising` (info) from 50 %.

---

## 5. Search HTTP contract

```http
POST /api/search
{ "q": "lofi" }

200 { "ok": true, "query": "lofi", "tracks": [],
      "upstream": "not_configured", "delayMs": 0, "retryAfterMs": 0,
      "quota": { "breaker": "closed", "allowed": true, "reason": "ok",
                 "limit": 30, "remaining": 29, "used": 1, "resetAt": 1790000000000,
                 "retryAfterMs": 0, "delayMs": 0, "windowSeconds": 3600,
                 "maxSearchesPerWindow": 30 } }

429 { "error": "rate limited", "reason": "hard", "breaker": "hard",
      "delayMs": 0, "retryAfterMs": 600000, "quota": { … } }

400 { "error": "q required" }        // nothing consumed
405 { "error": "method not allowed" }
```

```http
GET /api/search/quota                  // read-only; never consumes

200 { "ok": true, "breaker": "closed", "allowed": true, "reason": "ok",
      "limit": 30, "remaining": 29, …, "upstream": "not_configured" }
```

Provider wiring is a single `TODO(provider)` in `src/http.ts`: when #574 lands,
fetch upstream after the gate and fill `tracks`, keeping the key server-side.

---

## 6. Client wiring

`apps/web/lib/search-gate.ts` → `beginSearch(query, { lang, speak })`:

1. no `NEXT_PUBLIC_AMOJI_API` → `{ mode: 'off', lane: 'curated' }` before any
   budget read, fetch, or timer (the Pages demo is unchanged);
2. local `take()` hard → curated, no network;
3. `POST /api/search` (4 s bound);
4. `429 hard`/`refused` → `lane: 'curated'` (silent fallback);
5. `200` with `delayMs > 0` (or local soft) → `pickSearchDelayLine(lang)` is
   spoken through the existing `sayLocal` voice path, wait `delayMs`, then
   `lane: 'api'`;
6. dead backend / 5xx → `mode: 'error'`, `lane: 'api'` (never punish the user).

`ChatPanel` calls it in the music random branch only when
`searchGateConfigured()` is true. It never throws and never blocks the curated
playback path.

---

## 7. Thresholds

| Knob | Default | Where |
|---|---|---|
| Client window | 10 min | `DEFAULT_SEARCH_BUDGET_CONFIG.windowMs` |
| Client soft / hard | 20 / 30 per window | `softMax` / `hardMax` |
| Client speech delay | 2 500 ms | `softDelayMs` |
| Server cap | 30 per 60 min per client key | `DEFAULT_MAX_SEARCHES_PER_WINDOW`, `SEARCH_WINDOW_SECONDS` |
| Server soft delay | 2 500 ms | `SEARCH_SOFT_DELAY_MS` |

These are guesses, not measurements; tune with the admin page.

---

## 8. Tests

`server/backend/tests/search-route.test.ts` (10): hard refuses with no token
spend and a positive `retryAfterMs`; soft allows with `delayMs`; closed bucket
exhaustion; empty query spends nothing; quota is read-only; admin PUT cap is the
enforced cap; admin PUT breaker is what `consumeRateLimit` reads; legacy breaker
migration; breaker persistence across a store reopen; real daily/window counts
and the volume warning.

`server/backend/tests/rate-limit.test.ts` (existing 11) and
`tests/admin.test.ts` (9) still pass. Web:
`apps/web/tests/search-gate.test.ts` (10, including the no-origin no-op and the
hard→curated fallback) and the new filler assertions in
`apps/web/tests/fillers.test.ts`.

```bash
cd server/backend && npm test && npx tsc --noEmit
cd apps/web && npm test -- --run && npx tsc --noEmit
node scripts/check-repo-hygiene.mjs --strict
```

---

## 9. Still open

- **No deployment**: the route is not reachable from the Pages build until
  `NEXT_PUBLIC_AMOJI_API` is set and the backend is hosted.
- **No upstream provider**: `tracks` stays empty until #574 is merged and the
  `TODO(provider)` is filled.
- **No per-query log**: top queries are still not collected; only counts.
- The 60-minute server window does not match the client's 10-minute advisory
  window. That is intentional (the client adds friction first), but it means
  the panel's "this window" number and the client's local count differ.
- The client budget is not a security boundary; the server bucket is.
- Merged ≠ done: `docs/PHONE_SMOKE.md` needs rows for normal / soft / hard /
  backend-down once a backend is deployed.
