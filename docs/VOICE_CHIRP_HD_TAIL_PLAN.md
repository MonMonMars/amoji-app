# Voice — Chirp 3 HD Cantonese tail (capped at $0)

**Status:** plan only · no production code, no keys, no revision bump
**Date:** 2026-11-28 (HKT) · **Owner:** Pixel
**Scope:** cover the unbounded chat tail with Google Cloud **Chirp 3 HD
`yue-HK`**, behind a server-side proxy and a hard character budget that makes a
bill impossible.
**Budget rule:** one-time spend only, no recurring billing. Chirp is **$0 inside
the 1,000,000-character monthly free tier**; the guard in §1 is what keeps it
there.

---

## RECOMMENDATION

**Do not build this first; build it only after the bake (§ Doc 1) and only with
the cap.** Chirp 3 HD is the only option that can cover *live, unbounded* chat
in Cantonese at $0 within the free tier, and it is a real quality step up from
gTTS. But it fails two of the owner's tests as a first move: it requires a card
on file and billing enabled (a recurring-risk architecture even at $0), and it
changes the speaker — Chirp's `yue-HK` voices are **not** WanLung / HiuMaan /
HiuGaai, so the 3-persona promise becomes 3 *roles* with new voices. There is
also a correction to the brief: Google's own docs list `yue-hk` as an **exception
to pause-markup and custom-pronunciation support**, so the emotion lever is
narrower than expected. Sequence: bake the fixed moments first (one-time $22),
audition Chirp on 12 lines, and only then enable the tail behind the flag. If
the owner does not want a card on file at all, skip this document entirely; the
bake already fixes the moments that matter most.

---

## 1. Cost model with arithmetic, and the hard cap

### 1.1 The free tier and a heavy user

| Quantity | Value |
|---|---:|
| Chirp 3 HD free tier | 1,000,000 characters / month |
| Overage price | US$0.00003 / character = **US$30 per 1M characters** |
| Heavy user in the brief | 180,000 characters / month |
| Share of free tier | 180,000 ÷ 1,000,000 = **18%** |
| Free headroom left | **820,000 characters** |

A 180k/month user never comes close to the free allowance. The risk is not the
heavy user; it is a bug, a retry loop, or a leaked Worker URL.

### 1.2 What overflow would cost if uncapped

| Monthly characters | Billable overage | Bill at $0.00003/char |
|---:|---:|---:|
| 1,000,000 | 0 | **$0.00** |
| 1,200,000 | 200,000 | **$6.00** |
| 1,800,000 | 800,000 | **$24.00** |
| 10,000,000 | 9,000,000 | **$270.00** |

That last row is the owner's fear. The cap below makes it unreachable.

### 1.3 The guard (recommended values)

| Constant | Value | Why |
|---|---:|---|
| `CHIRP_ENABLED` | `1` only after audition | kill switch |
| `CHIRP_MONTHLY_CHAR_BUDGET` | **800,000** | 80% of the 1M free tier; 200k headroom for retries, double counts, and SSML overhead |
| `CHIRP_DAILY_CHAR_BUDGET` | **26,000** | 800k ÷ 31 ≈ 25.8k; stops a single-day runaway |
| `CHIRP_MAX_REQUEST_CHARS` | **400** | one chat line; longer replies stay on gTTS |
| GCP quota: characters/day | **33,000** (closest offered) | hard backstop = 1.02M/month worst case |
| GCP budget alert | **$1** | 50 / 90 / 100% email alerts |

Reservation algorithm (count before calling, refund on failure):

```ts
const key = `chirp:chars:${monthKey()}`;          // 2026-11
const used = Number(await env.CHIRP_KV.get(key)) || 0;
const reserve = chars + 50;                        // + SSML/punctuation margin
if (used + reserve > MONTHLY_BUDGET) return json(429, 'chirp-budget-month');
if (dayUsed + reserve > DAILY_BUDGET)  return json(429, 'chirp-budget-day');
await env.CHIRP_KV.put(key, String(used + reserve), { expirationTtl: 40 * 86400 });
try { return await callGoogle(...); }
catch (e) { await env.CHIRP_KV.put(key, String(used)); throw e; }
```

Workers KV free tier allows 1,000 writes/day. A 26,000-char day at ~60 chars per
chat line is ~433 requests, i.e. ~433 `put` calls (plus refunds on failure) —
comfortably under the limit. A leaked URL doing 10,000 tiny requests would hit
the KV write limit before it could spend money, which is an acceptable failure
mode.

KV is eventually consistent, so two simultaneous requests can slightly
overshoot the counter. That is why the **GCP quota is the last line of
defence**: even if the Worker counter fails completely, 33,000 chars/day × 31 =
1,023,000 chars, which is **23,000 chars over** the free tier = **$0.69** for
the month. Under $1 is the true worst case. (If the owner wants exact
accounting, use a Durable Object; that is a Workers paid feature and would add a
recurring cost, so it is not recommended.)

### 1.4 Why a generator loop cannot bill

- Every request is capped at 400 chars; a 10,000-char prompt is split or
  skipped.
- The monthly reservation trips at 800k, before the 1M free tier.
- The daily cap trips at 26k.
- Google's own quota caps the project at 33k/day even if the Worker is buggy.
- The client circuit breaker stops retrying a 429; it does not hammer the
  Worker.

**Recommended cap value: `CHIRP_MONTHLY_CHAR_BUDGET = 800_000`.**

---

## 2. Architecture

### 2.1 Where it lives

Follow the existing proxy pattern (`server/amoji-proxy/worker.js` +
`wrangler.toml` + `wrangler secret`). The key exists only as a Worker secret and
is never sent to the browser:

```
browser (apps/web)
  └─ POST https://amoji.<you>.workers.dev/v1/tts/chirp
        body: { text, voice?, gender?, speakingRate?, pitch? }  ← no key, ever
              │
              ▼
Cloudflare Worker
  ├─ CHIRP_ENABLED / kill key / monthly+day budget / request cap
  ├─ call https://texttospeech.googleapis.com/v1/text:synthesize?key=<secret>
  └─ return audio/mpeg (base64-decoded) or a typed error
```

- New file: `server/amoji-proxy/chirp.js` (budget + Google request + error
  mapping), imported by `worker.js`.
- New route: `POST /v1/tts/chirp` in `worker.js`; CORS stays `*` like today.
- New binding: `CHIRP_KV` (Workers KV, free tier).
- Secrets/vars: `GOOGLE_TTS_KEY` (secret), `CHIRP_ENABLED`,
  `CHIRP_MONTHLY_CHAR_BUDGET`, `CHIRP_DAILY_CHAR_BUDGET` (vars).
- Client file: `apps/web/lib/chirp-tts.ts` with `speakChirp(text, opts)`; it
  POSTs, decodes the MP3 into a Blob, and plays through the same
  `startHtmlAudioOnDefaultSpeakers()` / `followAudioElement()` route as
  `gtts.ts`, so sink pinning and lip-sync behave the same.
- No key in `NEXT_PUBLIC_*`, no key in localStorage, no key in the Worker
  response.

### 2.2 Fallback order

For `yue`, Chirp becomes the first hop **only when available**; otherwise the
order is byte-for-byte today's chain:

```
female / default:  chirp? → gtts → synth → canto-nano(skip) → edge
male:              chirp? → edge → synth → gtts
```

`apps/web/lib/tts-chain.ts` gains one hop:

```ts
export type FreeVoiceHop = 'chirp' | 'edge' | 'gtts' | 'synth' | 'canto-nano';
```

`freeVoiceHops()` prepends `'chirp'` only when `opts.chirp === true`. In
`apps/web/lib/voice.ts` (`runFreeChain()` ~2049 and `runAt()` ~2116) set
`chirp: chirpAvailable(lang, text)` and add:

```ts
if (hop === 'chirp') {
  if (spokenGender === 'male' && !chirpHasMale()) { next(); return; }
  void speakChirp(text, { ... }).then(() => settle()).catch(next);
  return;
}
```

`chirpAvailable()` is false on any of: locale ≠ `yue`; flag off; no proxy;
`text.length > 400`; circuit breaker open; no quota signal. It never throws.

### 2.3 Degrade on every failure

| Failure | Behaviour |
|---|---|
| flag off / no proxy | hop absent; chain unchanged |
| HTTP 401 / 403 (bad or restricted key) | open breaker 24 h; fall through |
| HTTP 429 `chirp-budget-*` | open breaker until the 1st of next month (monthly) or next local day (daily); fall through |
| HTTP 5xx / network error | count a failure; after 2 in 5 min open breaker 10 min; fall through |
| > 2.0 s timeout | abort; fall through (short line; do not hold the queue) |
| Google returns empty/invalid audio | treat as failure; fall through |
| client flag flipped off mid-session | next line skips Chirp |

The existing `reportVoiceStatus()` bus should report `chirp` on attempt and
failure so the owner can see which tier spoke.

---

## 3. Voice selection (`yue-HK` Chirp 3 HD)

Google's voice list (fetched 2026-11-28) lists 30 `yue-HK-Chirp3-HD-*` voices:
14 female, 16 male. Voice names are `<locale>-Chirp3-HD-<name>`.

**Female (14):**

| Voice id | Gender | Shortlist |
|---|---|---|
| `yue-HK-Chirp3-HD-Achernar` | Female | calmer female candidate (HiuMaan role) |
| `yue-HK-Chirp3-HD-Aoede` | Female | brighter female candidate (HiuGaai role) |
| `yue-HK-Chirp3-HD-Autonoe` | Female | |
| `yue-HK-Chirp3-HD-Callirrhoe` | Female | |
| `yue-HK-Chirp3-HD-Despina` | Female | |
| `yue-HK-Chirp3-HD-Erinome` | Female | |
| `yue-HK-Chirp3-HD-Gacrux` | Female | |
| `yue-HK-Chirp3-HD-Kore` | Female | calmer alternative |
| `yue-HK-Chirp3-HD-Laomedeia` | Female | |
| `yue-HK-Chirp3-HD-Leda` | Female | brighter alternative |
| `yue-HK-Chirp3-HD-Pulcherrima` | Female | |
| `yue-HK-Chirp3-HD-Sulafat` | Female | calmer alternative |
| `yue-HK-Chirp3-HD-Vindemiatrix` | Female | |
| `yue-HK-Chirp3-HD-Zephyr` | Female | brighter alternative |

**Male (16):**

| Voice id | Gender | Shortlist |
|---|---|---|
| `yue-HK-Chirp3-HD-Achird` | Male | |
| `yue-HK-Chirp3-HD-Algenib` | Male | WanLung-role candidate |
| `yue-HK-Chirp3-HD-Algieba` | Male | |
| `yue-HK-Chirp3-HD-Alnilam` | Male | |
| `yue-HK-Chirp3-HD-Charon` | Male | deeper male candidate |
| `yue-HK-Chirp3-HD-Enceladus` | Male | |
| `yue-HK-Chirp3-HD-Fenrir` | Male | |
| `yue-HK-Chirp3-HD-Iapetus` | Male | |
| `yue-HK-Chirp3-HD-Orus` | Male | WanLung-role candidate |
| `yue-HK-Chirp3-HD-Puck` | Male | |
| `yue-HK-Chirp3-HD-Rasalgethi` | Male | |
| `yue-HK-Chirp3-HD-Sadachbia` | Male | |
| `yue-HK-Chirp3-HD-Sadaltager` | Male | |
| `yue-HK-Chirp3-HD-Schedar` | Male | |
| `yue-HK-Chirp3-HD-Umbriel` | Male | |
| `yue-HK-Chirp3-HD-Zubenelgenubi` | Male | |

Shortlist is **timbre-unverified**; audition the shortlisted ids and pick one
per role. Do not infer a persona from the name.

### 3.1 The 3-persona mapping (no fourth persona)

| App persona today | Edge id | Chirp role candidate |
|---|---|---|
| WanLung (only male) | `zh-HK-WanLungNeural` | `yue-HK-Chirp3-HD-Charon` (or Algenib / Orus) |
| HiuMaan (calmer female) | `zh-HK-HiuMaanNeural` | `yue-HK-Chirp3-HD-Achernar` (or Kore / Sulafat) |
| HiuGaai (brighter female) | `zh-HK-HiuGaaiNeural` | `yue-HK-Chirp3-HD-Aoede` (or Leda / Zephyr) |

**This is a real product change, not a drop-in.** Chirp voices are different
people from the Edge voices. The picker currently promises WanLung / HiuMaan /
HiuGaai; if Chirp speaks, that label is no longer literally true. Recommended
handling:

1. Keep exactly three Chirp ids — one per persona role — so the "three
   Cantonese voices" decision is not violated.
2. Add an **HD** badge and one honest line in the voice picker: "HD voices are
   a different studio speaker in the same role."
3. Keep per-character identity on `speaking_rate` / pitch offsets, as Edge does
   today.
4. Accept that a mid-line fallback (Chirp → gTTS) changes speaker. The app
   already does this (Edge → gTTS), so it is consistent, but it will be more
   noticeable because Chirp is a stronger speaker.

Do **not** add a fourth persona and do **not** silently present Chirp as
WanLung.

---

## 4. Emotion limitation — what Chirp can and cannot do

Chirp 3 HD has **no `style` / `styledegree` parameter**. There is no `cheerful`,
`sad`, `whisper`, `laugh` lever. What is left:

| Lever | Works? | Notes |
|---|---|---|
| `speaking_rate` 0.25–2.0 | Yes, all locales | main pacing lever |
| SSML `<prosody pitch rate volume>` | Yes, **sync only** | ignored on streaming |
| SSML `<break>` | Sync only | must be auditioned for `yue-HK`; punctuation is safer |
| `[pause]` / `[pause long]` in `markup` | **No for `yue-hk`** | Google lists `yue-hk` as an exception to pause control |
| Custom pronunciations | **No for `yue-hk`** | also an explicit exception |
| Inline emotion tags (`[sad]`) | No | not a Chirp feature |
| Laugh / sigh / whisper | No | keep the recorded SFX library |

Google's docs (fetched 2026-11-28) say pause control is available "across all
locales except … `yue-hk`" and custom pronunciations likewise. So the brief's
`[pause]` lever **does not apply to Cantonese**. Do not build around it.

### 4.1 What can still be squeezed out

- **Rate**: slower for sadness / comfort (0.85–0.92), slightly faster for
  excitement (1.06–1.12). Stay inside the app's existing
  `NEURAL_PROSODY` deltas so the felt range is consistent.
- **Pitch**: `<prosody pitch="-2st">` down for sadness, `+2st` up for surprise
  — small, or it sounds like a cartoon.
- **Punctuation**: `，` for a short breath, `。` for a full stop, `……` for
  hesitation, `！` for emphasis. This is the most reliable emotion carrier and
  costs nothing.
- **Clause order**: put the emotional word last in the clause; Cantonese
  intonation lifts on the clause tail.
- **Volume**: `<prosody volume="soft">` for comfort; leave normal for joy.

Honest limit: Chirp will sound **more natural and less flat than gTTS**, but it
will not laugh, cry, whisper, or act. Those moments belong to the bake (Doc 1)
and the recorded SFX.

### 4.2 Sync vs streaming

**Recommend synchronous `text:synthesize` with MP3.**

- SSML (the only prosody lever) works only on sync requests.
- Streaming supports ALAW / MULAW / OGG_OPUS / PCM, not MP3 — more client
  decoding work, and no SSML.
- Lines are short (≤400 chars), so a single sync response is fine.
- Budget a 2.0 s client timeout; on timeout fall through. Do not let Chirp add
  a long silence before gTTS.

---

## 5. Text shaping and the `stripStageDirections` trap

`apps/web/lib/speak-text.ts` is the single choke point, and it is hostile to
tags **by design**:

- `stripStageDirections()` deletes `[sad]`, `[laughs]`, `(softly)`,
  `*sighs*`. For Chirp this is harmless (Chirp has no tags), but it means a
  tag-based vendor can never receive tags through `speak()` without a new
  cleaner that runs **before** this function. Do not plan a tag passthrough
  for Chirp.
- `cleanForSpeech()` also maps em/en dashes to `，`, strips symbols, removes
  URLs / hashtags / handles, removes spoken laugh tokens, strips a lone leading
  particle, and collapses whitespace. Build the Chirp body from its output.
- `stripVoicedGlyphs()` removes `<` and `>` (they are in `VOICED_SYMBOLS`), so
  it must **never** be applied to an SSML string. Apply it to the text content
  first, then wrap in `<speak><prosody>…</prosody></speak>`.
- `splitClauses()` (`apps/web/lib/gtts.ts`) is the existing clause splitter.
  Chirp handles punctuation itself, so a single request is fine; split only
  when the cleaned text exceeds 400 characters (then either send sequentially
  or skip Chirp and use gTTS to avoid a long pause).
- The Edge server cap is `text.trim().slice(0, 800)` in
  `server/backend/src/tts.ts`; use 400 for Chirp so one line cannot blow the
  per-request guard.
- Numbers, Latin words, and code-switching (`OK`, `iPhone`) are **unverified**
  for `yue-HK`; put one mixed line in the audition.

---

## 6. Rollout gate

1. **Feature flag** `NEXT_PUBLIC_AMOJI_CHIRP` (default off) + Worker var
   `CHIRP_ENABLED` (default `0`). Both must be on.
2. **Audition** 12 lines (below) through a one-off script or a hidden
   `/voice-lab` page; owner signs a dated row.
3. **Kill switch** — two levels:
   - Fast: set KV key `chirp:kill = "1"`; the Worker checks it before every
     call and returns 503 `chirp-killed`; the client falls through. Takes effect
     on the next request, no deploy.
   - Hard: set `CHIRP_ENABLED=0` in `wrangler.toml` and redeploy; or flip the
     Pages variable off and redeploy the web app.
4. **Circuit breaker** in `localStorage` (`amoji.chirp.deadUntil`) plus an
   in-memory breaker in the Worker, so a dead key does not cost 2 s per line.

### Audition lines

| # | Line | Tests |
|---|---|---|
| 1 | 「好開心認識你。」 | basic Hong Kong vowels |
| 2 | 「哈哈，個頭呀？」 | short poke rhythm |
| 3 | 「你頭先嗰句我聽到喇——我仲喺度陪住。」 | long clause, dash pause |
| 4 | 「早啲唞，聽日再傾。」 | soft goodnight |
| 5 | 「對唔住，頭先我講錯咗。」 | apology sincerity |
| 6 | 「我覺得你好努力，真係。」 | praise, not patronising |
| 7 | 「你點解攞住我隻手㗎……我有少少怕醜。」 | ellipsis, shy |
| 8 | 「嗯……等我諗下先。」 | filler, no robot cadence |
| 9 | 「唔好唔開心，我喺度。」 | comfort |
| 10 | 「我而家唱俾你聽。」 | song-intro frame |
| 11 | 「OK，我哋而家開始。」 | code-switch with Latin |
| 12 | 「你今年幾多歲呀？」 | question intonation |

Pass criteria: Hong Kong Cantonese, correct final consonants and tones, natural
pauses, male reads male, no Mandarin accent, no random English. If it sounds
robotic, **stop** — the owner has rejected that before, and the bake is the
lower-risk spend.

---

## 7. What the owner must do (precise)

1. Create / choose a Google Cloud project.
2. **Enable billing** and attach a card. This is required even to use the
   free 1M-character allowance; without billing the API returns an error.
3. Enable the **Cloud Text-to-Speech API** for that project.
4. Create an **API key** restricted to that API (API restriction only; HTTP
   referrer restriction will not work because Workers have no fixed egress IP).
5. Set the lowest quota the console offers: target **33,000 characters/day**
   (or the closest daily character quota; if only a per-minute quota is
   offered, set 600 characters/minute and rely on the Worker cap + budget
   alerts).
6. Create a **budget of $1** with 50 / 90 / 100% email alerts. Note: a budget
   alert does **not** stop spend; the Worker cap and the quota do.
7. In `server/amoji-proxy`, run `wrangler secret put GOOGLE_TTS_KEY` and paste
   the key (never commit it).
8. Create a Workers KV namespace and add the `CHIRP_KV` binding in
   `wrangler.toml`.
9. Set vars `CHIRP_ENABLED=0`, `CHIRP_MONTHLY_CHAR_BUDGET=800000`,
   `CHIRP_DAILY_CHAR_BUDGET=26000`; deploy the Worker.
10. Run the 12-line audition with a **local script** that reads
    `GOOGLE_TTS_KEY` from the owner's shell (the key never enters the app).
    Only after `AUDITION: PASS` set `CHIRP_ENABLED=1` and
    `NEXT_PUBLIC_AMOJI_CHIRP=1`, then redeploy both.
11. Keep the card on file only because Google requires it; the app-side cap and
    the GCP quota keep the bill at $0. If the owner is not comfortable with a
    card on file, **do not build this**.

---

## 8. Verification

### Unit tests

- `server/amoji-proxy/chirp.test.mjs`
  - monthly budget: 799,900 + 200 → 429; 800,000 exactly → 429.
  - daily budget trips independently.
  - missing `GOOGLE_TTS_KEY` → 503, no upstream call.
  - successful call increments by `chars + 50`; failure refunds.
  - error body never contains the key; no `console.log` of the key.
  - kill key `chirp:kill=1` → 503 before any Google call.
- `apps/web/tests/chirp-tts.test.ts`
  - 429 → falls through to gTTS; breaker set.
  - 2 s timeout → falls through; no second attempt in the same line.
  - success → `speakGtts` / `speakEdge` not called.
  - locale ≠ `yue` → never called.
  - text > 400 chars → hop absent.
- `apps/web/tests/tts-chain.test.ts`
  - `chirp` first for yue when enabled; absent when disabled; male order
    preserved.
- `apps/web/tests/speak-text.test.ts`
  - `stripVoicedGlyphs` is not applied to an SSML string (guard against a
    future refactor destroying `<prosody>`).

### Phone smoke row

```
ROW: voice-chirp DEVICE: <model>
- yue chat line: does the tail voice sound clearer than gTTS, or the same?
- male companion: male Chirp voice, never the female gTTS speaker?
- turn off Wi-Fi / block the Worker: does the same line still speak (gTTS fallback)?
- set the monthly budget to 0 in KV: does it fall back with no error plate?
- one long reply (>400 chars): does it split or stay on gTTS without a gap?
- GCP billing page: does the month read $0.00 after the smoke?
```

---

## 9. Risks / unverified

- **Cantonese quality is unverified.** Google lists `yue-HK` as Preview for
  Chirp 3 HD; we have not heard it. The audition is mandatory.
- **Speaker change is real.** Chirp ≠ WanLung / HiuMaan / HiuGaai; the picker
  copy and the HD badge must say so.
- **Pause markup does not work for `yue-HK`** (docs exception), so the emotion
  plan cannot rely on `[pause]`. SSML `<break>` still needs an audition.
- **KV counter is not atomic.** The GCP 33k/day quota is the real ceiling;
  worst-case bill under $1.
- **Billing must be enabled** even for the free tier. That is a recurring-risk
  setup, not a one-time purchase; the guard is what makes it safe.
- **Privacy copy** should name Google Cloud TTS as a processor; the app already
  sends text to Google Translate (gTTS) and Edge, but this is a new endpoint.
- **Latency**: a sync Chirp request may add 0.5–1 s before audio. If the phone
  smoke shows a noticeable pause, lower the timeout or put Chirp after gTTS for
  chat and keep it first only for card/voice previews.
- **Preview locale status**: `yue-HK` and Punjabi are called out as Preview in
  Google's language table; Preview features can change without notice.
