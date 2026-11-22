# Owner request log (repo index)

**Full log:** `/cursor/stores/self/OWNER_REQUEST_LOG.md` — append every owner ask the same turn.

**Last updated:** 2026-11-22 (Asia/Hong_Kong)

## 2026-11-22 — owner idle picker with C-codes

**Owner ask (verbatim intent):** "how about add small button beside the character in the chat room, and let me press and select one by one, give each of them a number C18, C16. etc."

**Repo state at logging:** docs fast-forwarded on `main` (`764f8bb7` = r280 docs). Work stacks on `cursor/idle-rail-honesty-0340-0eac` (r281) → `cursor/idle-picker-c-numbers-0340-0eac` (**r2026-11-19.282**). Merge order: docs → idle-rail-honesty → idle-picker.

**Shipped in r282 (code):**
- Small idle button beside the companion canvas (`components/IdlePickerSheet.tsx`), bottom sheet with one row per idle.
- Rows carry the C-code prominently: owner 採用 **C14 / C15 / C16 / C18** plus new Shapeweld **C156–C160 / C164 / C165**; L-code fallback for Sam/RPM.
- Tap = pin + immediate live swap; **Auto rotation** clears the pin; pin persists per companion in `amoji.idlePick.v6`.
- C164/C165 labelled **feet-planted** — the alternatives to the floating Mixamo C16/C18.
- 7 Shapeweld VRMAs copied to `public/models/anims/lib_C156…C165.vrma`, library #127–133, **not promoted onto curated rails** (`CHAT_IDLE_CURATED` stays 39).
- 11 universal CMA reaction SFX appended (`haha`→laugh, `hmm`→um aliases); existing 1–94 clip indices unchanged (male block now #100–#110).

**Phone smoke Outstanding:** does the button sit comfortably beside her on a Pixel/iPhone, do rows fit without horizontal scroll, and does a pinned idle survive reload? See [`docs/PHONE_SMOKE.md`](./docs/PHONE_SMOKE.md).

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