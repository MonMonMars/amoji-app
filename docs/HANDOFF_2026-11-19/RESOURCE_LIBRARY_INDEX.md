# Resource library index (agent map)

**Purpose:** One landing page for where motion, voice, music, and SFX live in **MonMonMars/amoji-app** — canonical docs, TypeScript catalogs, on-disk assets, owner picker UI, and agent handoff mirrors.

**Read first:** [`OWNER_RESOURCE_LIBRARY.md`](./OWNER_RESOURCE_LIBRARY.md) (standing rule + domain detail) · machine index `apps/web/lib/owner-resource-manifest.ts` · JSON [`owner-resource-manifest.json`](./owner-resource-manifest.json) (`2026-11-18-owner-resource-v2`, 125 idle rows / 97 playable / 39 curated rail per `stats`).

**Owner picker (human review):** [`owner-resources.html`](./owner-resources.html) — Pages: [owner-resources](https://monmonmars.github.io/amoji-app/docs/owner-resources.html) · tabs `#music` `#stories` `#demo` `#news` `#poke` `#idle` · regenerate: `node scripts/generate-owner-picker-html.mjs`

**Owner code prefixes:** `CD###` master row · `MV` stream beds · `ST` stories · `DC` performance MP3s · `ID` idle · `PK` poke · `PH` demo phase · `NW` news · `CMA` recorded poke SFX — registry: `apps/web/lib/owner-catalog-registry.ts`

---

## Canonical documentation

| Doc | Role |
|-----|------|
| [`OWNER_RESOURCE_LIBRARY.md`](./OWNER_RESOURCE_LIBRARY.md) | SoT human library — wired vs optional, Want maps, CC0 cast freeze list |
| [`owner-resource-manifest.json`](./owner-resource-manifest.json) | Exported manifest (`cmaWant` / `cmaArchive` / `cmaDelete`, idle rows, cast ids) |
| [`DATA_ORGANIZATION.md`](./DATA_ORGANIZATION.md) | localStorage keys (`amoji.idleEnabled.v6`, `amoji.cmaReactionSfx.picks.v1`, `amoji.ownerPerfPicks.v1`, …) |
| [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) | PR board — vault trains #499–#507, music/perf milestones |
| [`AGENT_SMOKE.md`](./AGENT_SMOKE.md) | `npm run verify:live` / `verify:agent-smoke` after Pages deploy |
| [`PHONE_SMOKE.md`](./PHONE_SMOKE.md) | Owner-only Want SFX + idle verification rows |
| [`SFX_WANT_LIST.md`](./SFX_WANT_LIST.md) | CMA poke SFX Want # ↔ zone wiring |
| [`TTS_PIPELINE.md`](./TTS_PIPELINE.md) | Edge → gTTS → speechSynthesis chain |
| [`MUSIC_STREAMING.md`](./MUSIC_STREAMING.md) | Mixkit + CC0/PD only — no scraped streaming |
| [`SING_DANCE_PIPELINE.md`](./SING_DANCE_PIPELINE.md) | Performance chip → audio + VRMA |
| [`ASSETS.md`](./ASSETS.md) / [`MODELS.md`](./MODELS.md) | License pipeline · Want cast shortlist |
| [`MISTAKE_LIBRARY.md`](./MISTAKE_LIBRARY.md) | Churn patterns agents must not repeat |
| `apps/web/docs/idle-library-numbers.md` | Rail # ↔ `clipId` |
| `apps/web/docs/cma-reaction-sfx-gallery.md` | `/sfx-gallery` operator notes |
| `apps/web/docs/idle-pixel-review.md` | Idle motion QA |
| `apps/web/public/audio/LIBRARY.md` | CC0 sing/dance/bed credits table |
| `apps/web/public/models/anims/DEFERRED_DANCE_VRMA.md` | FBX→VRMA backlog |
| `docs/amoji-public-serve/**` | Pages deploy mirror of `public/` asset docs |

---

## Regenerate / audit scripts

| Script | Output |
|--------|--------|
| `scripts/generate-owner-resource-manifest.mjs` | `docs/owner-resource-manifest.json` |
| `scripts/generate-owner-picker-html.mjs` | `docs/owner-resources.html` · optional `/opt/cursor/artifacts/owner-catalog-codes-pixel.tsv` |
| `scripts/generate-owner-picker-move-previews.mjs` | Gap audit for `public/animations/owner-picker-previews/*.gif` |

**Tests (spot-check catalogs):** `apps/web/tests/owner-resource-manifest.test.ts` · `owner-catalog-registry.test.ts` · `music-catalog.test.ts` · `performance-clips.test.ts` · `voice-catalog.test.ts`

---

## Agent artifacts (`/opt/cursor/artifacts`)

Not in git — walkthroughs, handoffs, and TSV exports from prior agent runs.

| Artifact | Content |
|----------|---------|
| `owner-resource-library.md` | Human mirror of `OWNER_RESOURCE_LIBRARY.md` |
| `owner-catalog-codes-pixel.tsv` | Pixel export of owner catalog codes (regen with picker HTML) |
| `code-tour-author-handoff.md` | Recent turn handoff (`<decision>` / `<risk>` / `<verified>`) |
| `music-instant-play-handoff.md` | Music playback train notes |
| `news-long-body-handoff.md` | News long-read scrub handoff |
| `mv069-mv098-pixel-handoff.tsv` | MV069–MV098 vault picker export |
| `st-story-codes-pixel.txt` / `st038-story-catalog.txt` | Story vault codes |
| `open-prs-payload.json` | PR coordinator payloads when MCP PR tools unavailable |
| `owner-picker-commit-bundle/` | Snapshot bundle (manifest, picker HTML, tests) |
| `owner-audio-patch/` | Staged patches for picker audio columns |
| `*.log` / `*.png` / `*.mp4` | CI, vitest, and UI proof from resource-library PR trains |

---

## Motion

Idle loops, dance/sing body VRMA, poke reactions, performance tags, and picker GIF previews.

| Kind | Source of truth | On-disk / UI | Codes / scale |
|------|-----------------|--------------|---------------|
| **Idle curated rail** | `apps/web/lib/idle-curated-rail.ts` (`CHAT_IDLE_CURATED`, 39 buttons) | `CompanionCanvas` · `chat-auto-idle.ts` | Rail **#1–39** → `clipId` |
| **Idle full library** | `apps/web/lib/idle-library.ts` (`IDLE_LIBRARY`) | `apps/web/public/models/anims/*.vrma` (**~145** `.vrma` in tree) | Manifest **127** clip rows · **97** playable · owner refs `idle-owner-ref-catalog.ts` **`ID###`** |
| **Idle retired / toxic** | `apps/web/lib/idle-retired.ts` | — | e.g. `IdleBreathCalm`, `IdleSassy` banned from auto |
| **Owner idle prefs** | `idle-owner-migrate.ts` · `idle-pick.ts` · `idle-enabled.ts` | keys `amoji.idleEnabled.v6` · `amoji.idlePick.v6` | Default fresh rail **#6** `IdleQuaterniusHuman` |
| **Dance/sing body** | `apps/web/lib/performance-motion.ts` | VRMA tags `C112`–`C128`, KayKit `lib_C*`, … | `content-motion.ts` · `measured-bpm.ts` |
| **Emotion / gesture moves** | `apps/web/lib/moves.ts` | Recovered handoff performance clips (r110) | `CompanionCanvas.tsx` |
| **Poke body routing** | `apps/web/lib/poke-zones.ts` | — | **`PK###`** rows in picker |
| **Cast / VRM** | `characters-want.ts` ← `want-roster.json` | `models/want/` · release `free-library-want-2026-10-12` | **46** Want ids in manifest · frozen CC0: `a14-vivi`, `a16-vita`, `a17-victoria-rubin` |
| **Picker motion GIFs** | `scripts/generate-owner-picker-move-previews.mjs` | `apps/web/public/animations/owner-picker-previews/` (**37** GIFs) | Quaternius / RPM / Mixamo / KayKit previews |
| **Deferred FBX** | `idle-library.ts` `path` fields | `public/models/anims/DEFERRED_DANCE_VRMA.md` | Many rows `playable: false` until convert |

**CC0 motion sources (named in owner doc):** Quaternius UAL, Ready Player Me standing variants, Mixamo breathing/stretch, KayKit `lib_C*`, Innerscene Sam idle.

---

## Voice

TTS chain, UI speaker matrix, recorded reaction clips, poke **lines** (not CMA SFX), and per-locale MP3 banks.

| Kind | Source of truth | Docs / assets | Notes |
|------|-----------------|---------------|-------|
| **Live TTS chain** | `apps/web/lib/tts-chain.ts` | [`TTS_PIPELINE.md`](./TTS_PIPELINE.md) | edge → gTTS → `speechSynthesis` |
| **Speaker catalog** | `voice-catalog.ts` (`VOICE_CATALOG`) | — | Shipping `shipping: true` Edge rows per locale |
| **UI buttons (no 58-edge bloat)** | `tts-button-registry.ts` ← `voice-capability.ts` | tests `voice-pitch-buttons` | Edge list trimmed — capability SoT |
| **Pitch / gender tiers** | `gtts-timbre.ts` · `voice.ts` | `USER_PRODUCT_BIBLE.md` | deep / mid / bright |
| **Card / chat voice clips** | `apps/web/lib/voice-clips.ts` | `public/voice-clips/**` (**~204** MP3) | `en` · `ja` · `zh` · `yue` · `universal` × gender |
| **Poke TTS line bank** | `personality-voice.ts` | picker **PK** section | Distinct per character tag — not CMA files |
| **Optional GPU / NC engines** | `HELD_GPU_ENGINES` · `SKIPPED_ENGINES` in manifest | `silencio-2-spike.md` · `en-sfx-sidecar-ab.md` | CosyVoice Hold · Kokoro/Piper stubs — **not bundled** |
| **Attribution** | — | `public/voice-clips/ATTRIBUTION.md` · `cma-reaction/ATTRIBUTION.md` | Pages mirror under `docs/amoji-public-serve/voice-clips/` |

---

## Music

Stream beds (Mixkit CDN), local CC0 performance library, vault expansions, and owner perf pins.

| Kind | Source of truth | License / delivery | Codes / scale |
|------|-----------------|-------------------|---------------|
| **Core stream catalog** | `music-catalog.ts` (`STREAM_TRACKS`) | Mixkit-Free · legacy `mix-*` rows | Merged with vault below |
| **J-pop vault** | `music-jpop-vault.ts` | Mixkit preview URLs (not committed MP3) | **`MV039`–`MV068`** (30) |
| **J-pop vault v2** | `music-jpop-vault-v2.ts` | Mixkit | **`MV069`–`MV083`** (15) |
| **US pop vault** | `music-us-pop-vault.ts` | Mixkit | **`MV084`–`MV098`** (15) |
| **World / lofi vault** | `music-world-vault.ts` | Mixkit | **`MV099`–`MV118`** (20) |
| **MV registry guard** | `music-mv-registry.ts` | — | **80** owner vault rows · highest **`MV118`** |
| **Local CC0 performance audio** | `performance-clips.ts` (`PERFORMANCE_CLIPS`) | CC0-1.0 / PD | **`DC###`** · files under `public/audio/` |
| **On-disk MP3 tree** | — | [`public/audio/LIBRARY.md`](../apps/web/public/audio/LIBRARY.md) | **82** MP3: `dance/` · `song-bed/` · `sing-female/` · `sing-male/` |
| **Demo rotation bias** | `PREFERRED_DEMO_CLIPS` / `AVOID_DEMO_CLIPS` | Twinkle, Silent Night, lullaby first | deprioritize overtone / 1s SFX beds |
| **Owner listen/sing pins** | `owner-perf-picks.ts` · `data/owner-perf-selection.json` | key `amoji.ownerPerfPicks.v1` | `listenMvCodes` · `songClipIds` |
| **Ask routing** | `music-ask.ts` | — | dance → streams · song → local vocal clips |
| **Allowlist gate** | `performance-music-allowlist.ts` | — | Only approved MV + CC0 clips play |
| **BPM map** | `public/audio/bpm-map.json` | — | Beat sync helpers |
| **Stories (spoken)** | `classic-fairy-tales.ts` · `story-catalog.ts` | PD fairy tales | **`ST001`–`ST038`** (picker Stories tab) |

---

## SFX

Recorded poke reactions, UI foley, and gallery Want/Skip — distinct from TTS and from music beds.

| Kind | Source of truth | On-disk | Wiring |
|------|-----------------|---------|--------|
| **CMA poke reaction pack** | `cma-reaction-gallery.ts` | `public/voice-clips/cma-reaction/CMA00*.mp3` (**13** files in tree) | `/sfx-gallery` · `RECORDED_POKE_ZONE` in `voice-clips.ts` |
| **CMA Want (zone defaults)** | manifest `cmaWant` | e.g. `CMA00350`–`CMA00366`, male `CMA00318` | [`SFX_WANT_LIST.md`](./SFX_WANT_LIST.md) |
| **CMA archive** | manifest `cmaArchive` | `CMA00320`, `CMA00335`, `CMA00353` | Gallery only |
| **CMA delete (never re-ship)** | manifest `cmaDelete` | — | `CMA_REACTION_OWNER_DELETE_CODES` |
| **Prefs** | `client-storage.ts` | `amoji.cmaReactionSfx.picks.v1` | Seeded `CMA_REACTION_OWNER_WANT_CODES` |
| **Movement / UI foley** | `apps/web/lib/sfx.ts` | procedural / hold windows | UI click, ambient, voice-hold coordination |
| **Mixkit reaction alternates** | `public/voice-clips/universal/female/wow_*.mp3` | ATTRIBUTION | A/B with recorded CMA |

---

## Other catalog modules (non-audio motion domains)

| Module | Path | Picker prefix |
|--------|------|---------------|
| Demo phase chips | `demo-phase.ts` | **PH** |
| News feeds / AI templates | `owner-news-catalog.ts` | **NW** |
| Minigames | `minigames/catalog.ts` | — |
| Modular scenes | `modular/catalog.ts` | — |
| Systems / legal map | `systems-catalog.ts` | — |
| Emotion core (package) | `packages/emotion-core/src/catalog.ts` | — |
| Backend catalog | `server/backend/src/catalog.ts` | — |
| Legacy HTML catalogs | `apps/web/public/catalog.html` · `dev-pages/catalog.html` | notes missing remote handoff zips (section D) |

---

## Top finds (start here)

1. **`docs/OWNER_RESOURCE_LIBRARY.md`** — canonical rules; do not fork parallel catalogs.
2. **`docs/owner-resources.html`** + **`owner-catalog-registry.ts`** — every keep/cut decision maps to **`CD###`** / domain codes.
3. **`docs/owner-resource-manifest.json`** — machine snapshot (CMA lists, cast ids, idle stats).
4. **`apps/web/lib/idle-library.ts`** + **`idle-curated-rail.ts`** — 39-button rail vs full numbered library.
5. **`apps/web/lib/performance-clips.ts`** + **`public/audio/LIBRARY.md`** — CC0 sing/dance/beds on disk.
6. **`apps/web/lib/music-mv-registry.ts`** + vault `music-*-vault.ts` — **MV039–MV118** Mixkit owner vault.
7. **`cma-reaction-gallery.ts`** + **`SFX_WANT_LIST.md`** — poke SFX zones.
8. **`voice-capability.ts`** + **`TTS_PIPELINE.md`** — shipping speakers only.
9. **`/opt/cursor/artifacts/owner-resource-library.md`** + **`owner-catalog-codes-pixel.tsv`** — agent mirrors.
10. **`docs/AGENT_SMOKE.md`** + **`PROJECT_STATUS.md`** — live revision + merged vault PR pointers.

---

## Repo grep cheat sheet

| Search | Typical hits |
|--------|----------------|
| `handoff` | `revision.ts` r110 zip recovery · `moves.ts` · `catalog.html` section D |
| `vault` | `music-*-vault.ts` · `PROJECT_STATUS.md` #499–#502 · picker Music tab |
| `CC0` | `performance-clips.ts` · `LIBRARY.md` · `OWNER_RESOURCE_LIBRARY.md` cast freeze |
| `catalog` | `owner-catalog-registry.ts` · `music-catalog.ts` · `voice-catalog.ts` · `story-catalog.ts` |
| `inventory` | artifact logs (`voice-sound-inventory-verify.log`); no committed `VOICE_SOUND_INVENTORY.md` on this branch |

---

*Last compiled for branch `cursor/resource-library-index-0340-0eac` — counts from workspace file tree (MP3/VRMA/GIF `find` + manifest JSON `stats`).*