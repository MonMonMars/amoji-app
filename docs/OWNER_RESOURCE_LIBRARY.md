# Owner resource library (canonical)

**Purpose:** Single record of owner-supplied free assets — SFX, idle VRMA/RPM/Quaternius, cast VRMs, TTS voices, music/performance motion — so agents **use** them instead of inventing replacements.

**Machine-readable index:** `apps/web/lib/owner-resource-manifest.ts` (`buildOwnerResourceIndex()`, re-exports)  
**JSON export:** `docs/owner-resource-manifest.json` — regenerate: `node scripts/generate-owner-resource-manifest.mjs`  
**Manifest version:** `2026-11-16-owner-resource-v1`  
**Mistakes / churn:** [`MISTAKE_LIBRARY.md`](./MISTAKE_LIBRARY.md)  
**Prefs / keys:** [`DATA_ORGANIZATION.md`](./DATA_ORGANIZATION.md)  
**Human mirror (artifacts):** `/opt/cursor/artifacts/owner-resource-library.md`

## Standing rule (agents)

Before swapping defaults for poke SFX, idle rail, cast, TTS speakers, or sing/dance clips:

1. Read this doc.
2. Import from `owner-resource-manifest.ts` (do not fork parallel catalogs).
3. If the owner supplied a new asset, **append here** and wire or mark `record-only` / `optional`.

Same rule is logged in [`../OWNER_REQUEST_LOG.md`](../OWNER_REQUEST_LOG.md).

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

### Archive / deleted

See `SFX_WANT_LIST.md` and manifest re-exports `OWNER_CMA_ARCHIVE` / `OWNER_CMA_DELETE`.

---

## 2. Idle motion — VRMA / RPM / Quaternius / Mixamo

| Field | Value |
|-------|-------|
| Curated chat rail | `CHAT_IDLE_CURATED` in `idle-curated-rail.ts` (39 buttons) |
| Full numbered library | `IDLE_LIBRARY` in `idle-library.ts` |
| Owner prefs | `amoji.idleEnabled.v6` · `amoji.idlePick.v6` (`idle-owner-migrate.ts`) |
| Default fresh enable | Rail **#6** `IdleQuaterniusHuman` — owner enables override (#432) |
| Retired / toxic | `idle-retired.ts` |

**Used by:** `CompanionCanvas.tsx`, `chat-auto-idle.ts`, `idle-enabled.ts`, `idle-pick.ts`.

---

## 3. Characters / models — Want cast

| Field | Value |
|-------|-------|
| Release | `free-library-want-2026-10-12` |
| SoT | `characters-want.ts` ← `want-roster.json` |
| Frozen CC0 | `a14-vivi`, `a16-vita`, `a17-victoria-rubin` — never re-export |

---

## 4. Voice / TTS

| Field | Value |
|-------|-------|
| Live chain | `tts-chain.ts`: edge → gtts → speechSynthesis |
| Catalog | `voice-catalog.ts` |
| Optional / hold | `HELD_GPU_ENGINES`, CosyVoice spike #20 — **not default** |

---

## 5. Music / sing / dance audio

| Field | Value |
|-------|-------|
| Files | `public/audio/{dance,song-bed,sing-female,sing-male}/` |
| Catalog | `performance-clips.ts` |
| Used by | `music.ts` |

---

## 6. Performance body motion

`performance-motion.ts` · `content-motion.ts` · deferred VRMA in `DEFERRED_DANCE_VRMA.md`.

---

## 7. Row schema (manifest `entries[]`)

Each machine-readable row:

| Field | Meaning |
|-------|---------|
| `type` | `cma-poke-sfx`, `idle-vrma`, `character-vrm`, `voice-*`, `music-*`, `tts-optional` |
| `id` | Stable id (`CMA00350`, clipId, character id, voice id, …) |
| `pathOrUrl` | Public path or release URL |
| `usedBy` | Modules that must stay in sync |
| `status` | `wired` · `archive` · `optional` · `unused` · `record-only` |

---

## Change log

| Date (UTC) | Change |
|------------|--------|
| 2026-11-16 | Canonical library + `owner-resource-manifest.ts` + JSON export (owner: organize free resources) |