# Owner request log (repo index)

**Full log:** `/cursor/stores/self/OWNER_REQUEST_LOG.md` — append every owner ask the same turn.

**Last updated:** 2026-11-16 ~17:40 UTC

**2026-11-16 r181 (`cursor/finish-all-outstanding-0340-0eac`):** Poke uses pinned chat voice (gTTS/Edge via `speak` + optional zone SFX); dance body survives library bed swap; weather place-ask copy + `primeLocationForChatEnter` on `needsDevice`; mic/dance/story/search-weather from r180 on `main`. **Phone smoke still required** for R10–R13 / card / news.

## Standing rules

1. Log every owner message in the agent store the same turn.
2. Refresh `docs/USER_PRODUCT_BIBLE.md` Done/Outstanding when ship status changes.
3. Merged ≠ Done until `docs/PHONE_SMOKE.md` on device.
4. Do not mark R10–R13 / card / news Done without owner OK.
5. **Consult before swapping defaults:** `docs/OWNER_RESOURCE_LIBRARY.md`, `docs/owner-resource-manifest.json`, `apps/web/lib/owner-resource-manifest.ts`, `docs/SFX_WANT_LIST.md`, `docs/MISTAKE_LIBRARY.md`, `docs/DATA_ORGANIZATION.md`.
6. No insurance robot card clips; no OS synth primary for card greet.
7. No new SFX deletes without owner map; no `amoji.idle*.v7` without owner OK.
8. **Frozen fix order** (owner 2026-11-16): execute `/opt/cursor/artifacts/FIX_ORDER_FROZEN.md` — stabilize before audio/idle **redesign**; one conflict-prone PR at a time; update `/opt/cursor/artifacts/tasks-list.md` after each merge.

## This pack

| Deliverable | Status |
|-------------|--------|
| Resource / mistake / data docs + manifest | **Merged `main` `193776fca`** (#456) |
| Card voice `e7e20f55` | **Merged `main` `07dd76e3`** |
| P0–P6 stabilization pack | **Merged `main`** — see `docs/PROGRAMMING_PLAN.md`, `tasks-list` artifact |
| Phase A + delivery layer | **Complete** (`#458`–`#462`, `r2026-11-16.167`) |
| Phase B rewrites | **Frozen** until owner names failing `PHONE_SMOKE.md` rows |
| **`main` tip** | **`4463e647`** · agent check: `cd apps/web && npm run verify:live` |

**`main` tip:** `4463e647` · **`r2026-11-16.167`**