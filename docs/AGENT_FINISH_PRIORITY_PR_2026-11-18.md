# Priority product PRs — agent finish pass (2026-11-18)

**Base:** `main` @ `91a857e3` (**r2026-11-18.237**)  
**Live (pre-merge):** https://monmonmars.github.io/amoji-app/  
**Owner-resources (Pages):** https://monmonmars.github.io/amoji-app/docs/owner-resources.html  

## CI snapshot (GitHub Actions `build`)

| PR | Branch | Mergeable | CI head | CI |
| --- | --- | --- | --- | --- |
| [#522](https://github.com/MonMonMars/amoji-app/pull/522) | `cursor/music-playback-regression-0340-0eac` | ✅ clean (was **dirty** — fixed this pass) | `691df680` **r238** | 🟡 re-run after merge-main push |
| [#523](https://github.com/MonMonMars/amoji-app/pull/523) | `cursor/chat-interrupt-new-topic-0340-0eac` | ✅ clean | `82f1684d` **r245** | 🟢 success |
| [#529](https://github.com/MonMonMars/amoji-app/pull/529) | `cursor/card-voice-hotfix-9448` | ✅ clean | `f5005b4b` **r242** | 🟢 success |
| [#528](https://github.com/MonMonMars/amoji-app/pull/528) | `cursor/voice-all-langs-main-speaker-0340-0eac` | ✅ clean | `97eebf90` **r241** | 🟢 success |
| [#536](https://github.com/MonMonMars/amoji-app/pull/536) | `cursor/owner-resources-access-0340-0eac` | ✅ clean | `6118b18f` | 🟡 in progress at scan time |
| [#537](https://github.com/MonMonMars/amoji-app/pull/537) | `cursor/voice-sound-inventory-0340-0eac` | ✅ clean | `de2abc99` | 🟡 in progress at scan time |

No **RED** CI on priority branches except conflict-blocked #522 (resolved).

## What this agent fixed

1. **#522** — merged `origin/main` into `cursor/music-playback-regression-0340-0eac`, resolved `revision.ts` / `revision.txt` / `sw.js` conflicts, bumped serial to **r2026-11-18.238**, pushed `691df680`. Local: 14/14 music/performance tests passed.

## All-language voice / TTS verification (no code change on `main`)

| Surface | All 4 langs (`yue`, `zh`, `ja`, `en`)? | Notes |
| --- | --- | --- |
| `voice-catalog.ts` `VoiceLocale` | ✅ | Shipping Edge + speech rows per locale |
| Settings `VoicePicker.tsx` | ✅ | `LOCALES` = all four; per-locale sections |
| Select `TtsVoiceRow.tsx` | ✅ | Current lang grid; **Show all** → `selectTtsButtons()` all langs |
| `voice-picker-parity.test.ts` | ✅ | 8 tests on `main` |
| Card greet / preview audible | ⚠️ on `main` | **#519** partial; full race fix in **#529** (`unlockAudioForCardAudition`, greet/preview) — merge **#529** before phone sign-off |
| Main speaker all langs + male | ⚠️ on `main` | **#528** — not merged; live still pre-r241 routing |

**Documented gaps (not bugs — honest limits):**

- **ja / yue** — `isSingleVoiceLocale`: one hosted Google speaker; UI shows `voiceOnlyOneAvailable`; pitch × gender still multiplies buttons.
- **Non-shipping engines** in catalog (kokoro, piper, melotts, bark, canto-nano) — `shipping: false` by design; held GPU list in `HELD_GPU_ENGINES`.
- **Audible card + chat speaker** — requires merge train **#529 → #528** (see below).

## Recommended merge order for Pixel (when owner asks)

1. **#536** — owner-resources hash tabs / deep links (docs-only UX; unblocks picker QA URLs)
2. **#529** — card grid audition silent (audible cards)
3. **#528** — all-lang main speaker + male gTTS
4. **#523** — chat history r245 + interrupt doc
5. **#522** — music playback after performance-session (**r238** after merge)
6. **#537** — voice/sound inventory doc (accountability; parallel with catalog work)

After each merge: bump lives at **r238+**, hard-refresh SW, `PHONE_SMOKE.md` rows for music + card voice + chat continuity.

## Demo / smoke links (post–#536 merge)

- App: https://monmonmars.github.io/amoji-app/chat  
- Owner-resources deep links (after #536):  
  - https://monmonmars.github.io/amoji-app/docs/owner-resources.html#poke  
  - https://monmonmars.github.io/amoji-app/docs/owner-resources.html#idle  
  - https://monmonmars.github.io/amoji-app/docs/owner-resources.html#performance  

## Agent branch (this pass)

- Status only: `cursor/continue-finish-requests-4efa` (this file + `PROJECT_STATUS.md` touch-up)
- Product fix: pushed on existing **#522** branch (no new `cursor/app-finish-lang-voice-*` — catalog grid already complete on `main`)