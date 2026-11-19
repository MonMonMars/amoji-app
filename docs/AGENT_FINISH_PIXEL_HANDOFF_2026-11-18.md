# Pixel merge train — agent handoff (2026-11-18 evening)

**Live pre-merge:** https://monmonmars.github.io/amoji-app/ · **`revision.txt`:** **r2026-11-18.237** (live = `main` tip **2026-11-19**)  
**Coordination branch:** `cursor/no-history-resume-ask-0340` · handoff PR **#544**  
**CI (2026-11-19):** **#528–#544** build green — no agent code fixes; **waiting on Pixel** serial squash merges.  
**Supersedes:** #536 #537 #533 #538 → **#541** when it lands; #524 → **#543**

## Revision ladder (deconflicted r248–r261)

### Critical path (merge first — green after r248–r254 train prep)

| Serial | PR | Branch | CI (post-push) |
| --- | --- | --- | --- |
| **r248** | [#528](https://github.com/MonMonMars/amoji-app/pull/528) | `cursor/voice-all-langs-main-speaker-0340-0eac` | 🟢 |
| **r249** | [#529](https://github.com/MonMonMars/amoji-app/pull/529) | `cursor/card-voice-hotfix-9448` | 🟢 |
| **r250** | [#523](https://github.com/MonMonMars/amoji-app/pull/523) | `cursor/chat-interrupt-new-topic-0340-0eac` | 🟢 |
| **r251** | [#522](https://github.com/MonMonMars/amoji-app/pull/522) | `cursor/music-playback-regression-0340-0eac` | 🟢 |
| **r252** | [#540](https://github.com/MonMonMars/amoji-app/pull/540) | `cursor/jpop-royalty-performance-0340-0eac` | 🟢 · **9 CC0 beds on tip** `f6cc0df2` |
| **r253** | [#541](https://github.com/MonMonMars/amoji-app/pull/541) | `cursor/owner-resources-full-catalog-0340-0eac` | 🟢 · same beds + manifest `ebe5f2fa` |
| **r254** | [#543](https://github.com/MonMonMars/amoji-app/pull/543) | `cursor/idle-poke-voice-fix-0340-0eac` | 🟢 |
| **r255** | [#531](https://github.com/MonMonMars/amoji-app/pull/531) | `cursor/owner-resources-pages-claims-9cbf` | docs-only 🟢 |

**CC0 bed spot-check (agent):** on both **#540** and **#541** branch tips, `apps/web/public/audio/song-bed/` includes at least  
`bed-adventure-time.mp3` · `bed-forest-pop.mp3` · `bed-jay-pop.mp3` · `bed-lay-low.mp3` · `bed-observing-star.mp3` · `bed-synthwave-city.mp3` (+ synthwave variants).

### Demo / docs tail (after hypothetical live **r254** — rebased on `main` 2026-11-18)

| Serial | PR | Branch | CI (post-push) |
| --- | --- | --- | --- |
| **r256** | [#534](https://github.com/MonMonMars/amoji-app/pull/534) | `cursor/demo-music-sing-phase-0340-0eac` | re-run expected 🟢 |
| **r257** | [#535](https://github.com/MonMonMars/amoji-app/pull/535) | `cursor/watching-stars-bg-0340-0eac` | re-run expected 🟢 |
| **r258** | [#530](https://github.com/MonMonMars/amoji-app/pull/530) | `cursor/demo-phase-time-chip-3e15` | 🟢 fixed `demoPhaseFacetIndex` |
| **r259** | [#532](https://github.com/MonMonMars/amoji-app/pull/532) | `cursor/no-history-resume-ask-0340-bd8d` | docs-only 🟢 |
| **r260** | [#539](https://github.com/MonMonMars/amoji-app/pull/539) | `cursor/resource-library-index-0340-0eac` | docs-only 🟢 |
| **r261** | [#538](https://github.com/MonMonMars/amoji-app/pull/538) | `cursor/motion-thumb-library-0340-6102` | re-run expected 🟢 · regen HTML after **#541** |

**Clashes cleared:** r238 → r256; r247 → r257; r243 → r258; motion-thumb CI blocked on orphan beds until **#540** — **#538** temporarily pins `owner-resources.html` to `main` until **#541** lands (then regen).

## One-click merge train (owner mental model — **no agent `gh pr merge`**)

Pixel merges are **serial squash merges on GitHub**, one PR at a time, in this order. After each merge, wait for Pages deploy + check live `revision.txt` before the next.

```
# Critical path (phone smoke after each step — see PHONE_SMOKE.md)
gh pr merge 528 --squash   # → r248
gh pr merge 529 --squash   # → r249
gh pr merge 523 --squash   # → r250
gh pr merge 522 --squash   # → r251
gh pr merge 540 --squash   # → r252  (ships CC0 mp3)
gh pr merge 541 --squash   # → r253  (close #536 #537 #533 #538 without merge)
gh pr merge 543 --squash   # → r254  (close #524)
gh pr merge 531 --squash   # → r255  optional docs

# Optional tail (after live shows r254+)
gh pr merge 534 --squash   # → r256
gh pr merge 535 --squash   # → r257
gh pr merge 530 --squash   # → r258
# 532 539 docs — any order
gh pr merge 532 --squash
gh pr merge 539 --squash
# Rebase #538 onto new main + regen owner-resources, then:
gh pr merge 538 --squash   # → r261
```

**Between merges:** hard-refresh chat (amber **Refresh** if SW stale). **Do not** merge #536 #537 #533 #538 #524 — superseded as above.

## Recommended merge order (Pixel phone smoke)

Same as critical path table **r248→r254**; optional tail **r256→r261** only after owner confirms train on phone.

After **each** merge: splash footer = live `revision.txt`; hard-refresh / amber **Refresh** if stale SW.

## Owner picker ship-set import

```bash
# From repo root after exporting owner-resources notes JSON (owner-picker-notes-v2):
node scripts/import-owner-picker-selection.mjs docs/samples/owner-picker-notes-export-sample.json --dry-run
node scripts/import-owner-picker-selection.mjs /path/to/export.json
# → apps/web/data/owner-picker-selection.json
```

Runtime (after **#543**): `owner-picker-decisions.ts` + `owner-picker-ship-set.ts`. See `docs/OWNER_RESOURCE_LIBRARY.md` § notes export + ship-set import.

## Demo / smoke URLs

| Surface | URL |
| --- | --- |
| Chat | https://monmonmars.github.io/amoji-app/chat |
| Owner-resources | https://monmonmars.github.io/amoji-app/docs/owner-resources.html |
| Picker deep links | `#idle` · `#poke` · `#performance` · `#music` |
| Revision canary | https://monmonmars.github.io/amoji-app/revision.txt |

## What Pixel tests on phone

| After PR | Test |
| --- | --- |
| #528+#529 | Setup/select card **▶ voice** audible **yue/zh/ja/en**; male row not female-pitched |
| #523 | New topic mid-reply stops TTS; same-topic still has memory (no false “fresh chat”) |
| #522 | 「播音樂/唱歌/跳舞」→ stop perf → generic music plays again (no dead mixer) |
| #540+#541 | Music tab rows play; new CC0 beds; catalog hash tabs scroll |
| #543 | Owner **採用** idle rails (5/10/Sam) + poke CMA SFX; gallery Skip overrides ship-set |
| #534–#535 | Demo chips 聽音聽音樂/聽歌/唱歌 · 睇星星 (listen-only BGM + overlay) |
| #530 | **時間** chip — local + world cities via `sayLocal` |

Full checklist: `docs/PHONE_SMOKE.md`

## CI snapshot (tail PRs, 2026-11-18 ~18:12 UTC)

| PR | Head | Pre-fix | Post-push |
| --- | --- | --- | --- |
| #530 | `3e1b8f1c` | 🔴 typecheck | 🟢 expected |
| #534 | `97749fd9` | 🟢 | re-run |
| #535 | `ecee1695` | 🔴 unstable | re-run |
| #538 | `69ec9a60` | 🔴 postbuild beds | re-run |
| #539 | `2c8cabd7` | 🔴 (stacked w/ #538) | 🟢 docs-only |
| #532 | `e9d4ff0f` | 🟢 | docs-only |

**Critical path — all green:** #528 #529 #522 #523 #540 #541 #543 · #544 handoff docs.

**Superseded (close when convenient — do not merge):** #536 #537 #533 **#538** → **#541** (catalog regen); #524 → **#543**.