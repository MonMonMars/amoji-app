# Owner resource library (canonical)

**Purpose:** Single record of owner-supplied free assets — SFX, idle VRMA/RPM/Quaternius, cast VRMs, TTS voices, music/performance motion — so agents **use** them instead of inventing replacements.

**Machine-readable index:** `apps/web/lib/owner-resource-manifest.ts` (`buildOwnerResourceIndex()`, re-exports)  
**Manifest version:** `2026-11-16-owner-resource-v1`  
**Human mirror (artifacts):** `/opt/cursor/artifacts/owner-resource-library.md`

## Standing rule (agents)

Before swapping defaults for poke SFX, idle rail, cast, TTS speakers, or sing/dance clips:

1. Read this doc.
2. Import from `owner-resource-manifest.ts` (do not fork parallel catalogs).
3. If the owner supplied a new asset, **append here** and wire or mark `record-only` / `optional`.

Same rule is logged in `/cursor/stores/self/OWNER_REQUEST_LOG.md`.

---

## Quick index

| Domain | SoT in code | Owner doc | Status |
|--------|-------------|-----------|--------|
| Poke CMA SFX Want #1–23 | `cma-reaction-gallery.ts` · `voice-clips.ts` | `docs/SFX_WANT_LIST.md` | **wired** |
| Idle chat rail #1–39 | `idle-curated-rail.ts` | `apps/web/docs/idle-library-numbers.md` | **wired** |
| Idle full library # | `idle-library.ts` | same | **wired** (playable subset) |
| Want cast (46 VRMs) | `characters-want.ts` · `want-roster.json` | `docs/MODELS.md` · release tag | **wired** |
| Edge + gTTS voices | `voice-catalog.ts` · `voice-capability.ts` | `docs/TTS_PIPELINE.md` | **wired** |
| Pitch tiers | `gtts-timbre.ts` · `voice.ts` | tests `voice-pitch-buttons` | **wired** |
| Sing/dance CC0 audio | `performance-clips.ts` | `public/audio/LIBRARY.md` | **wired** |
| Dance/sing body motion | `performance-motion.ts` | `public/models/anims/DEFERRED_DANCE_VRMA.md` | **wired** (partial VRMA) |
| Optional GPU/NC TTS | `HELD_GPU_ENGINES` · `SKIPPED_ENGINES` | spikes below | **optional** |
| Product rules | — | `docs/USER_PRODUCT_BIBLE.md` | **record-only** |

---

## 1. Poke SFX — CMA reaction pack

| Field | Value |
|-------|-------|
| Type | `cma-poke-sfx` |
| Assets | `apps/web/public/voice-clips/cma-reaction/CMA00*.mp3` |
| UI | `/sfx-gallery` · localStorage `amoji.cmaReactionSfx.picks.v1` |
| Used by | `voice-clips.ts` (`RECORDED_POKE_ZONE`, `recordedPokeClip`) · `cma-reaction-gallery.ts` |
| Owner map | [`SFX_WANT_LIST.md`](./SFX_WANT_LIST.md) |

### Want (wired zone defaults)

| Owner # | ID | Used by zones (female unless noted) |
|--------:|-----|-------------------------------------|
| 3 | `CMA00350` | torso, foot |
| 4 | `CMA00351` | chest, breast, default |
| 7 | `CMA00354` | head, arms |
| 9 | `CMA00359` | gasp contexts |
| 10 | `CMA00360` | back |
| 11 | `CMA00363` | belly |
| 12 | `CMA00364` | hands |
| 13 | `CMA00365` | side |
| 14 | `CMA00366` | butt, legs |
| 15 | `CMA00318` | **all male zones** |

**Status:** wired · seeded on first visit via `CMA_REACTION_OWNER_WANT_CODES` (tests: `owner-picks-win.test.ts`, `owner-resource-manifest.test.ts`).

### Archive (record + gallery, not zone defaults)

`CMA00320`, `CMA00335`, `CMA00353` — Want-pick only.

### Deleted (do not re-ship)

See `SFX_WANT_LIST.md` and `CMA_REACTION_OWNER_DELETE_CODES` in manifest.

### Gallery notes

`apps/web/docs/cma-reaction-sfx-gallery.md`

---

## 2. Idle motion — VRMA / RPM / Quaternius / Mixamo

| Field | Value |
|-------|-------|
| Curated chat rail | `CHAT_IDLE_CURATED` in `idle-curated-rail.ts` (39 buttons) |
| Full numbered library | `IDLE_LIBRARY` in `idle-library.ts` |
| Owner prefs | `amoji.idleEnabled.v6` · `amoji.idlePick.v6` (`idle-owner-migrate.ts`) |
| Default fresh enable | Rail **#6** `IdleQuaterniusHuman` (`defaultCuratedRailNums`) — owner enables override (#432) |
| Retired / toxic | `idle-retired.ts` — e.g. `IdleBreathCalm`, `IdleSassy` banned from auto |

### Curated rail (wired — each row must be playable)

| Rail # | clipId | Category | Legacy lib # |
|-------:|--------|----------|-------------:|
| 1 | IdleBreathCalm | breathe | 1 |
| 2 | StandardIdle | breathe | 2 |
| 3 | IdleMixamoBreathing | breathe | 40 |
| 4 | IdleNeutral | breathe | 33 |
| 5 | IdleRpmFStanding001 | breathe | 42 |
| 6 | IdleQuaterniusHuman | breathe | 39 |
| 7–39 | (see `idle-curated-rail.ts`) | look/think/stretch/sing/dance/martial/react | … |

**Used by:** `CompanionCanvas.tsx`, `chat-auto-idle.ts`, `idle-enabled.ts`, `idle-pick.ts`.

**Owner references:** Quaternius UAL (CC0), Ready Player Me standing variants, Mixamo breathing/stretch, KayKit `lib_C*`, Innerscene Sam idle.

**Pixel review:** `apps/web/docs/idle-pixel-review.md`

---

## 3. Characters / models — Want cast

| Field | Value |
|-------|-------|
| Release | `free-library-want-2026-10-12` (`WANT_CAST_RELEASE`) |
| SoT | `apps/web/lib/characters-want.ts` (generated from `want-roster.json`) |
| VRM URLs | GitHub release assets + `models/want/*.vrm` |
| Count | 44 entries in `CHARACTERS_WANT` |
| Frozen CC0 | `a14-vivi`, `a16-vita`, `a17-victoria-rubin` — never re-export |

**Used by:** `prefs.ts` cast, select page, `CompanionCanvas` model load.

**Shortlist / licensing:** `docs/MODELS.md`, `docs/ASSETS.md`, `public/models/ASSET_MANIFEST.md`

**Placeholder (owner supplied, not all in repo):** Full VRoid Hub sample downloads beyond Want release; Simon pixiv-gated exports — paste paths in `want-roster.json` + rerun `scripts/generate-want-cast.mjs`.

---

## 4. Voice / TTS

| Field | Value |
|-------|-------|
| Live chain | `tts-chain.ts`: edge → gtts → speechSynthesis |
| Catalog | `voice-catalog.ts` (`VOICE_CATALOG`) |
| UI buttons | `tts-button-registry.ts` ← `voice-capability.ts` (distinct speakers only) |
| Pitch tiers | `gtts-timbre.ts` deep/mid/bright; `voice.ts` matrix |
| Docs | `docs/TTS_PIPELINE.md` |

### Shipping (wired)

- **Edge neural ids** per locale × gender (`shipping: true` rows in `VOICE_CATALOG`).
- **gTTS** `tl` speakers + pitch tiers (default path when Edge 403s).
- **speechSynthesis** OS fallbacks.

### Optional / hold (record-only — not default)

| ID | Notes |
|----|-------|
| `cosyvoice` | USER_PRODUCT_BIBLE Hold — spike #20; GPU host, not called |
| `voxcpm2`, `qwen3-tts`, `chatterbox` (full) | `HELD_GPU_ENGINES` |
| `kokoro`, `piper`, `melotts`, `bark` | catalog stubs, weights not bundled |
| `silencio2`, `chatterbox-turbo`, `vui-nano`, `lure-tts` | EN sidecar A/B; flags default off — `apps/web/docs/silencio-2-spike.md`, `en-sfx-sidecar-ab.md` |
| `coqui`, `fish-speech`, `f5-tts` | `SKIPPED_ENGINES` (NC licenses) |

### Spike #1 Voice bake-off

Hold per bible — Edge 58-button list **removed** (`voice-catalog.ts`); use `voice-capability` only.

---

## 5. Music / sing / dance audio

| Field | Value |
|-------|-------|
| Files | `apps/web/public/audio/{dance,song-bed,sing-female,sing-male}/` |
| Catalog | `performance-clips.ts` (`PERFORMANCE_CLIPS`) |
| Credits | `public/audio/LIBRARY.md` (CC0 / public domain) |
| Demo prefs | `PREFERRED_DEMO_CLIPS` / `AVOID_DEMO_CLIPS` |
| Used by | `music.ts`, `startLibraryPerformance` |

**Owner soft-weights:** Twinkle, Silent Night, lullaby beds — see `performance-clips.ts` comments.

---

## 6. Performance body motion (dance/sing VRMA)

| Field | Value |
|-------|-------|
| SoT | `performance-motion.ts` |
| Tags | `C112`–`C128`, `C03`, `C60`–`C62`, `C09`, `C110`–`C119`, etc. |
| BPM | `measured-bpm.ts` + `STYLE_BPM` |
| Used by | `content-motion.ts`, `CompanionCanvas` mixer timeScale |

**Deferred conversions:** `public/models/anims/DEFERRED_DANCE_VRMA.md` (FBX→VRMA backlog).

---

## 7. Docs / URLs agents should know

| Doc | Content |
|-----|---------|
| `docs/USER_PRODUCT_BIBLE.md` | Done vs Outstanding, hold spikes |
| `docs/PROJECT_STATUS.md` | PR board |
| `docs/PHONE_SMOKE.md` | Want SFX + idle verification |
| `docs/MUSIC_STREAMING.md` | No scraped streaming |
| `docs/CAST_LIGHTING.md` | MToon unify allowlist |
| `apps/web/AGENTS.md` | Next.js 16 agent rules |

---

## 8. Owner supplied but not in repo (placeholders)

Paste owner paths/URLs here when adding — do not guess.

| Resource | Owner note | Repo status |
|----------|------------|-------------|
| Bulk Quaternius/Mixamo FBX (pre-VRMA) | free-library paths in `idle-library.ts` `path` fields | Many rows `playable: false` until converted |
| CosyVoice weights / GPU endpoint | Spike #20 Hold | **not in repo** |
| Kokoro / Piper / Melo weights | MIT/Apache catalogs | **not in repo** |
| VRoid AvatarSample_F/B/C downloads | `docs/MODELS.md` tier 1 | **not committed** — owner pixiv login |
| Edge readaloud relay | 403 without proxy | code falls through to gTTS |
| Outstanding pack binaries | referenced in status docs only | list paths when owner drops files |

---

## Change log

| Date (UTC) | Change |
|------------|--------|
| 2026-11-16 | Initial canonical library + `owner-resource-manifest.ts` (owner ask: keep record and use free resources) |