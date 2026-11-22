# Amoji state — 2026-11-21 ~15:15 HKT (Asia/Hong_Kong)

Verified live just before this pack was written.

## Live product

- Revision: **r2026-11-19.280**
- URL: https://monmonmars.github.io/amoji-app/revision.txt
- Pages last-modified: Sat, 21 Nov 2026 06:34:02 GMT / 14:34 HKT
- `sw.js` CACHE: `amoji-r2026-11-19.280` (same last-modified)
- Merge: [#556](https://github.com/MonMonMars/amoji-app/pull/556) squash-merged to main @ `9989644984de77acf1a0c4c71c0a13bcbb4df9b6`
- Pixel was already told (14:34 HKT) to hard-refresh / amber Refresh from the first screen (not mid-chat) for the four Mixamo idles, and to ping whether feet look planted or still float. Do not ping again unless a new revision is live.

## What’s on main (all of this is in the live r280 build)

| Rev | PR | SHA (short) | What |
|-----|-----|-------------|------|
| r271 | #553 | b4b5fac5 | iPhone voice/mic + first-phase latch |
| r272 | #554 | d05cc901 | 8-way full-body poke |
| r273 | #543 | 5dc5c74b | Owner 採用 runtime |
| r274 | #545 | 5897be6e | Idle v2 no A→B smear; same-clip bone-blend skip |
| r275 | #548 | c56f243d | ROM verify tests (clamps since #351) |
| r276 | #534 | b6bae218 | Demo chips 聽音樂 / 聽歌 / 唱歌 |
| r277 | #535 | e80f6085 | 睇星星 stargaze + Observing the Star BGM |
| r278 | #555 | 7c7d4701 | Settings TTS-001–218 keep/delete catalog |
| r279 | #530 | 09525e10 | 時間 chip (device local + HK, Tokyo, London, NYC, LA, Sydney) |
| r280 | #556 | 99896449 | Planted Mixamo C14 Idle, C15 StandingIdle, C16 BreathingIdle, C18 HappyIdle |

#544 closed unmerged 2026-11-21T06:08:22Z as superseded by #549–#551.

## Mixamo plant notes (r280)

- Source FBX+GIF: `D:\Blender\projects\mon-character\free-library\animations\idle\mixamo\`
- Planted VRMAs shipped: IdleMixamoIdle (new, library #126), plus replaced Standing / Breathing / Happy. `git add -f` required (`apps/web/.gitignore` has `*.vrma`).
- Toe-ground via hips world-Z offset each frame. Max abs dz: C14 0.114, C15 0.148, C16 0.227 (~23 cm, worst), C18 0.135.
- Owner 採用 use set: ID-R04, ID-R05, ID-R10 plus the four Mixamo clip IDs. `idleRailNums` stay [4, 5, 10]. Clip 採用 must not promote curated rails (else C16 steals calm, C18 steals sing).
- Runtime `plant-feet.ts` remains a safety net — do not undo.
- Rocketbox MIT standing set is the fallback only if Pixel reports float after the r280 refresh.

## TTS catalog (r278, still in this build)

- Settings → Voice: TTS-001–218 keep/delete, visible TTS-###, Keep/Delete, Edge Preview only.
- Do not re-flood the live speaker row with Edge names (endpoint often 403s).
- Playable buttons stay gTTS regional/pitch personas + OS `speechSynthesis`.
- Link-only engines listed, not bundled. NC appendix not wired. Cosy/JyutVoice listing-only, not runtime.

## Open PRs (do not casually merge)

Standing: do **not** merge #536, #537, #533, #524 unless still needed.

- #539 docs: resource library index (r260) — likely stale vs live owner-resources
- #538 fix(owner-picker): motion thumbnail library GIFs
- #532 docs: status train + crisis-guard align
- #531 fix(docs): owner-resources live verify
- #542 docs: agent finish priority PR checklist
- #537 docs: voice / sound / TTS inventory — do not merge unless still needed
- #536 fix(docs): owner-resources hash tabs — do not merge unless still needed
- #533 fix(owner-picker): distinct motion preview GIFs — do not merge unless still needed
- #527 feat(chat): open web search for LLM — not in current train
- #526 fix(demo): kung fu speak only when motion plays — product rule still in force; PR still open
- #524 feat(motion): honor owner Use/Keep/Delete picks — superseded in spirit by #543; do not merge unless still needed
- #521 docs+tests: Pixel no-repeat checklist
- #1 Voice bake-off UI (stale)
- #20 CosyVoice TTS spike (stale; Cosy still not bundled)

## HOLDs

Runtime / bundling: NanoBanana, PSX, BreathCalm, CMA00350–431 Want/Skip, head/body swap.
Not bundled: Kokoro, Piper, Cosy (listing-only for Cosy / JyutVoice; skip NC / true non-commercial).
No Higgsfield generations unless Mon says go.

## Desktop / Path B

- Machine: DESKTOP-8J9170S (`2b96a7f6-010e-4fe6-9cc7-7ae640cfe7c3`)
- Path B: DeepSeek Flash via OpenRouter `OPENROUTER_API_KEY`; Pro only seldom for debug / very complicated work
- NEVER Cursor Flash / pool Flash / Cloud without Mon explicit go
- Local vitest is broken (incomplete `node_modules`); CI is the reliable runner
- CopyToBox / CopyFromBox cannot target D: directly — stage on `C:\Users\User\<name>`, move to D:, immediately delete the C: leftover. Never park on C:.
- Next unused stamp if work lands: **r2026-11-19.281**. New work should branch from `origin/main` @ `99896449`, not from older feature branches.

## Local checkout note

At pack time the desktop repo was still on branch `cursor/mixamo-idle-plant-r280`. Fast-forward local `main` to `99896449` before the next branch.
