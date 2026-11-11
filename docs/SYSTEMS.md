# Amoji product systems map

Honest inventory of settings, payments, email, auto-reply, security, file
locations, free servers, client storage, and legal surfaces. Values that are
optional stay optional — GitHub Pages builds do not invent a server.

## Free hosting (default)

| Role | Location | Cost notes |
| --- | --- | --- |
| Companion UI | GitHub Pages (`monmonmars.github.io/amoji-app`) | Free static host |
| Edge TTS relay | Cloudflare Worker (`server/amoji-proxy`) | Free tier (~100k req/day) |
| Optional API | `server/backend` on any Node host (`AMOJI_PORT`, default `8787`) | Free/cheap VPS or local |
| SQLite | `AMOJI_DB` path (default `data/amoji.sqlite`) | On the Node host disk |
| Talk ciphertext (optional) | Supabase REST `talk_turns` when configured | Free Supabase tier |

Unset `NEXT_PUBLIC_AMOJI_API` keeps the static Pages build fully on-device.

## File locations

| Kind | Path / key |
| --- | --- |
| Static models, audio, SFX | `apps/web/public/` |
| Companion export (`.aigf`) | Downloaded by the user; never uploaded by Pages |
| Content reports | `localStorage` key `amoji.reports.v1` (+ optional `POST /api/reports`) |
| Production DB | `$AMOJI_DB` (SQLite) |
| Legal copy source | `apps/web/lib/legal-copy.ts` |
| This map | `docs/SYSTEMS.md` + runtime `lib/systems-catalog.ts` |

There is no S3 / R2 / Blob upload path in the product today.

## Client data storage

All primary companion state is **browser `localStorage`** (see
`apps/web/lib/client-storage.ts` for the keyed inventory). Optional
`sessionStorage` holds short-lived UI state. Optional production API holds an
anonymous session token + companion/chat rows in SQLite when configured.

## Settings

`SettingsSheet` is the single in-app settings surface: language, volumes,
voice/TTS, location, memory/data (including wipe product data), companion
file, profile, Advanced brain keys, plan/quota, systems & legal links, and
Help (tutorial + support contact).

## Payment

Device-local daily chat quota (`lib/daily-quota.ts`, limit from
`lib/charging-rules.ts`, default **40 turns/UTC day**) is the free plan.
Plus unlocks unlimited chat turns for **30 days** after a verified Stripe
webhook (or a labeled **demo** unlock — see below).

### Payment rules (`lib/payment-rules.ts` + `lib/billing.ts`)

| Rule | Behavior |
| --- | --- |
| When payment is required | Free plan + daily LLM chat quota exhausted. TTS / poke / idle / games / crisis / setup never require payment. |
| Upgrade offered | `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` set, **or** `NEXT_PUBLIC_AMOJI_PAYMENT_DEMO=1`. |
| Checkout | Prefer `POST /api/billing/checkout` (attaches session `userId`). Else open Payment Link with `client_reference_id`. |
| Success return | `?amoji_pay=success` → sync entitlement from API; strip query. |
| Cancel return | `?amoji_pay=cancel` → no charge; free limits stay. |
| Demo | `NEXT_PUBLIC_AMOJI_PAYMENT_DEMO=1` (web) / `AMOJI_BILLING_DEMO=1` (API) unlocks Plus **without charging** and labels it in Settings. |

Live money requires:

- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` on the Node API (webhook → SQLite entitlement), and
- `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` and/or `STRIPE_PRICE_ID` (+ optional `AMOJI_PUBLIC_ORIGIN` for Checkout Session success/cancel URLs).

Without those secrets, the UI shows free quota only (or labeled demo) — no silent fake charge.

### Charging rules (`lib/charging-rules.ts`)

Only **`chat_llm_turn`** costs 1 free daily turn. Everything else in the table
(`tts_free`, poke, idle, game, crisis, local music/sing/dance, setup, BYOK)
costs **0** and is not gated. Catalog Plus display price is **$4.99 / 30 days**;
the live Stripe link or `STRIPE_PRICE_ID` owns the real charge amount.

`GET /api/billing/rules` publishes the same numbers for operators.

## Email

Transactional mail (report receipt + support auto-ack) runs only when
`RESEND_API_KEY` and `AMOJI_MAIL_FROM` are set on the Node API. Pages builds
keep reports local and exportable.

| Surface | Behavior |
| --- | --- |
| Report dialog | Optional contact email → `POST /api/reports` (anonymous). Ack mail when configured. |
| Settings → Help | Support form → `POST /api/support` (anonymous). Stores in SQLite; auto-acks the user; optional `AMOJI_SUPPORT_INBOX` gets an ops copy. |
| Pages-only | No `NEXT_PUBLIC_AMOJI_API` → form tells the user to open a GitHub Issue; reports stay on-device + JSON export. |

## Auto-reply

1. **Crisis** — on-device keyword guard (`lib/crisis.ts`); never emailed; no LLM.
2. **Ops / support** — fixed templates (`lib/auto-reply.ts` + server twin) for
   report acknowledgment and support auto-ack when email is configured.

## Security

Anonymous bearer sessions on the Node API; CORS origin lock via
`AMOJI_CORS_ORIGIN`; per-IP rate limits; security headers on API responses;
crisis fail-closed before the model; BYOK keys stay in the browser. See
`lib/security-policy.ts` and `server/backend/src/security.ts`.

## Legal

Privacy, Terms, Safety, Cookies, and Credits. First-run gate uses
`LEGAL_ACCEPT_VERSION` in `lib/legal-accept.ts` — bump it when policy facts
change so returning users re-consent.
