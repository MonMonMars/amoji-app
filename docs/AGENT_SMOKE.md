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
## Pixel no-repeat checklist

Read this **before** claiming a recurring issue is fixed. Each row: symptom → agent/CI verification (phone still required for **Done**).

| Issue | Symptom (owner) | Verify (no phone) |
| --- | --- | --- |
| Stale SW / `revision.txt` lag on Pages | Fixes “not live”; amber **Refresh**; splash/footer revision old | `cd apps/web && npm run verify:live && npm run verify:agent-smoke` |
| Demo phase chip order | Weather/News buried after shuffle | `npm test -- pixel-no-repeat.test.ts` + `demo-phase.test.ts` (weather+news indices 0–1) |
| News/weather demo silent | Chip tap shows text but no read-aloud | `npm test -- pixel-no-repeat.test.ts` (`clientLiveContext` + `speak` in `send()`) |
| Card voice silent after 1st yue tap | Greet/preview mute after first card audition | `npm test -- pixel-no-repeat.test.ts` (`stopSpeakingForCardAudition` → `haltSynthQueue`) |
| Idle frozen / no visible motion | Avatar statue on calm stand | `npm test -- pixel-no-repeat.test.ts` + `idle-visible-motion.test.ts` |
| Taichi `lib_C121` arm freeze | Tai chi demo arms stuck mid-air | `npm test -- pixel-no-repeat.test.ts` + `taichi-martial-flow.test.ts` + `plant-feet.test.ts` |
| Hip-hop ask wrong track | Yue hip-hop plays pop/other MV | `npm test -- pixel-no-repeat.test.ts` + `music-ask.test.ts` |
| Mixkit picker 403 vs missing file | Owner-resources preview error unclear | `npm test -- pixel-no-repeat.test.ts` (CDN vs missing copy in `owner-resources.html`) |

CI lock: `apps/web/tests/pixel-no-repeat.test.ts` — extend when Pixel reports a **new** repeat failure.
