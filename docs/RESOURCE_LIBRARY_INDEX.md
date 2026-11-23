# Resource library index (agent map)

**Measured at:** `origin/main` `2a42e2c7` · **`APP_REVISION`** `r2026-11-19.285` · 2026-11-23.

**Purpose:** One landing page for where motion, voice, music, and SFX live in **MonMonMars/amoji-app** — canonical docs, TypeScript catalogs, on-disk assets, owner picker UI, and the scripts that regenerate them.

**Read first:** [`OWNER_RESOURCE_LIBRARY.md`](./OWNER_RESOURCE_LIBRARY.md) (standing rule + domain detail) · machine index `apps/web/lib/owner-resource-manifest.ts` · JSON [`owner-resource-manifest.json`](./owner-resource-manifest.json).

**Owner picker (human review):** [`owner-resources.html`](./owner-resources.html) — Pages: [owner-resources](https://monmonmars.github.io/amoji-app/docs/owner-resources.html) · tabs `#music` `#stories` `#demo` `#news` `#poke` `#idle` · regenerate: `node scripts/generate-owner-picker-html.mjs`

**Owner code prefixes:** `CD###` master row · `MV` stream beds · `ST` stories · `DC` performance MP3s · `ID` idle · `PK` poke · `PH` demo phase · `NW` news · `CMA` recorded poke SFX — registry: `apps/web/lib/owner-catalog-registry.ts`

---

## Measured counts (r285)

Every row below was re-derived from the repo at `2a42e2c7`, not copied from an older board.

| Count | Value | Source of truth |
|-------|-------|-----------------|
| Idle library rows | **133** | `apps/web/lib/idle-library.ts` `IDLE_LIBRARY.length` |
| Idle playable (playable and not retired) | **105** | `IDLE_LIBRARY.filter((e) => e.playable && !e.retired).length` |
| Idle curated rail buttons | **39** | `apps/web/lib/idle-curated-rail.ts` `CHAT_IDLE_CURATED.length` |
| `.vrma` files under `apps/web/public/models/anims` | **153** | file tree |
| Picker motion GIFs | **37** | `apps/web/public/animations/owner-picker-previews/*.gif` |
| MP3 under `apps/web/public/voice-clips` | **215** | file tree |
| CMA reaction MP3 files | **13** | `apps/web/public/voice-clips/cma-reaction/*.mp3` |
| MP3 under `apps/web/public/audio` | **82** | file tree |
| Performance clips (`DC` codes) | **82** | `apps/web/lib/performance-clips.ts` `PERFORMANCE_CLIPS.length` |
| Owner MV vault rows | **80** | `apps/web/lib/music-mv-registry.ts` — 60 core `MV039`-`MV098` + 20 world `MV099`-`MV118` |
| Highest MV owner code | **MV118** | `music-mv-registry.ts` `HIGHEST_MV_OWNER_CODE` |
| Story codes | **38** (`ST001`-`ST038`) | `apps/web/lib/story-catalog.ts` `STORY_CATALOG_COUNT()` / `highestStoryOwnerCode()` |
| CMA want / archive / delete | **10 / 3 / 10** | `apps/web/lib/cma-reaction-gallery.ts` code arrays, mirrored in the manifest JSON |
| Want cast character ids | **44** (3 frozen CC0) | manifest JSON `wantCharacterIds` / `frozenCc0CharacterIds` |
| Manifest index entries | **633** | manifest JSON `entries.length` |

**Caveat on the JSON manifest `stats`:** [`owner-resource-manifest.json`](./owner-resource-manifest.json) currently reports `version` `2026-11-18-owner-resource-v3`, `generatedAt` `2026-11-22T09:42:47Z`, and `stats` `{ total: 126, playable: 98, curatedRail: 39 }`. That snapshot predates 7 idle rows now present in `IDLE_LIBRARY` (133 / 105 / 39). The JSON `stats` block is therefore a **last measured at 2026-11-22** figure, not the current count. Regenerate with `node scripts/generate-owner-resource-manifest.mjs` before quoting it.

Re-measure any figure above:

```bash
# on-disk trees
find apps/web/public/models/anims -name '*.vrma' | wc -l
find apps/web/public/animations/owner-picker-previews -name '*.gif' | wc -l
find apps/web/public/voice-clips -name '*.mp3' | wc -l
find apps/web/public/audio -name '*.mp3' | wc -l
# code-derived counts (any TS runner; values are the ones tabled above)
node scripts/generate-owner-resource-manifest.mjs   # rewrites the JSON + stats block
```

Frozen copies of this document under `docs/HANDOFF_2026-11-19/` and `docs/HANDOFF_2026-11-21/` carry older counts and must not be treated as current.

---

## Canonical documentation

| Doc | Role |
|-----|------|
| [`OWNER_RESOURCE_LIBRARY.md`](./OWNER_RESOURCE_LIBRARY.md) | SoT human library — wired vs optional, Want maps, CC0 cast freeze list |
| [`owner-resource-manifest.json`](./owner-resource-manifest.json) | Exported manifest (`cmaWant` / `cmaArchive` / `cmaDelete`, idle stats, cast ids) |
| [`DATA_ORGANIZATION.md`](./DATA_ORGANIZATION.md) | localStorage keys (`amoji.idleEnabled.v6`, `amoji.cmaReactionSfx.picks.v1`, `amoji.ownerPerfPicks.v1`, ...) |
| [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) | PR board — merged trains and milestone pointers |
| [`AGENT_SMOKE.md`](./AGENT_SMOKE.md) | `npm run verify:live` / `verify:agent-smoke` after Pages deploy |
| [`PHONE_SMOKE.md`](./PHONE_SMOKE.md) | Owner-only Want SFX + idle verification rows |
| [`SFX_WANT_LIST.md`](./SFX_WANT_LIST.md) | CMA poke SFX Want # to zone wiring |
| [`TTS_PIPELINE.md`](./TTS_PIPELINE.md) | Edge to gTTS to speechSynthesis chain |
| [`MUSIC_STREAMING.md`](./MUSIC_STREAMING.md) | Mixkit + CC0/PD only — no scraped streaming |
| [`SING_DANCE_PIPELINE.md`](./SING_DANCE_PIPELINE.md) | Performance chip to audio + VRMA |
| [`ASSETS.md`](./ASSETS.md) / [`MODELS.md`](./MODELS.md) | License pipeline · Want cast shortlist |
| [`MISTAKE_LIBRARY.md`](./MISTAKE_LIBRARY.md) | Churn patterns agents must not repeat |
| [`VOICE_SOUND_INVENTORY.md`](./VOICE_SOUND_INVENTORY.md) | Voice / sound inventory |
| `apps/web/docs/idle-library-numbers.md` | Rail # to `clipId` map |
| `apps/web/public/models/anims/IDLE_NUMBERED_MAP.md` | Numbered idle map on disk |
| `apps/web/docs/cma-reaction-sfx-gallery.md` | `/sfx-gallery` operator notes |
| `apps/web/docs/idle-pixel-review.md` | Idle motion QA |
| `apps/web/public/audio/LIBRARY.md` | CC0 sing / dance / bed credits table |
| `apps/web/public/models/anims/DEFERRED_DANCE_VRMA.md` | FBX to VRMA backlog |

`docs/amoji-public-serve` is a **local-only** symlink to `apps/web/public` so the repo copy of `owner-resources.html` resolves preview paths when served from `docs/` with a plain static server. `apps/web/scripts/store-bundle.mjs` rewrites `amoji-public-serve/` to `../` on Postbuild copy into `apps/web/out/docs/`; the symlink itself must never ship to Pages.

---

## Regenerate / audit scripts

| Script | Output |
|--------|--------|
| `scripts/generate-owner-resource-manifest.mjs` | `docs/owner-resource-manifest.json` |
| `scripts/generate-owner-picker-html.mjs` | `docs/owner-resources.html` (writer: `scripts/owner-picker-html-writer.ts`) |
| `scripts/generate-owner-picker-move-previews.mjs` | Gap audit for `apps/web/public/animations/owner-picker-previews/*.gif` |
| `apps/web/scripts/store-bundle.mjs` | Copies `docs/*.html` into `apps/web/out/docs/` and rewrites preview paths |

**Tests (spot-check catalogs):** `apps/web/tests/owner-resource-manifest.test.ts` · `owner-catalog-registry.test.ts` · `music-catalog.test.ts` · `performance-clips.test.ts` · `voice-catalog.test.ts` · `voice-pitch-buttons.test.ts` · `owner-picker-html.test.ts` · `owner-picker-media.test.ts`

---

## Motion

Idle loops, dance / sing body VRMA, poke reactions, performance tags, and picker GIF previews.

| Kind | Source of truth | On-disk / UI | Codes / scale |
|------|-----------------|--------------|---------------|
| **Idle curated rail** | `apps/web/lib/idle-curated-rail.ts` (`CHAT_IDLE_CURATED`) | `CompanionCanvas` · `chat-auto-idle.ts` | **39** buttons, rail `#1`-`#39` to `clipId` |
| **Idle full library** | `apps/web/lib/idle-library.ts` (`IDLE_LIBRARY`) | `apps/web/public/models/anims/*.vrma` (**153** in tree) | **133** rows, **105** playable · owner refs `apps/web/lib/idle-owner-ref-catalog.ts` (`ID###`) |
| **Idle retired / toxic** | `apps/web/lib/idle-retired.ts` | — | e.g. `IdleBreathCalm`, `IdleSassy` banned from auto |
| **Owner idle prefs** | `idle-owner-migrate.ts` · `idle-pick.ts` · `idle-enabled.ts` | keys `amoji.idleEnabled.v6` · `amoji.idlePick.v6` | Default fresh rail `#6` `IdleQuaterniusHuman` |
| **Dance / sing body** | `apps/web/lib/performance-motion.ts` | VRMA tags `C112`-`C128`, KayKit `lib_C*` | `content-motion.ts` · `measured-bpm.ts` |
| **Emotion / gesture moves** | `apps/web/lib/moves.ts` | Recovered handoff performance clips | `CompanionCanvas.tsx` |
| **Poke body routing** | `apps/web/lib/poke-zones.ts` | — | **`PK###`** rows in picker |
| **Cast / VRM** | `apps/web/lib/characters-want.ts` (roster `apps/web/lib/want-roster.json`) | `apps/web/public/models/want/` · release `free-library-want-2026-10-12` | **44** Want ids in manifest · frozen CC0: `a14-vivi`, `a16-vita`, `a17-victoria-rubin` |
| **Picker motion GIFs** | `scripts/generate-owner-picker-move-previews.mjs` | `apps/web/public/animations/owner-picker-previews/` (**37** GIFs) | Quaternius / RPM / Mixamo / KayKit previews |
| **Deferred FBX** | `idle-library.ts` `path` fields | `public/models/anims/DEFERRED_DANCE_VRMA.md` | Rows stay `playable: false` until converted |

**CC0 motion sources (named in the owner doc):** Quaternius UAL, Ready Player Me standing variants, Mixamo breathing / stretch, KayKit `lib_C*`, Innerscene Sam idle.

---

## Voice

TTS chain, UI speaker matrix, recorded reaction clips, poke **lines** (not CMA SFX), and per-locale MP3 banks.

| Kind | Source of truth | Docs / assets | Notes |
|------|-----------------|---------------|-------|
| **Live TTS chain** | `apps/web/lib/tts-chain.ts` | [`TTS_PIPELINE.md`](./TTS_PIPELINE.md) | edge to gTTS to `speechSynthesis` |
| **Speaker catalog** | `apps/web/lib/voice-catalog.ts` (`VOICE_CATALOG`) | — | Shipping `shipping: true` Edge rows per locale |
| **UI buttons** | `apps/web/lib/tts-button-registry.ts` (from `voice-capability.ts`) | tests `voice-pitch-buttons` | Capability SoT, not a hand-written edge list |
| **Pitch / gender tiers** | `apps/web/lib/gtts-timbre.ts` · `voice.ts` | `USER_PRODUCT_BIBLE.md` | deep / mid / bright tiers |
| **Card / chat voice clips** | `apps/web/lib/voice-clips.ts` | `apps/web/public/voice-clips/**` (**215** MP3) | `en` · `ja` · `zh` · `yue` · `universal` x gender |
| **Poke TTS line bank** | `apps/web/lib/personality-voice.ts` | picker **PK** section | Distinct per character tag, not CMA files |
| **Optional GPU / NC engines** | `HELD_GPU_ENGINES` · `SKIPPED_ENGINES` in manifest | `apps/web/docs/silencio-2-spike.md` · `apps/web/docs/en-sfx-sidecar-ab.md` | CosyVoice Hold · Kokoro / Piper stubs, **not bundled** |
| **Attribution** | — | `apps/web/public/voice-clips/ATTRIBUTION.md` · `apps/web/public/voice-clips/cma-reaction/ATTRIBUTION.md` | Shipped with the static export under `out/voice-clips/` |

---

## Music

Stream beds (Mixkit CDN), local CC0 performance library, vault expansions, and owner perf pins.

| Kind | Source of truth | License / delivery | Codes / scale |
|------|-----------------|-------------------|---------------|
| **Core stream catalog** | `apps/web/lib/music-catalog.ts` (`STREAM_TRACKS`) | Mixkit-Free · legacy `mix-*` rows | Merged with the vault below |
| **J-pop vault** | `music-jpop-vault.ts` | Mixkit preview URLs (not committed MP3) | **`MV039`-`MV068`** (30) |
| **J-pop vault v2** | `music-jpop-vault-v2.ts` | Mixkit | **`MV069`-`MV083`** (15) |
| **US pop vault** | `music-us-pop-vault.ts` | Mixkit | **`MV084`-`MV098`** (15) |
| **World / lofi vault** | `music-world-vault.ts` | Mixkit | **`MV099`-`MV118`** (20) |
| **MV registry guard** | `music-mv-registry.ts` | Throws on row-count drift | **80** owner vault rows · highest **`MV118`** |
| **Local CC0 performance audio** | `apps/web/lib/performance-clips.ts` (`PERFORMANCE_CLIPS`) | CC0-1.0 / PD | **82** `DC###` rows · files under `apps/web/public/audio/` |
| **On-disk MP3 tree** | — | [`public/audio/LIBRARY.md`](../apps/web/public/audio/LIBRARY.md) | **82** MP3: `dance/` · `song-bed/` · `sing-female/` · `sing-male/` |
| **Demo rotation bias** | `apps/web/lib/owner-perf-ship-set.ts` (`PREFERRED_DEMO_CLIPS` / `AVOID_DEMO_CLIPS`) | Twinkle, Silent Night, lullaby first | Deprioritize overtone / SFX-length beds |
| **Owner listen / sing pins** | `apps/web/lib/owner-perf-picks.ts` · `apps/web/data/owner-perf-selection.json` | key `amoji.ownerPerfPicks.v1` | `listenMvCodes` · `songClipIds` |
| **Ask routing** | `apps/web/lib/music-ask.ts` | — | Dance to streams · song to local vocal clips |
| **Allowlist gate** | `apps/web/lib/performance-music-allowlist.ts` | — | Only approved MV + CC0 clips play |
| **BPM map** | `apps/web/public/audio/bpm-map.json` | — | Beat sync helpers |
| **Stories (spoken)** | `apps/web/lib/classic-fairy-tales.ts` · `story-catalog.ts` | PD fairy tales | **38** tales, **`ST001`-`ST038`** |

---

## SFX

Recorded poke reactions, UI foley, and gallery Want / Skip — distinct from TTS and from music beds.

| Kind | Source of truth | On-disk | Wiring |
|------|-----------------|---------|--------|
| **CMA poke reaction pack** | `apps/web/lib/cma-reaction-gallery.ts` | `apps/web/public/voice-clips/cma-reaction/CMA00*.mp3` (**13** files) | `/sfx-gallery` · `RECORDED_POKE_ZONE` in `voice-clips.ts` |
| **CMA Want (zone defaults)** | gallery `CMA_REACTION_OWNER_WANT_CODES` | **10** codes, e.g. `CMA00350`, `CMA00351`, `CMA00354`, `CMA00359`, `CMA00318` | [`SFX_WANT_LIST.md`](./SFX_WANT_LIST.md) |
| **CMA archive** | `CMA_REACTION_ARCHIVE_CODES` | **3**: `CMA00320`, `CMA00335`, `CMA00353` | Gallery only |
| **CMA delete (never re-ship)** | `CMA_REACTION_OWNER_DELETE_CODES` | **10** codes | Pref seeding skips them |
| **Prefs** | `client-storage.ts` | `amoji.cmaReactionSfx.picks.v1` | Seeded from the Want list |
| **Movement / UI foley** | `apps/web/lib/sfx.ts` | procedural / hold windows | UI click, ambient, voice-hold coordination |
| **Mixkit reaction alternates** | `apps/web/public/voice-clips/universal/female/wow_*.mp3` | ATTRIBUTION | A/B against recorded CMA |

---

## Other catalog modules (non-audio domains)

| Module | Path | Picker prefix |
|--------|------|---------------|
| Demo phase chips | `apps/web/lib/demo-phase.ts` | **PH** |
| News feeds / AI templates | `apps/web/lib/owner-news-catalog.ts` | **NW** |
| Minigames | `apps/web/lib/minigames/catalog.ts` | — |
| Modular scenes | `apps/web/lib/modular/catalog.ts` | — |
| Systems / legal map | `apps/web/lib/systems-catalog.ts` | — |
| Emotion core (package) | `packages/emotion-core/src/catalog.ts` | — |
| Backend catalog | `server/backend/src/catalog.ts` | — |
| Legacy HTML catalogs | `apps/web/dev-pages/catalog.html` | `apps/web/public/catalog.html` is a gitignored build artifact, not tracked source |

---

## Top finds (start here)

1. **`docs/OWNER_RESOURCE_LIBRARY.md`** — canonical rules; do not fork parallel catalogs.
2. **`docs/owner-resources.html`** + **`owner-catalog-registry.ts`** — every keep / cut decision maps to **`CD###`** or a domain code.
3. **`docs/owner-resource-manifest.json`** — machine snapshot (CMA lists, cast ids, idle stats). Check `generatedAt` before quoting `stats`.
4. **`apps/web/lib/idle-library.ts`** + **`idle-curated-rail.ts`** — 39-button rail vs the full 133-row library.
5. **`apps/web/lib/performance-clips.ts`** + **`public/audio/LIBRARY.md`** — CC0 sing / dance / bed audio on disk.
6. **`apps/web/lib/music-mv-registry.ts`** + the `music-*-vault.ts` modules — `MV039`-`MV118` Mixkit owner vault.
7. **`cma-reaction-gallery.ts`** + **`SFX_WANT_LIST.md`** — poke SFX zones.
8. **`voice-capability.ts`** + **`TTS_PIPELINE.md`** — shipping speakers only.
9. **`docs/AGENT_SMOKE.md`** + **`PROJECT_STATUS.md`** — live revision and merged vault PR pointers.

---

## Repo grep cheat sheet

| Search | Typical hits |
|--------|----------------|
| `handoff` | `revision.ts` r110 zip recovery · `moves.ts` · `catalog.html` section D |
| `vault` | `music-*-vault.ts` · `PROJECT_STATUS.md` · picker Music tab |
| `CC0` | `performance-clips.ts` · `LIBRARY.md` · `OWNER_RESOURCE_LIBRARY.md` cast freeze |
| `catalog` | `owner-catalog-registry.ts` · `music-catalog.ts` · `voice-catalog.ts` · `story-catalog.ts` |
| `inventory` | `docs/VOICE_SOUND_INVENTORY.md` · artifact logs outside the repo |

---

## Numbers that are not in this repo

Agent artifacts (walkthroughs, handoff mirrors, TSV exports, CI logs) live **outside** the repository, on the agent host, and are therefore not auditable from a clone. Nothing in this document depends on them; the counts above come from tracked files or generated files that a fresh clone can reproduce with the scripts tabled above.

---

*Compiled at `2a42e2c7` / `r2026-11-19.285`. File-tree counts are from `apps/web/public/**` at that commit; idle, performance, MV, story, and CMA counts come from the TypeScript catalogs listed in each row.*
