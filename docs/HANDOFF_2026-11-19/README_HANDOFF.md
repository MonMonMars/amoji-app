# Pixel handoff — 2026-11-19

Copy this entire folder to **`D:\Download\HANDOFF_2026-11-19`** on the owner PC (VM cannot write `D:\`).

## Live URLs

| What | URL |
| --- | --- |
| **Demo chat** | https://monmonmars.github.io/amoji-app/chat |
| **Owner resources** | https://monmonmars.github.io/amoji-app/owner-resources.html |
| **Revision** | https://monmonmars.github.io/amoji-app/revision.txt |
| **Status board** | https://monmonmars.github.io/amoji-app/project-status.html |

**Expected revision after Pages deploy (post-merge):** `r2026-11-19.265` (train tip on `main` at handoff time).  
**Live revision at handoff poll:** see `LIVE_REVISION.txt` in artifact zip (agent-fetched).

## Merged this session (squash → `main`)

| PR | Title |
| ---: | --- |
| [#549](https://github.com/MonMonMars/amoji-app/pull/549) | docs: Pixel merge handoff ladder + status board |
| [#550](https://github.com/MonMonMars/amoji-app/pull/550) | feat(scripts): owner-picker notes v2 → selection JSON import |
| [#551](https://github.com/MonMonMars/amoji-app/pull/551) | test(web): Pixel regression locks + agent-smoke train gate |
| [#528](https://github.com/MonMonMars/amoji-app/pull/528) | fix(voice): all langs + male on main speaker (r263) |
| [#529](https://github.com/MonMonMars/amoji-app/pull/529) | fix(voice): card grid audition audible (r249) |
| [#547](https://github.com/MonMonMars/amoji-app/pull/547) | fix(voice): card greet hello/hi/nice to meet you (r264) |

**Hotfix on handoff branch:** `apps/web/lib/revision.ts` merge-marker cleanup (bad squash left `HEAD` artifact on `main`).

## Open / blocked (merge next — rebase on `main` + revision ladder)

| PR | Status | Notes |
| ---: | --- | --- |
| [#546](https://github.com/MonMonMars/amoji-app/pull/546) | CONFLICTING | voice lang/gender pair |
| [#523](https://github.com/MonMonMars/amoji-app/pull/523) | CONFLICTING | chat interrupt |
| [#522](https://github.com/MonMonMars/amoji-app/pull/522) | CONFLICTING | music playback |
| [#540](https://github.com/MonMonMars/amoji-app/pull/540) | CONFLICTING | J-pop/CC0 beds |
| [#541](https://github.com/MonMonMars/amoji-app/pull/541) | CONFLICTING | owner-resources catalog |
| [#543](https://github.com/MonMonMars/amoji-app/pull/543) | CONFLICTING | idle/poke owner 採用 |
| [#545](https://github.com/MonMonMars/amoji-app/pull/545) | CONFLICTING | idle pose blend |
| [#548](https://github.com/MonMonMars/amoji-app/pull/548) | CONFLICTING | ROM verify tests |
| [#534](https://github.com/MonMonMars/amoji-app/pull/534) | CONFLICTING | demo music chips |
| [#535](https://github.com/MonMonMars/amoji-app/pull/535) | CONFLICTING | stargaze BGM |
| [#530](https://github.com/MonMonMars/amoji-app/pull/530) | CONFLICTING / CI fail | time chip — branch pushed with merge attempt |
| [#544](https://github.com/MonMonMars/amoji-app/pull/544) | OPEN | **Close as superseded** by #549–#551 (agent lacks `closePullRequest` API) |

**Do not merge (superseded unless still needed):** [#536](https://github.com/MonMonMars/amoji-app/pull/536) · [#537](https://github.com/MonMonMars/amoji-app/pull/537) · [#533](https://github.com/MonMonMars/amoji-app/pull/533) · [#524](https://github.com/MonMonMars/amoji-app/pull/524) — content rolled into #541 / #543 / #549 docs.

## PR numbered list (train + docs)

1. https://github.com/MonMonMars/amoji-app/pull/549  
2. https://github.com/MonMonMars/amoji-app/pull/550  
3. https://github.com/MonMonMars/amoji-app/pull/551  
4. https://github.com/MonMonMars/amoji-app/pull/528  
5. https://github.com/MonMonMars/amoji-app/pull/529  
6. https://github.com/MonMonMars/amoji-app/pull/547  
7. https://github.com/MonMonMars/amoji-app/pull/546  
8. https://github.com/MonMonMars/amoji-app/pull/523  
9. https://github.com/MonMonMars/amoji-app/pull/522  
10. https://github.com/MonMonMars/amoji-app/pull/540  
11. https://github.com/MonMonMars/amoji-app/pull/541  
12. https://github.com/MonMonMars/amoji-app/pull/543  
13. https://github.com/MonMonMars/amoji-app/pull/545  
14. https://github.com/MonMonMars/amoji-app/pull/548  
15. https://github.com/MonMonMars/amoji-app/pull/534  
16. https://github.com/MonMonMars/amoji-app/pull/535  
17. https://github.com/MonMonMars/amoji-app/pull/530  
18. https://github.com/MonMonMars/amoji-app/pull/544 (close)

## Bundled files

| File | Source |
| --- | --- |
| `AGENT_FINISH_PIXEL_HANDOFF.md` | `docs/AGENT_FINISH_PIXEL_HANDOFF_2026-11-18.md` (main) |
| `PROJECT_STATUS.md` | main |
| `AGENT_SMOKE.md` | main (#551) |
| `PHONE_SMOKE.md` | main |
| `VOICE_SOUND_INVENTORY.md` | branch #537 (until merged) |
| `RESOURCE_LIBRARY_INDEX.md` | branch #539 |
| `OWNER_PICKER_IMPORT.md` | this handoff |
| `samples/owner-picker-notes-export-sample.json` | main |

## Next agent

1. Merge handoff PR (revision.ts hotfix) → wait for Pages → confirm `revision.txt`.  
2. Serial rebase+merge **#546 → #548** then tail **#534 #535 #530** (resolve revision ladder + voice.ts conflicts like #547).  
3. Close **#544** manually.  
4. Run `pnpm --filter @amoji/web test` agent-smoke + pixel locks from `docs/AGENT_SMOKE.md`.