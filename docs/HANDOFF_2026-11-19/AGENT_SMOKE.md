# Agent smoke (no phone required)

**Live:** https://monmonmars.github.io/amoji-app/  
**Human checklist:** [`PHONE_SMOKE.md`](./PHONE_SMOKE.md) — only the owner can mark **Done**.

## After every Pages deploy

From `apps/web`:

```bash
npm run verify:live
npm run verify:agent-smoke   # optional JSON report (sw CACHE + revision.txt)
```

Exit `0` means live `revision.txt` matches `APP_REVISION` in `lib/revision.ts`.  
`verify:agent-smoke` also checks live `sw.js` `CACHE`; steps 3–4 (Refresh chip, clear site data) stay **owner-phone only**.

JSON includes `pixel_train`: when live is still **r237** pre-merge, `owner_gate_pr` is **528** (first squash in the r248 train — agents do not merge).

## Delivery layer (do not re-ship without owner report)

| PR | Purpose |
|----|---------|
| #458 | SW `CACHE` = `APP_REVISION`; card/preview `pinSinkBeforePlay` |
| #459 | SW **Refresh** chip on update |
| #460 | `revision.txt` network canary |
| #461 | Splash live vs baked revision |
| #462 | `LiveRevisionBadge` (splash/settings/setup) + `verify:live` |
| #467 | `agent-live-smoke.mjs` + `verify:agent-smoke` |

Product stabilization (#419–#437, resource libs) is already on `main`. **Phase B rewrites are frozen** until the owner names failing `PHONE_SMOKE.md` rows (`docs/PROGRAMMING_PLAN.md`).

## When owner says “nothing fixed”

1. Confirm `verify:live` green.
2. Ask if they see **amber Refresh** (stale bundle).
3. Only then debug card/voice/poke/idle in code for the named row (`PHASE_B_MAP.md`).

## Pixel no-repeat checklist (agent, no phone)

Run from `apps/web` after `main` or coordination-branch doc/test changes:

```bash
npm test -- --run demo-phase.test.ts demo-phase-rail.test.ts pixel-no-repeat.test.ts
npm run verify:live
npm run verify:agent-smoke
```

| Symptom | Guard |
| --- | --- |
| Weather / news chips shuffle off-screen | `pixel-no-repeat` + `demo-phase` — indices 0–1 stay `weather` / `news` for every seed |
| Demo chip tap shows text but no read-aloud | `pixel-no-repeat` — weather/news path uses `clientLiveContext` + `sayLocal`, not `send()` |
| Horizontal rail jitter eats taps | `demo-phase-rail` — drag threshold, deferred `setPointerCapture` |
| Caption history replays the same clause | `speech-caption` + `no-double-speak` — `dedupeConsecutiveCaptions` / `commitCaptionLines` on seal |
| Kung fu chip speaks without body sync | **#526** (not in r248 train) — prep: `demo-phase` kungfu → `detectExercise`; full guard: `martial-speak-guard` |

**News / weather live path (r230+ on `main`, live r237):** Vitest proves wiring only; RSS / Open-Meteo still need owner phone rows in [`PHONE_SMOKE.md`](./PHONE_SMOKE.md). Agents do **not** mark news/weather Done without owner ticks.