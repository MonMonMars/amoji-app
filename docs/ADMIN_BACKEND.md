# Admin backend — what was proven, how to deploy

Status: **not deployed.** No Fly/Render/Railway app, volume, secret, or domain
was created. This document is the runbook for the owner after review.

Scope: make the existing `server/backend` Node server actually run, add a
token-protected admin API, and give the owner a static admin page. No user-facing
app behaviour changed and `APP_REVISION` / `public/sw.js` / `public/revision.txt`
were deliberately **not** bumped.

---

## 1. Phase 1 — the backend actually runs

Machine: Windows 10, Node **v24.18.0**, npm 11.16.0.

`node:sqlite` probe:

| Command | Result |
| --- | --- |
| `node --experimental-sqlite -e "console.log('flag ok')"` | `flag ok` |
| `node -e "const s=require('node:sqlite'); console.log(typeof s.DatabaseSync)"` | `function` |

**No `--experimental-sqlite` flag is needed on Node 24.18.0.** Node 22.5–23.3
did require it, so a Node 22 host needs `NODE_OPTIONS=--experimental-sqlite`
(or just use Node 24).

Baseline before any admin code:

```text
cd server/backend
npm run typecheck      # exit 0
npm test               # 3 files, 33 tests passed
```

### The start path was broken (and is now fixed)

`npm start` originally ran `scripts/start.mjs`, which spawned
`node --experimental-strip-types src/index.ts`. That fails because:

- server modules import `./db.js` while only `db.ts` exists (Node type stripping
  does not rewrite `.js` to `.ts`);
- `src/chat.ts` imports `apps/web/lib/*` files, which use bundler-style
  extensionless imports (`./reply-shape`), which Node ESM cannot resolve.

Observed error:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  ...\server\backend\src\db.js imported from ...\src\index.ts
```

Fix: `scripts/start.mjs` now builds a single ESM bundle with esbuild
(`esbuild` is a declared devDependency of `@amoji/server`) and runs
`dist/index.mjs`. If devDependencies are absent (slim production image), it runs
the prebuilt bundle instead. `npm run build` does the bundle step alone.
This also removes the need for Node experimental type-stripping flags.

### Literal proof run

Commands (PowerShell):

```powershell
cd server/backend
$env:AMOJI_DB="data/admin-proof.sqlite"
$env:AMOJI_PORT="8787"
$env:AMOJI_LLM_PROVIDER="offline"
npm start
# [amoji] starting ...\server\backend\dist\index.mjs
# amoji server http://127.0.0.1:8787
```

HTTP results:

| Request | Status | Result |
| --- | --- | --- |
| `GET /api/health` | **200** | `{"ok":true,"tts":"edge","db":"sqlite","mail":false,"billing":false}` |
| `POST /api/auth/session` `{}` | **200** | token, 64 lowercase hex chars |
| `GET /api/auth/session` + `Authorization: Bearer <token>` | **200** | session resumed |
| `PUT /api/state` + bearer (valid character/background/lang) | **200** | state saved |
| `GET /api/state` + bearer | **200** | saved state returned |
| `GET /api/auth/session` with last hex char changed | **401** | tampered token rejected |
| `GET /api/state` with the same tampered token | **401** | rejected |

SQLite check (same process is stopped afterwards):

```text
users= 1
sessions= 1
session_row= {"user_id":"5bfbed7b-...","expires_at":1798045196114}
default DB file: server/backend/data/amoji.sqlite
absolute proof file: ...\server\backend\data\admin-proof.sqlite
```

Port: **8787** (`AMOJI_PORT`, now also honors a PaaS-injected `PORT`).
DB path: `AMOJI_DB`, default `data/amoji.sqlite` relative to `server/backend`.

After the admin work the same suite is **4 files / 42 tests passed** and
typecheck is still exit 0.

---

## 2. Admin API

Auth: one shared secret, `AMOJI_ADMIN_TOKEN`, sent as
`Authorization: Bearer <token>`. There are no admin accounts or roles.
Comparison is timing-safe (HMAC-SHA256 digests + `timingSafeEqual`, the same
style as the Stripe signature check in `billing.ts`).

- Token unset → every `/api/admin/*` route returns **503**
  `{"error":"admin disabled","code":"admin_disabled", ...}` with a
  `admin_token_missing` warning. It never silently allows access.
- Missing/wrong token → **401** `{"error":"unauthorized","code":"admin_unauthorized"}`.

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/admin/stats` | total users, new users today (UTC), active sessions, chat turns (total + today), free/plus split, reports, support messages, current search limits |
| GET | `/api/admin/users?limit=&offset=&q=` | paginated users: id, created, plan, plan expiry, kid mode, last session, active sessions, chat turns |
| GET | `/api/admin/users/:id` | one user: profile, character state, entitlement, session metadata (no tokens), report/support/chat counts |
| POST | `/api/admin/users/:id/revoke-sessions` | `{ ok, userId, revoked }`; deletes every session row for that user |
| GET | `/api/admin/limits` | search breaker state + up to 20 timestamped change events |
| PUT | `/api/admin/limits` | body `{ "breaker": "closed"\|"soft"\|"hard", "maxSearchesPerWindow": 30 }`; persists and appends an event |
| GET | `/api/admin/warnings` | `{ ok, status, warnings[], limits, checkedAt }` |
| GET | `/api/admin/events?limit=` | recent admin events |

Privacy guarantees:
- The schema has no password column/hash, and no admin route returns one.
- Session tokens are **never** returned; only `createdAt` / `expiresAt` /
  `active` metadata. Tests assert the wire JSON contains no session token and no
  key matching `token|password|hash|secret`.

Warnings currently cover:
- search volume reached / is approaching the cap (real counts, see below);
- breaker is `soft` (warn) or `hard` (error);
- `maxSearchesPerWindow` is 0;
- email unconfigured (`RESEND_API_KEY` + `AMOJI_MAIL_FROM`);
- billing unconfigured (info);
- CORS still `*` (warn);
- in-memory database (error);
- offline/keyless LLM mode (info);
- missing admin token (only reachable in the 503 body, by design).

### ONE breaker: `admin-limits.ts` is an adapter over `rate-limit.ts`

`server/backend/src/rate-limit.ts` (token bucket + `closed | soft | hard`
breaker) was merged in from the search-budget branch and is now the **only**
owner of breaker state. `admin-limits.ts` is a thin adapter:

- breaker reads/writes go through `readCircuitBreaker` / `setCircuitBreaker`;
- `maxSearchesPerWindow` (an owner knob, not engine state) stays in
  `admin_settings`;
- the timestamped history stays in `admin_events`;
- `rateLimitStoreFor(db)` is the durable `RateLimitStore`
  (`rate_limit_kv`, `rate_limit_daily`, `rate_limit_window`).

Why the adapter matters: before it, the panel wrote
`admin_settings.search.breaker` while `consumeRateLimit` read
`rate_limit_kv.breaker` — two sources of truth, so a PUT did not enforce. Now a
PUT writes the same row the limiter reads, and `tests/search-route.test.ts`
pins it (`admin PUT → readCircuitBreaker → POST /api/search 429`). A legacy
`admin_settings.search.breaker` row is migrated into the shared store exactly
once, then ignored.

Meaning: `closed` = normal token bucket, `soft` = allowed but the client speaks
a long line for `delayMs` first, `hard` = refuse with `429` +
`retryAfterMs` (no token is burned). Window: 60 minutes, default cap 30 per
client key.

### `POST /api/search` and `GET /api/search/quota`

The search route exists to gate the optional API lane and to keep a shared
third-party key server-side. It is deliberately a thin proxy: on this branch
`tracks` is `[]` and `upstream` is `"not_configured"` because #574's Jamendo
catalog is not merged — see the `TODO(provider)` in `src/http.ts`. The curated
keyless list never reaches this route.

`POST /api/search` — body `{ "q": "lofi" }`, anonymous, CORS as configured.

| Status | Body |
| --- | --- |
| 200 | `{ ok, query, tracks: [], upstream: "not_configured", delayMs, retryAfterMs, quota: { breaker, allowed, reason, limit, remaining, used, resetAt, retryAfterMs, delayMs, windowSeconds, maxSearchesPerWindow } }` |
| 429 `hard` | `{ error: "rate limited", reason: "hard", breaker: "hard", delayMs: 0, retryAfterMs: >0, quota: {…} }` — no token consumed |
| 429 `bucket`/`soft` | same shape with the exhausted reason and a positive `retryAfterMs` |
| 400 | `{ error: "q required" }` — no token consumed |
| 405 | `{ error: "method not allowed" }` |

`GET /api/search/quota` is the read-only twin (`previewRateLimit`): it never
consumes a token and returns `{ ok, breaker, allowed, reason, limit, remaining,
used, resetAt, retryAfterMs, delayMs, windowSeconds, maxSearchesPerWindow,
upstream }` with status 200.

`soft` returns `delayMs` (2 500 ms). The client speaks
`apps/web/lib/fillers.ts → pickSearchDelayLine(lang)` for that long, then
continues; `hard` falls back to the curated list without an error. With no
`NEXT_PUBLIC_AMOJI_API` (GitHub Pages) the client never calls these routes and
behaves exactly as before.

### Real volume warnings

`POST /api/search` increments `rate_limit_daily` (today, UTC) and
`rate_limit_window` (this refill cycle, every key). `/api/admin/warnings` now
returns `searchUsage: { breaker, searchesToday, searchesThisWindow,
windowStartedAt, windowSeconds, maxSearchesPerWindow, windowUtilisation }` and
adds:

- `search_volume_at_limit` (warn) when `searchesThisWindow >= maxSearchesPerWindow`;
- `search_volume_rising` (info) from 50 % of the cap.

The admin page shows the same numbers in the warnings footer. "Approaching the
limit" is measured against the current window across all clients, because the
cap is per client key and there is no global concurrency counter.

---

## 3. Admin page

Location: `apps/web/public/docs/admin.html` (self-contained HTML + inline
CSS/JS, no build step, no React).

Local URLs:

- file: `file:///D:/AI app development/amoji-app/apps/web/public/docs/admin.html`
- with a static server in that folder:
  `cd apps/web/public/docs; python -m http.server 8788`
  → `http://127.0.0.1:8788/admin.html`
- under `next dev`, Next serves `public/` at the root:
  `http://127.0.0.1:3000/docs/admin.html`

After Pages deploys:
`https://monmonmars.github.io/amoji-app/docs/admin.html`

Behaviour:
- asks for the backend base URL once (default `http://127.0.0.1:8787`, kept in
  `localStorage` because it is not secret);
- asks for the admin token once and keeps it **only** in `sessionStorage`;
  never in the URL, never in `localStorage`;
- stats cards, warnings block at the top, breaker control with
  closed/soft/hard + `maxSearchesPerWindow`, users table with pagination,
  inspect, and revoke-sessions;
- distinct honest states for 401 (token rejected), 503 (admin disabled),
  API error, and "cannot reach backend" (8 s timeout + checklist); the dashboard
  is hidden rather than showing fake or stale rows;
- responsive down to a 390 px phone viewport (verified in a browser).

Verified against the real local server: connect, stats (2 users, 2 sessions),
breaker `closed → hard → closed` with history, inspect a user, revoke (active
sessions dropped 2 → 1), 401, and unreachable-port states.

---

## 4. Production environment variables (read from the code)

### Required for this feature

| Variable | Used by | Notes |
| --- | --- | --- |
| `AMOJI_ADMIN_TOKEN` | `src/admin.ts` | Long random secret. Unset = admin routes 503. |
| `AMOJI_DB` | `src/index.ts` | Absolute path on a persistent volume, e.g. `/data/amoji.sqlite`. Default `data/amoji.sqlite` is ephemeral on Fly. |

### Server / CORS

| Variable | Used by | Notes |
| --- | --- | --- |
| `AMOJI_PORT` | `src/index.ts` | Default `8787`. Falls back to PaaS `PORT`. |
| `AMOJI_CORS_ORIGIN` | `src/security.ts`, `src/http.ts` | Default `*`. Set to `https://monmonmars.github.io` in production. |
| `AMOJI_PUBLIC_ORIGIN` | `src/billing.ts` | Stripe success/cancel return origin. |
| `AMOJI_TOOLS` | `src/live.ts` | `0/false/off/no` disables weather/news fetches. |

### LLM (`src/llm.ts`)

| Variable | Notes |
| --- | --- |
| `AMOJI_LLM_PROVIDER` | `offline`, `pollinations`, or a provider name prefix. |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` / `GROQ_API_KEY` / `OPENROUTER_API_KEY` / `GITHUB_TOKEN` / `MOONSHOT_API_KEY` | First configured key wins. With none, the keyless Pollinations lane is tried, then offline replies. |

### Email (`src/email.ts`, `src/http.ts`)

| Variable | Notes |
| --- | --- |
| `RESEND_API_KEY` | Required for any outbound mail. |
| `AMOJI_MAIL_FROM` | Verified sender. |
| `AMOJI_SUPPORT_INBOX` | Optional ops inbox for support messages. |

### Billing (`src/billing.ts`)

| Variable | Notes |
| --- | --- |
| `STRIPE_SECRET_KEY` | Enables Checkout Session creation. |
| `STRIPE_WEBHOOK_SECRET` | Required for webhook signature checks. |
| `STRIPE_PRICE_ID` | Plus price. |
| `STRIPE_PAYMENT_LINK` (or `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`) | Payment-link fallback. |
| `AMOJI_BILLING_DEMO` | `1/true/yes` grants Plus locally without money. Never set this in production. |

### TTS

| Variable | Notes |
| --- | --- |
| `EDGE_TTS_TOKEN` | Optional bearer for the Edge TTS relay; a public default token exists in `tts.ts`. |

### Static site build (GitHub Actions, not the API)

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_AMOJI_API` | Backend origin baked into the static app at build time. |
| `AMOJI_EXPORT`, `AMOJI_BASE_PATH`, `NEXT_PUBLIC_BASE_PATH` | Already set by `.github/workflows/pages.yml`. |
| `NEXT_PUBLIC_TTS_PROXY`, `NEXT_PUBLIC_EDGE_TTS_TOKEN` | Optional Actions variables already referenced by the workflow. |

Node 22.5–23.3 only: add `NODE_OPTIONS=--experimental-sqlite`. Node 24 needs
nothing.

---

## 5. Fly.io walkthrough (recommended for Node + SQLite)

Fly is the best fit because it gives a persistent volume to a single machine,
which SQLite needs.

### Why a volume is mandatory

The root filesystem of a Fly machine is replaced on every deploy/restart.
SQLite stores users, sessions, entitlements, chat turns, and the admin breaker in
one file. Without a volume at `/data`, every redeploy wipes all accounts and the
search policy. Also run **one** machine: SQLite is single-writer, and two
machines would each have their own volume copy.

### Files to add at the repo root

`Dockerfile` (multi-stage; the server bundles shared `apps/web/lib` code, so
build from the monorepo root, not from `server/backend` alone):

```dockerfile
FROM node:24-slim AS build
WORKDIR /repo
RUN npm install -g pnpm@9.15.0
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @amoji/server build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/server/backend/dist/index.mjs ./index.mjs
EXPOSE 8787
CMD ["node", "index.mjs"]
```

`.dockerignore`:

```text
.git
node_modules
**/node_modules
apps/web/out
apps/web/.next
apps/web/public/models
```

`fly.toml`:

```toml
app = "amoji-api"
primary_region = "hkg"

[build]
  dockerfile = "Dockerfile"

[env]
  AMOJI_PORT = "8787"
  AMOJI_DB = "/data/amoji.sqlite"

[[mounts]]
  source = "amoji_data"
  destination = "/data"

[http_service]
  internal_port = 8787
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 1

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  path = "/api/health"
  timeout = "5s"

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

### Commands

```powershell
# 1. Long random token (64 hex chars / 256 bits)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

fly launch --no-deploy          # from the repo root; keep the generated name/region
fly volumes create amoji_data --size 1 --region hkg
fly secrets set AMOJI_ADMIN_TOKEN="<paste-the-64-hex-token>" `
  AMOJI_CORS_ORIGIN="https://monmonmars.github.io" `
  AMOJI_PUBLIC_ORIGIN="https://monmonmars.github.io/amoji-app"
fly deploy
fly logs                         # expect "amoji server http://127.0.0.1:8787"
fly ssh console -C "ls -l /data" # amoji.sqlite must exist after first request
```

Verify from the outside:

```powershell
curl.exe -s https://<app>.fly.dev/api/health
curl.exe -s -o NUL -w "%{http_code}`n" https://<app>.fly.dev/api/admin/stats      # 401
curl.exe -s -H "authorization: Bearer <token>" https://<app>.fly.dev/api/admin/stats  # 200
```

Optional: add the LLM/mail/Stripe secrets from section 4 with `fly secrets set`.
Use `fly secrets set AMOJI_ADMIN_TOKEN=...` again to rotate; no restart command
is needed.

---

## 6. Render / Railway alternative

Both work, but only with a persistent disk. Free instances without a disk will
lose every account on restart.

Render:
- New Web Service from this repo.
- Build: `npm install -g pnpm@9.15.0 && pnpm install --frozen-lockfile && pnpm --filter @amoji/server build`
- Start: `node server/backend/dist/index.mjs`
- Add a disk mounted at `/data`; set `AMOJI_DB=/data/amoji.sqlite`.
- Render injects `PORT`; this server now honors it as a fallback for `AMOJI_PORT`.
- Set `AMOJI_ADMIN_TOKEN`, `AMOJI_CORS_ORIGIN=https://monmonmars.github.io`.

Railway: same build/start commands, add a volume mounted at `/data`, set the
same env vars. Railway also injects `PORT`.

SQLite caveat on all three: one instance only, no horizontal scaling.

---

## 7. Pointing the static site at the API

`apps/web/lib/backend-client.ts` reads `NEXT_PUBLIC_AMOJI_API` at build time.
`NEXT_PUBLIC_*` values are inlined, so **changing a variable alone does nothing
until the Pages workflow rebuilds**.

1. Create a GitHub **Actions variable** (not a secret; it is public):
   - name `AMOJI_API_URL`
   - value `https://<app>.fly.dev`
2. `.github/workflows/pages.yml` currently does **not** pass it. Add one line to
   the `static export build` env block:

```yaml
      - name: static export build
        run: pnpm --filter @amoji/web build
        env:
          AMOJI_EXPORT: "1"
          AMOJI_BASE_PATH: /amoji-app
          NEXT_PUBLIC_BASE_PATH: /amoji-app
          NEXT_PUBLIC_AMOJI_API: ${{ vars.AMOJI_API_URL }}   # <-- add this
          NEXT_PUBLIC_TTS_PROXY: ${{ vars.AMOJI_TTS_PROXY }}
          NEXT_PUBLIC_EDGE_TTS_TOKEN: ${{ vars.AMOJI_EDGE_TTS_TOKEN }}
```

3. Re-run the workflow: push to `main`, or Actions → **pages** → **Run
   workflow** (`workflow_dispatch` is enabled).
4. Confirm in the deployed site's DevTools that requests go to the Fly hostname.
   The admin page does not depend on this build variable; it has its own backend
   URL input.

Once that variable is set, `apps/web/lib/search-gate.ts` starts calling
`POST /api/search` before a music search: `soft` speaks the delay line, `hard`
falls back to the curated list. Until it is set, `searchGateConfigured()` is
false and the gate returns before any I/O.

The backend must allow the Pages origin via `AMOJI_CORS_ORIGIN`
(`https://monmonmars.github.io`) for browser calls from the static app.

---

## 8. Security warnings

- `AMOJI_ADMIN_TOKEN` must be **long and random** (32 random bytes → 64 hex
  chars). Do not reuse a password, do not commit it, do not put it in a URL.
  Rotate with `fly secrets set` if it ever leaks.
- The token travels in an `Authorization` header. Serve the admin page and the
  API over **HTTPS only** in production. Over plain HTTP anyone on the network
  can read the token. The local `http://127.0.0.1:8787` default is for
  development only.
- Lock `AMOJI_CORS_ORIGIN` to the Pages origin; `*` is convenient locally but
  should not stay in production. CORS is not the security boundary — the token
  check is — but a tight origin reduces browser-side exposure.
- The admin page keeps the token in `sessionStorage` (per-tab, cleared on tab
  close), not `localStorage`, so it is not shared with other tabs or persisted to
  disk by the page.
- Never set `AMOJI_BILLING_DEMO=1` in production; it grants Plus for free.
- No admin route returns session tokens or password hashes.

---

## 9. What is NOT done

- **No deployment was performed.** No Fly app, machine, volume, secret, domain,
  or TLS certificate was created. No Render/Railway service exists.
- No production database was provisioned or migrated.
- No secrets were generated or stored.
- The breaker is now enforced at `POST /api/search`, but `tracks` is empty
  until #574's Jamendo provider is wired (marked `TODO(provider)`); the route
  gates and counts, it does not search upstream yet.
- The client calls the gate only when `NEXT_PUBLIC_AMOJI_API` is configured
  (see §7). There is no API search provider on this branch, so the Pages demo
  still plays the curated list and `APP_REVISION` / `sw.js` / `revision.txt`
  were **not** bumped: the published build's behaviour is unchanged.
- The admin page is not linked from the app UI; open it by URL.
- Admin auth has no per-request audit trail (single-owner token model); only
  limit changes are recorded in `admin_events`.
- Email, billing, and live LLM replies require provider accounts and keys that
  were not created.
- No SQLite backup schedule was configured. Fly keeps volume snapshots, but the
  owner should confirm retention in the Fly dashboard.
