# Pixel merge train — agent handoff (2026-11-18 evening)

**Live pre-merge:** https://monmonmars.github.io/amoji-app/ · **`revision.txt`:** **r2026-11-18.237**  
**Coordination branch:** `cursor/no-history-resume-ask-0340`  
**Supersedes:** #536+#537+#533 picker/docs → **#541**; #524 idle/poke → **#543**

## Revision ladder (deconflicted r248–r255)

| Serial | PR | Branch | CI (post-push) |
| --- | --- | --- | --- |
| **r248** | [#528](https://github.com/MonMonMars/amoji-app/pull/528) | `cursor/voice-all-langs-main-speaker-0340-0eac` | re-run expected 🟢 |
| **r249** | [#529](https://github.com/MonMonMars/amoji-app/pull/529) | `cursor/card-voice-hotfix-9448` | 🟢 |
| **r250** | [#523](https://github.com/MonMonMars/amoji-app/pull/523) | `cursor/chat-interrupt-new-topic-0340-0eac` | 🟢 |
| **r251** | [#522](https://github.com/MonMonMars/amoji-app/pull/522) | `cursor/music-playback-regression-0340-0eac` | 🟢 |
| **r252** | [#540](https://github.com/MonMonMars/amoji-app/pull/540) | `cursor/jpop-royalty-performance-0340-0eac` | fixed typecheck 🟡 |
| **r253** | [#541](https://github.com/MonMonMars/amoji-app/pull/541) | `cursor/owner-resources-full-catalog-0340-0eac` | Pages beds + verify 🟡 |
| **r254** | [#543](https://github.com/MonMonMars/amoji-app/pull/543) | `cursor/idle-poke-voice-fix-0340-0eac` | owner picks 🟡 |
| **r255** | [#531](https://github.com/MonMonMars/amoji-app/pull/531) | `cursor/owner-resources-pages-claims-9cbf` | docs-only 🟢 |

**Clashes cleared:** r238 (#522/#536/#543) → r251/r254; r240 (#540/#541) → r252/r253; r242 (#529/#531) → r249/r255.

## Recommended merge order (Pixel phone smoke)

1. **#528** → **#529** (audible card + main speaker all langs)
2. **#523** (chat interrupt / history)
3. **#522** (music after `PerformanceSession`)
4. **#540** (CC0 beds + performance allowlist — ships mp3 used by catalog)
5. **#541** (full owner-resources catalog; skip #536/#537/#533)
6. **#543** (idle/poke 採用 at runtime; skip #524)
7. Optional doc tail: **#531** (status claims) — any order after #541

After **each** merge: splash footer = live `revision.txt`; hard-refresh / amber **Refresh** if stale SW.

## Owner picker ship-set import

```bash
# From repo root after exporting owner-resources notes JSON:
node scripts/import-owner-picker-selection.mjs /path/to/export.json
# → apps/web/data/owner-picker-selection.json
```

Runtime: `owner-picker-decisions.ts` + `owner-picker-ship-set.ts`. See `docs/OWNER_RESOURCE_LIBRARY.md` § listen/sing/motion picks.

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

Full checklist: `docs/PHONE_SMOKE.md`

## CI greens first (open PRs #522–#543, scan 2026-11-18)

🟢 #529 #528 #523 #522 #543 #537 #536 #534 #533 #532 #527 …  
🔴 fixed this pass: **#540** (duplicate export), **#541** (missing bed mp3)  
Still red / lower priority: #538 #539 #535 #530 #526 #521 — not on Pixel critical path

## Suggested PR titles (if not updated via UI)

Use the **r248–r255** serials in each PR title matching the table above.