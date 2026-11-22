# Voice / sound accountability inventory

**Generated:** 2026-11-18 (HKT) · **updated 2026-11-22 for r280** — current-state lines below read `r2026-11-19.280` / `99896449`; the 2026-11-18 audit-log rows are kept as dated history.  
**Audience:** Pixel + agents — answer “where did the TTS / SFX / picker work go?”  
**Honesty rule:** Assets are **not deleted** from git. Silence or “missing” UI is usually **unmerged fix PR**, **stale service worker**, or **regression on `main`**, not lost files.

**Live canary:** [`revision.txt`](https://monmonmars.github.io/amoji-app/revision.txt) · **`main` tip:** `99896449` · **r2026-11-19.280** (verified 2026-11-22)

---

## Executive verdict (why it *feels* gone)

| Symptom | Real cause | Fix |
| --- | --- | --- |
| Card grid / greet **no sound** on phone | Was a regression after merged [#519](https://github.com/MonMonMars/amoji-app/pull/519); fixes [#529](https://github.com/MonMonMars/amoji-app/pull/529) + [#528](https://github.com/MonMonMars/amoji-app/pull/528) + [#547](https://github.com/MonMonMars/amoji-app/pull/547) are **merged** (r249 / r263 / r264) | Hard-refresh to live `r2026-11-19.280`; if still silent, log a `PHONE_SMOKE.md` row |
| Male voice quiet / wrong speaker | Routing fix [#528](https://github.com/MonMonMars/amoji-app/pull/528) **merged** (r263) | Hard-refresh; phone-verify R10 |
| App still “old” behaviour | Stale SW cache (common at **r220** while live is **r280**) | Amber **Refresh** chip or clear site data · confirm `revision.txt` |
| Picker previews all same GIF | Distinct previews [#533](https://github.com/MonMonMars/amoji-app/pull/533) — **do not merge**; superseded by #541 (merged r270) | Hard-refresh [owner-resources](https://monmonmars.github.io/amoji-app/docs/owner-resources.html) |
| Status board out of date vs phone | Docs sync to r280 (this refresh) | Re-read [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) |
| “Bake-off” / CosyVoice panels missing | Spikes never merged ([#1](https://github.com/MonMonMars/amoji-app/pull/1), [#20](https://github.com/MonMonMars/amoji-app/pull/20)) — **Hold** by design | Not on `main`; production chain unchanged |

**Picker HTML on Pages:** ~1.9 MB, **18 463** lines, sections present (Music · Mixkit · Stories · Demo · News · Poke · Idle). Live grep matches repo for `owner-picker-notes-v2` / tri-state **採用** (~2050 hits) — **catalog is deployed** at r280.

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

### Cantonese (yue) — three Edge voices + OS fallback (r284 branch)

**Owner decision, 2026-11-22 (verbatim intent):** “only use those 3 voice:（WanLung 男 / HiuMaan 女 / HiuGaai 女）”, with **Sin-ji / Sin-ju (Apple)** and Android `zh-HK` retained as the fallback tier. **No paid TTS APIs** — Doubao / Volcano Engine / Speechify were explicitly rejected (proprietary, no third-party licence).

| Voice | Edge id | Gender | Role |
| --- | --- | --- | --- |
| WanLung | `zh-HK-WanLungNeural` | M | the only Cantonese male |
| HiuMaan | `zh-HK-HiuMaanNeural` | F | female, calmer |
| HiuGaai | `zh-HK-HiuGaaiNeural` | F | female, brighter |

- **Why:** the shipping Edge read-aloud endpoint still 403s; gTTS + speechSynthesis carry live audio. Restricting the Edge ids keeps the picker/catalog honest, and the OS tier (Sin-ji / Sin-ju / Tracy / Danny / Android `zh-HK`) is the safety net when Edge or the Edge proxy is unavailable.
- **Variety:** with only three Cantonese voices, per-character identity comes from `basePitch` / `baseRate` (OS matrix) and `edge-cast.ts` pitch/rate combos (Edge), not from a fourth speaker.
- **Male path:** every male `yue` matrix names `WanLung` first, then `Sin-ju`, then the generic `Male` token (Windows Danny). The regression guard is `apps/web/tests/yue-three-voice.test.ts`.
- **Catalogue:** `apps/web/data/tts-app-voice-picks.json` stays a 218-row keep/delete surface. TTS-001/002/003 are the three playable Edge rows (all `preferred`); the other 23 yue-tagged rows keep their evidence note and add “not wired and not planned under the current no-paid-API decision”.
- **Status:** code + docs on `cursor/yue-three-voice-0340-0eac` (**r2026-11-19.284**) — **not merged**, no Pages deploy. Phone smoke still required; only the owner can mark voice quality Done.

### Merged voice PRs (recent, on `main`)

| PR | What shipped |
| --- | --- |
| [#519](https://github.com/MonMonMars/amoji-app/pull/519) | Card audition all langs **r228** (`haltBrowserSynth` path) |
| [#511](https://github.com/MonMonMars/amoji-app/pull/511) | News stream + TTS scrub **r218** |
| [#515](https://github.com/MonMonMars/amoji-app/pull/515) | Instant music/song beds **r220** |
| [#489](https://github.com/MonMonMars/amoji-app/pull/489)+ | Poke / card voice loop fixes, gate sound test, pitch tiers (see `git log --grep=voice`) |

### Voice PRs — merged into the r271–r280 train

| PR | Branch hint | Merged? | Live? | Action |
| --- | --- | --- | --- | --- |
| [#529](https://github.com/MonMonMars/amoji-app/pull/529) | `cursor/card-voice-*` | **Y** (r249) | **Y** | Phone-verify card greet |
| [#528](https://github.com/MonMonMars/amoji-app/pull/528) | `cursor/voice-all-langs-*` | **Y** (r263) | **Y** | Phone-verify R10 |
| [#547](https://github.com/MonMonMars/amoji-app/pull/547) | card greet phrases | **Y** (r264) | **Y** | Phone-verify one-voice greet |
| [#555](https://github.com/MonMonMars/amoji-app/pull/555) | TTS-001–218 keep/delete | **Y** (r278) | **Y** | Settings → Voice catalog |
| [#521](https://github.com/MonMonMars/amoji-app/pull/521) | no-repeat checklist | **N** | partial | Content lives in `AGENT_SMOKE.md`; do not merge |
| [#1](https://github.com/MonMonMars/amoji-app/pull/1) | voice bake-off UI | **N** | **N** | Hold — spike only |
| [#20](https://github.com/MonMonMars/amoji-app/pull/20) | CosyVoice | **N** (draft) | **N** | Hold — optional server |

Many remote branches (`origin/cursor/card-voice-*`, `voice-*`, `gtts-*`) are **historical PR heads**; code either merged or superseded by #528/#529/#547.

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

| Section | `id` / tab | Lines (approx.) | Merged? | Live r280? |
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
| Motion preview column | poke / perf rows | Y on main · full catalog **#541 (r270)** | Do **not** merge #533 |
| Pages play URL resolver | postbuild + picker JS | Y | `../audio` + `../voice-clips` from `docs/` |

**Regenerate HTML:** `node scripts/generate-owner-picker-html.mjs` (writer: `scripts/owner-picker-html-writer.ts`).

**If UI “can’t access” catalog but JSON exists:** work is in repo — hard-refresh the picker tab. #531 remains an open docs-verify PR; **do not merge #533** (superseded by #541).

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
| [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) | Board · landed train · r280 | Y — Audio/TTS 99%, r271–r280 |
| [`project-status.html`](./project-status.html) | Visual board | Y — “384 TTS templates · zone SFX” |
| [`OWNER_RESOURCE_LIBRARY.md`](./OWNER_RESOURCE_LIBRARY.md) | Canonical library rules | Y — full index |
| [`AGENT_SMOKE.md`](./AGENT_SMOKE.md) | `verify:live` / stale SW | Y — card voice debug path |
| [`PHONE_SMOKE.md`](./PHONE_SMOKE.md) | Owner Done gate | Y — R10 voice |
| **This file** | Accountability inventory | — |

[`AGENT_SMOKE.md`](./AGENT_SMOKE.md) now carries the Pixel no-repeat checklist on `main` (#551 landed); #521 stays open by design.

---

## 6. `main` vs GitHub Pages (no gap at r280)

| Check | `main` | Live Pages (2026-11-22) |
| --- | --- | --- |
| `APP_REVISION` / `revision.txt` | **r2026-11-19.280** | **r2026-11-19.280** ✓ |
| `sw.js` `CACHE` | `amoji-r2026-11-19.280` | same ✓ |
| `docs/owner-resources.html` | 18 463 lines | HTTP 200 · ~1.9 MB ✓ |
| App bundle (card voice fix #529) | **merged** (r249) | **live** |
| App bundle (#528 speaker / #547 greet) | **merged** (r263 / r264) | **live** |
| TTS-001–218 catalog #555 | **merged** (r278) | **live** |

**No product gap.** Remaining risk is stale service worker + owner phone verification, not missing MP3s / HTML / code.

---

## 7. Import path for owner notes (Pixel)

1. Open [owner-resources](https://monmonmars.github.io/amoji-app/docs/owner-resources.html) (or local `cd docs && python3 -m http.server 8765`).
2. Toolbar → **Load / import JSON**.
3. Paste contents of `owner-picker-notes-2026-11-18.json` (schema `owner-picker-notes-v2` per `OWNER_PICKER_NOTES_SCHEMA` in `owner-picker-html-writer.ts`).
4. Rows restore tri-state + usage notes; **Save notes JSON** to export again.

---

## 8. Merge train status (voice / picker — all landed)

1. **#529** — card sound → **r249** ✓  
2. **#528** — speaker routing → **r263** ✓  
3. **#547** — card greet phrases → **r264** ✓  
4. **#555** — TTS-001–218 catalog → **r278** ✓  
5. **#533** — **do not merge** (superseded by #541 / r270) · **#531** docs verify still open  
6. Owner **hard-refresh** app + picker to `r2026-11-19.280` · run `npm run verify:live` from `apps/web`

---

## Audit log

| Step | Evidence |
| --- | --- |
| Repo file scan | `voice*.ts`, `gtts*`, `tts-*`, catalogs, 204+82 MP3 |
| `origin/main` (2026-11-22) | `revision.ts` → **r2026-11-19.280** @ `99896449` |
| Live curl (2026-11-22) | `revision.txt` **r2026-11-19.280**; `sw.js` CACHE `amoji-r2026-11-19.280`; owner-resources 200 |
| GitHub | #528 #529 #547 #555 landed; #531 #533 #521 still open (docs/hold) |
| Manifest | `node` count 522 entries |
| 2026-11-22 (r284 branch) | Cantonese limited to WanLung/HiuMaan/HiuGaai; OS fallback Sin-ji/Sin-ju + generic Female/Male kept; 218-row catalogue annotations updated; new `yue-three-voice.test.ts`; `APP_REVISION` **r2026-11-19.284** (unmerged branch) |
| — historical 2026-11-18 — | `origin/main` was r237; audio PRs #528/#529 then open |

*Maintainers: bump **Generated** date when re-auditing after the next revision train.*