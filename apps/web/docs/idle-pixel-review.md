# Pixel Designer idle review (library #1–118)

Source of truth in code: `apps/web/lib/idle-catalog-review.ts` (`PIXEL_IDLE_REVIEW`).

Chat rail uses **Pixel OK only** in `apps/web/lib/idle-curated-rail.ts` (`CHAT_IDLE_CURATED` / `PIXEL_OK_IDLE_NUMS`).

## Curated chat rail (Pixel OK only)

| 新編號 | clipId | 類別 | 原庫 # |
|--------|--------|------|--------|
| 1 | IdleRpmFStanding001 | breathe | 42 |
| 2 | LookAround | look | 3 |
| 3 | IdleRpmMVar001 | look | 94 |
| 4 | IdleSassy | think | 34 |
| 5 | IdleRpmMVar002 | stretch | 95 |
| 6 | IdleMixamoArmStretch | stretch | 53 |
| 7 | IdleMixamoHappy | sing | 41 |
| 8 | lib_C120 | sing | 113 |
| 9 | lib_C111 | dance | 101 |
| 10 | lib_C112 | dance | 102 |
| 11 | lib_C113 | dance | 103 |
| 12 | lib_C121 | martial | 114 |
| 13 | ThumbsUp | react | 20 |
| 14 | Cheer | react | 22 |
| 15 | PlayPunch | react | 108 |
| 16 | YesCheer | react | 109 |

IdleHug (#36) was OK for singing in the first pass, then rejected for blend-to-back — retired, not on rail.

## Summary counts

- **Chat rail:** 16 Pixel-OK poses (`CHAT_IDLE_CURATED.length`)
- **Retired / hidden:** `RETIRED_IDLE_NUMS` in `idle-retired.ts`
- **Full library rows:** 118 (`IDLE_LIBRARY.length`) — VRMA files stay on disk; catalog flags only

Per-# designer verdicts and notes: `PIXEL_IDLE_REVIEW` array in `idle-catalog-review.ts`.
