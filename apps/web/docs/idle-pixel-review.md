# Pixel Designer idle review (library #1–118)

Source of truth in code: `apps/web/lib/idle-catalog-review.ts` (`PIXEL_IDLE_REVIEW`).

Chat rail uses **fresh curated #1..39** in `apps/web/lib/idle-curated-rail.ts` (`CHAT_IDLE_CURATED`), mapped to library `clipId` via `legacyLibNum`.

## Curated chat rail (2026-11-08)

| 新編號 | clipId | 類別 | 原庫 # |
|--------|--------|------|--------|
| 1 | IdleBreathCalm | breathe | 1 |
| 2 | StandardIdle | breathe | 2 |
| 3 | IdleMixamoBreathing | breathe | 40 |
| 4 | IdleNeutral | breathe | 33 |
| 5 | IdleRpmFStanding001 | breathe | 42 |
| 6 | IdleQuaterniusHuman | breathe | 39 |
| 7 | lib_C04 | breathe | 5 |
| 8 | IdleRpmFVar001 | breathe | 43 |
| 9 | lib_C25 | breathe | 7 |
| 10 | IdleInnersceneSam | breathe | 90 |
| 11 | IdleRpmMStanding001 | breathe | 93 |
| 12 | LookAround | look | 3 |
| 13 | lib_C42 | look | 13 |
| 14 | IdleRpmFVar003 | look | 45 |
| 15 | IdleRpmFVar004 | look | 46 |
| 16 | IdleRpmMVar001 | look | 94 |
| 17 | Thinking | think | 18 |
| 18 | IdleSassy | think | 34 |
| 19 | Relax | stretch | 32 |
| 20 | IdleMixamoArmStretch | stretch | 53 |
| 21 | IdleRpmMVar002 | stretch | 95 |
| 22 | IdleMixamoHappy | sing | 41 |
| 23 | IdleHug | sing | 36 |
| 24 | lib_C120 | sing | 113 |
| 25 | lib_C111 | dance | 101 |
| 26 | lib_C112 | dance | 102 |
| 27 | lib_C113 | dance | 103 |
| 28 | lib_C114 | dance | 104 |
| 29 | lib_C121 | martial | 114 |
| 30 | lib_C122 | martial | 115 |
| 31 | lib_C123 | martial | 116 |
| 32 | ThumbsUp | react | 20 |
| 33 | Cheer | react | 22 |
| 34 | PlayPunch | react | 108 |
| 35 | YesCheer | react | 109 |
| 36 | TaDa | react | 110 |
| 37 | Bow | react | 111 |
| 38 | StompAngry | react | 112 |
| 39 | lib_C146 | react | 117 |

## Summary counts

- **Chat rail:** 39 curated poses (`CHAT_IDLE_CURATED.length`)
- **Retired / hidden from picker:** see `RETIRED_IDLE_NUMS` in `idle-catalog-review.ts` (plus `retired: true` rows in `idle-library.ts`)
- **Full library rows:** 118 (`IDLE_LIBRARY.length`) — VRMA files stay on disk; catalog flags only

Per-# designer verdicts and notes: `PIXEL_IDLE_REVIEW` array in `idle-catalog-review.ts`.
