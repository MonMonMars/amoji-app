# Agent smoke (no phone required)

**Live:** https://monmonmars.github.io/amoji-app/  
**Human checklist:** [`PHONE_SMOKE.md`](./PHONE_SMOKE.md) — only the owner can mark **Done**.

## After every Pages deploy

From `apps/web`:

```bash
npm run verify:live
```

Exit `0` means live `revision.txt` matches `APP_REVISION` in `lib/revision.ts`.

## Delivery layer (do not re-ship without owner report)

| PR | Purpose |
|----|---------|
| #458 | SW `CACHE` = `APP_REVISION`; card/preview `pinSinkBeforePlay` |
| #459 | SW **Refresh** chip on update |
| #460 | `revision.txt` network canary |
| #461 | Splash live vs baked revision |
| #462 | `LiveRevisionBadge` (splash/settings/setup) + `verify:live` |

Product stabilization (#419–#437, resource libs) is already on `main`. **Phase B rewrites are frozen** until the owner names failing `PHONE_SMOKE.md` rows (`docs/PROGRAMMING_PLAN.md`).

## When owner says “nothing fixed”

1. Confirm `verify:live` green.
2. Ask if they see **amber Refresh** (stale bundle).
3. Only then debug card/voice/poke/idle in code for the named row (`PHASE_B_MAP.md`).