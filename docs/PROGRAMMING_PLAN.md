# Programming plan (frozen — owner authorized autonomous order)

**`main` tip:** see `apps/web/lib/revision.ts` `APP_REVISION` · **Live:** https://monmonmars.github.io/amoji-app/

Mirror: `/opt/cursor/artifacts/PROGRAMMING_PLAN.md` (agent workspace).

## Phase A — Stabilize

Land on `main`; verify with `docs/PHONE_SMOKE.md`. Stabilization + **delivery layer** (#458–#461, `r2026-11-16.167`) complete: SW cache sync, refresh chip, `revision.txt` canary, live revision UI, `npm run verify:live`. **No product churn** until `docs/PHONE_SMOKE.md` failures are reported.

## Phase B — Rewrite (if smoke fails)

See artifact copy for CompanionAudioPolicy, IdleController, GreetArbitrator, NewsTellPipeline, PokeImpulse.

## Libraries

`docs/OWNER_RESOURCE_LIBRARY.md` · `docs/MISTAKE_LIBRARY.md` · `docs/DATA_ORGANIZATION.md`