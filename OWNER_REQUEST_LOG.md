# Owner request log (repo index)

**Full log:** `/cursor/stores/self/OWNER_REQUEST_LOG.md` — append every owner ask the same turn.

**Last updated:** 2026-11-22 (Asia/Hong_Kong)

## 2026-11-22 — Cantonese voice pool: only WanLung / HiuMaan / HiuGaai

**Owner instruction (verbatim intent):** “only use those 3 voice:（WanLung 男 / HiuMaan 女 / HiuGaai 女）”.

**Owner decisions recorded the same turn:**

- Edge `yue` pool = exactly `zh-HK-WanLungNeural` (M), `zh-HK-HiuMaanNeural` (F, calmer), `zh-HK-HiuGaaiNeural` (F, brighter).
- Keep `Sin-ji` / `Sin-ju` (Apple) and Android `zh-HK` as the **fallback tier** — do not strip the OS voice tier.
- **No paid TTS APIs.** Doubao / Volcano Engine / Speechify explicitly rejected (proprietary, no third-party licence). No new vendor.
- No Apple Enhanced/Premium download guidance.
- Variety now comes from `basePitch` / `baseRate`, not a fourth speaker.

**Branch:** `cursor/yue-three-voice-0340-0eac` from `main` `764f8bb7` · **r2026-11-19.284** · guard `apps/web/tests/yue-three-voice.test.ts`. **Not merged; do not merge on the owner's behalf.** Voice quality still needs a real-phone check (`PHONE_SMOKE.md`).

## 2026-11-22 — r280 docs sync + 2026-11-21 handoff pack folded into repo

**Repo state at logging:** `main` = `99896449` = **r2026-11-19.280** (clean, synced). r271–r280 landed via #553 #554 #543 #545 #548 #534 #535 #555 #530 #556.

**Docs-only change** (branch `cursor/docs-r280-sync-0340-0eac`): headers in `PROJECT_STATUS.md` / `PHONE_SMOKE.md` / `AGENT_SMOKE.md` / `USER_PRODUCT_BIBLE.md` / `VOICE_SOUND_INVENTORY.md` now read r280; 2026-11-21 pack folded into `docs/HANDOFF_2026-11-21/`. **No product code, no `APP_REVISION` / `sw.js` / `revision.txt` bump.**

### Binding constraints recorded from the 2026-11-21 pack

- **Do NOT merge:** #536, #537, #533, #524. **#544 closed unmerged**, superseded by #549–#551.
- **HOLDs:** NanoBanana, PSX, BreathCalm, CMA00350–431 want/skip, head/body swap. Kokoro / Piper / Cosy **not bundled** (Cosy / JyutVoice listing-only, skip NC). **No Higgsfield without Mon.**
- **No Cursor Flash / pool Flash / Cloud** without explicit go (Path B = desktop DeepSeek Flash via OpenRouter).
- **CMA range:** repo truth is `docs/owner-resource-manifest.json` → `cmaWant` = **10 ids** (350, 351, 354, 359, 360, 363, 364, 365, 366, 318). The “–431” upper bound in the pack is GrokBot's **external gallery range**, **not** repo truth.
- **Blocking question for Pixel:** on the first screen after an **r280 hard refresh**, do **C14 / C15 / C16 / C18** look **planted or floating**? Fallback is Rocketbox from `D:\Blender\...\animations\idle\rocketbox\` (25 FBX — needs a real Cxx ↔ filename map first: `f_/m_idle_{breathe,neutral}_0N.max.fbx`). Next stamp would be **`r2026-11-19.281`**. **Never ship C186 / C187 / C188 / C191.**
- **r280 owner 採用 set:** `ID-R04, ID-R05, ID-R10` + the four clip ids; `idleRailNums` stays `[4, 5, 10]` — clip 採用 must not promote curated rails.


**2026-11-17 r182 (`cursor/continue-backlog-0340-0eac`):** Topical news (incl. HK yue AI) — junk-only / empty pools say honest miss; no unrelated recent headline or wiki-only substitute; portal picks use `topicalHeadlineMatches`. Vitest 2199 pass. **Phone smoke:** yue「最新有咩 AI 新聞？」+ junk-feed miss path.

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