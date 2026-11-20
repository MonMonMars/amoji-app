# Voice / sound accountability inventory

**Generated:** 2026-11-18 (HKT)  
**Audience:** Pixel + agents — answer “where did the TTS / SFX / picker work go?”  
**Honesty rule:** Assets are **not deleted** from git. Silence or “missing” UI is usually **unmerged fix PR**, **stale service worker**, or **regression on `main`**, not lost files.

**Live canary:** [`revision.txt`](https://monmonmars.github.io/amoji-app/revision.txt) · **`main` tip:** `91a857e3` · **r2026-11-18.237** (verified curl 2026-11-18)

---

## Executive verdict (why it *feels* gone)

| Symptom | Real cause | Fix |
| --- | --- | --- |
| Card grid / greet **no sound** on phone | Regression after merged [#519](https://github.com/MonMonMars/amoji-app/pull/519); fix open [#529](https://github.com/MonMonMars/amoji-app/pull/529) | Merge **#529** then hard-refresh app |
| Male voice quiet / wrong speaker | Routing fix open [#528](https://github.com/MonMonMars/amoji-app/pull/528) | Merge **#528** (after or with #529) |
| App still “old” behaviour | Stale SW cache (common at **r220** while live is **r237**) | Amber **Refresh** chip or clear site data · confirm `revision.txt` |
| Picker previews all same GIF | Distinct previews open [#533](https://github.com/MonMonMars/amoji-app/pull/533) | Merge **#533** · hard-refresh [owner-resources](https://monmonmars.github.io/amoji-app/docs/owner-resources.html) |
| Status board out of date vs phone | Docs train + CI verify open [#531](https://github.com/MonMonMars/amoji-app/pull/531) | Merge **#531** for live HTML guards |
| “Bake-off” / CosyVoice panels missing | Spikes never merged ([#1](https://github.com/MonMonMars/amoji-app/pull/1), [#20](https://github.com/MonMonMars/amoji-app/pull/20)) — **Hold** by design | Not on `main`; production chain unchanged |

**Picker HTML on Pages:** ~1.9 MB, **18 463** lines, sections present (Music · Mixkit · Stories · Demo · News · Poke · Idle). Live grep matches repo for `owner-picker-notes-v2` / tri-state **採用** (~2050 hits) — **catalog is deployed** at r237.

---

## 1. Core TTS / voice code (`main`)

| Asset type | Location | Merged? | Live on Pages? | User / agent action |
| --- | --- | --- | --- | --- |
| Speak pipeline (poke, chat, card) | `apps/web/lib/voice.ts` | Y | Y (in app bundle) | Merge #529/#528 if silent; SW hard-refresh |
| gTTS hop | `apps/web/lib/gtts.ts` | Y | Y | — |
| Engine chain | `apps/web/lib/tts-chain.ts`, `edge-tts.ts` | Y | Y | Edge relay 403 — gTTS + synth carry load (`docs/TTS_PIPELINE.md`) |
| Voice tables | `apps/web/lib/voice-catalog.ts` (~35 k LOC) | Y | Y | 62 Edge + 19 browser rows in manifest |
| Pitch / gender | `gtts-timbre.ts`, `voice-gender.ts`, `voice-capability.ts` | Y | Y | — |
| Card audition UI | `components/TtsVoiceRow.tsx`, `VoicePicker.tsx` | Y | Y | Phone verify after #519; fix #529 |
| Recorded clips helper | `voice-clips.ts`, `play-voice-clip.ts` | Y | Y | 204× `.mp3` under `public/voice-clips/` |
| Personality poke lines | `personality-voice.ts` | Y | Y | 384 templates in picker (`#poke` PK rows) |
| Docs map | `docs/TTS_PIPELINE.md` | Y | Y (`docs/`) | — |

### Merged voice PRs (recent, on `main`)

| PR | What shipped |
| --- | --- |
| [#519](https://github.com/MonMonMars/amoji-app/pull/519) | Card audition all langs **r228** (`haltBrowserSynth` path) |
| [#511](https://github.com/MonMonMars/amoji-app/pull/511) | News stream + TTS scrub **r218** |
| [#515](https://github.com/MonMonMars/amoji-app/pull/515) | Instant music/song beds **r220** |
| [#489](https://github.com/MonMonMars/amoji-app/pull/489)+ | Poke / card voice loop fixes, gate sound test, pitch tiers (see `git log --grep=voice`) |

### Open voice PRs (stranded **fixes**, not lost work)

| PR | Branch hint | Merged? | Live? | Action |
| --- | --- | --- | --- | --- |
| [#529](https://github.com/MonMonMars/amoji-app/pull/529) | `cursor/card-voice-*` | **N** | **N** | **Merge first** — card silent regression |
| [#528](https://github.com/MonMonMars/amoji-app/pull/528) | `cursor/voice-all-langs-*` | **N** | **N** | Merge — main speaker + male gTTS |
| [#521](https://github.com/MonMonMars/amoji-app/pull/521) | no-repeat checklist | **N** | partial | Extends `AGENT_SMOKE.md` locks |
| [#1](https://github.com/MonMonMars/amoji-app/pull/1) | voice bake-off UI | **N** | **N** | Hold — spike only |
| [#20](https://github.com/MonMonMars/amoji-app/pull/20) | CosyVoice | **N** (draft) | **N** | Hold — optional server |

Many remote branches (`origin/cursor/card-voice-*`, `voice-*`, `gtts-*`) are **historical PR heads**; code either merged or superseded by #528/#529.

---

## 2. Sound / SFX

| Asset type | Location | Merged? | Live on Pages? | Action |
| --- | --- | --- | --- | --- |
| CMA poke SFX pack | `public/voice-clips/cma-reaction/CMA*.mp3` | Y | Y (`../voice-clips` from docs) | Want list: `docs/SFX_WANT_LIST.md` |
| Zone routing | `cma-reaction-gallery.ts`, `voice-clips.ts` | Y | Y (in app) | Gallery `/sfx-gallery` |
| Poke SFX tests | `poke-sfx-no-tts.test.ts`, `owner-picks-win.test.ts` | Y | — | CI |
| Library perf audio | `public/audio/**` (82 MP3) | Y | Y | `public/audio/LIBRARY.md` |
| Mixkit stream vault | `music-catalog.ts` MV039–MV118 | Y | Y | `#mixkit-streams` in picker · CDN previews |

**Manifest (`cma-poke-sfx`):** 13 indexed entries · wired Want codes in `owner-resource-manifest.ts`.

---

## 3. Owner-resources HTML (voice rows, audition, Mixkit)

| Section | `id` / tab | Lines (approx.) | Merged? | Live r237? |
| --- | --- | ---: | --- | --- |
| Music + DC performance | `#music`, `#performance` | 1–4900 | Y | Y |
| Mixkit streams | `#mixkit-streams` | ~80 MV rows | Y ([#517](https://github.com/MonMonMars/amoji-app/pull/517)) | Y |
| Stories ST### | `#stories` | 38 tales | Y | Y |
| Demo PH### | `#demo` | chips | Y | Y |
| News NW### | `#news` | feeds/templates | Y | Y |
| **Poke TTS bank + SFX** | `#poke` | PK + CMA + zone SFX | Y | Y |
| Idle ID### | `#idle` | VRMA / rails | Y | Y |

| Feature | Where | Merged? | Notes |
| --- | --- | --- | --- |
| Tri-state 採用/保留/刪除 | `owner-resources.html` | Y (#517 **r233**) | Export schema `owner-picker-notes-v2` |
| **Import notes JSON** | textarea `#importNotesJson` | Y | Paste `owner-picker-notes-2026-11-18.json` (or any `owner-picker-notes-YYYY-MM-DD.json` from **Save notes JSON**) |
| Save notes JSON | picker toolbar | Y (#508 **r216**) | `showSaveFilePicker` or download |
| Motion preview column | poke / perf rows | Y on main · polish **#533** | Same GIF bug = merge #533 |
| Pages play URL resolver | postbuild + picker JS | Y | `../audio` + `../voice-clips` from `docs/` |

**Regenerate HTML:** `node scripts/generate-owner-picker-html.mjs` (writer: `scripts/owner-picker-html-writer.ts`).

**If UI “can’t access” catalog but JSON exists:** work is in repo; merge [#531](https://github.com/MonMonMars/amoji-app/pull/531) (live verify) and [#533](https://github.com/MonMonMars/amoji-app/pull/533) (previews). Hard-refresh picker tab.

---

## 4. Persistent records (machine index)

| Record | Path | Version / size | Merged? |
| --- | --- | --- | --- |
| TS manifest SoT | `apps/web/lib/owner-resource-manifest.ts` | `buildOwnerResourceIndex()` | Y |
| JSON export | `docs/owner-resource-manifest.json` | `2026-11-18-owner-resource-v2` · **522** entries · 148 KB | Y |
| CD### registry | `apps/web/lib/owner-catalog-registry.ts` | MV/ST/DC/PH/NW codes | Y |
| Human library doc | `docs/OWNER_RESOURCE_LIBRARY.md` | r215+ codes | Y |
| No separate `voice-vault` file | — | Voices live in `voice-catalog.ts` + manifest `voice-edge` / `voice-speech` | Y |

**Manifest entry counts (types):**

| Type | Count |
| --- | ---: |
| `voice-edge` | 62 |
| `voice-speech` | 19 |
| `tts-optional` | 10 |
| `cma-poke-sfx` | 13 |
| `music-stream` (Mixkit) | 80 |
| `music-dance` / `music-song` | 43 / 34 |
| `story-fairy-tale` | 38 |
| `owner-picker-motion-preview` | 140 |
| + idle, VRM, etc. | (see JSON) |

---

## 5. Docs cross-reference

| Doc | Role | Points to voice/sound? |
| --- | --- | --- |
| [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) | Board · open PRs · r237 train | Y — Audio/TTS 99%, #517–#520 |
| [`project-status.html`](./project-status.html) | Visual board | Y — “384 TTS templates · zone SFX” |
| [`OWNER_RESOURCE_LIBRARY.md`](./OWNER_RESOURCE_LIBRARY.md) | Canonical library rules | Y — full index |
| [`AGENT_SMOKE.md`](./AGENT_SMOKE.md) | `verify:live` / stale SW | Y — card voice debug path |
| [`PHONE_SMOKE.md`](./PHONE_SMOKE.md) | Owner Done gate | Y — R10 voice |
| **This file** | Accountability inventory | — |

[`AGENT_SMOKE.md`](./AGENT_SMOKE.md) Pixel no-repeat checklist expanded in open [#521](https://github.com/MonMonMars/amoji-app/pull/521) (not yet on `main`).

---

## 6. `main` vs GitHub Pages (r237 gap)

| Check | `main` | Live Pages (2026-11-18) |
| --- | --- | --- |
| `APP_REVISION` / `revision.txt` | **r2026-11-18.237** | **r2026-11-18.237** ✓ |
| `docs/owner-resources.html` | 18 463 lines | HTTP 200 · ~1.9 MB ✓ |
| App bundle (card voice fix #529) | **missing** | **missing** — still regressed until merge |
| App bundle (#528 speaker) | **missing** | **missing** |

**Gap is product code (#528, #529), not missing MP3s or HTML.**

---

## 7. Import path for owner notes (Pixel)

1. Open [owner-resources](https://monmonmars.github.io/amoji-app/docs/owner-resources.html) (or local `cd docs && python3 -m http.server 8765`).
2. Toolbar → **Load / import JSON**.
3. Paste contents of `owner-picker-notes-2026-11-18.json` (schema `owner-picker-notes-v2` per `OWNER_PICKER_NOTES_SCHEMA` in `owner-picker-html-writer.ts`).
4. Rows restore tri-state + usage notes; **Save notes JSON** to export again.

---

## 8. Recommended merge train (voice / picker)

1. **#529** — card sound  
2. **#528** — speaker routing  
3. **#533** — distinct picker GIFs (assets already on branch)  
4. **#531** — CI/live HTML verify  
5. Owner **hard-refresh** app + picker · run `npm run verify:live` from `apps/web`

---

## Audit log

| Step | Evidence |
| --- | --- |
| Repo file scan | `voice*.ts`, `gtts*`, `tts-*`, catalogs, 204+82 MP3 |
| `origin/main` | `revision.ts` → r237 |
| Live curl | `revision.txt` r237; owner-resources 200 |
| GitHub API | Open PRs #528, #529, #531, #533 |
| Manifest | `node` count 522 entries |

*Maintainers: bump **Generated** date when re-auditing after the next revision train.*