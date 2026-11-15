# Poke SFX #1–23 — Want / Archive / Delete map (R1 / R2)

**Status:** Owner map already applied in code (#348 / #358). This doc is the clear Want list so agents do **not** invent further destructive deletes without a new owner map.

**SoT in code:** `apps/web/lib/voice-clips.ts` (`RECORDED_POKE_ZONE`) · `apps/web/lib/cma-reaction-gallery.ts` · gallery notes `apps/web/docs/cma-reaction-sfx-gallery.md`  
**UI:** `/sfx-gallery` + EmotionClipRow Want → Skip → clear (`amoji.cmaReactionSfx.picks.v1`)

## Want (active zone defaults — keep)

| Owner # | Clip | Role |
|--------:|------|------|
| 3 | `CMA00350` | Female HA punch/hit → torso / foot |
| 4 | `CMA00351` | Slow soft press → chest / breast / default |
| 7 | `CMA00354` | Young pretty smile → head / arms |
| 9 | `CMA00359` | Old-woman scare (gasp) |
| 10 | `CMA00360` | Age-35 small scare → back |
| 11 | `CMA00363` | Fast soft press → belly |
| 12 | `CMA00364` | Slow soft press → hands |
| 13 | `CMA00365` | Scary surprise → side |
| 14 | `CMA00366` | Sensitive poke → butt / legs |
| 15 | `CMA00318` | Male effort (only surviving male; all male zones) |

## Archive (gallery for future Want — not zone defaults)

| Owner # | Clip | Note |
|--------:|------|------|
| 1 | `CMA00320` | Giggle too long |
| 2 | `CMA00335` | Kid-boy ouch |
| 6 | `CMA00353` | Evil-lady giggle |

Archive never enters the default poke pool unless the owner Want-picks it in the gallery.

## Deleted (do not re-ship / do not invent more deletes)

| Owner # | Clip | Reason |
|--------:|------|--------|
| 5 | `CMA00352` | Name |
| 8 | `CMA00358` | No voice |
| 16 | `CMA00327` | Dog bark |
| 17–23 | `CMA00330` / `339` / `355`–`357` / `361` / `362` | Owner delete pass |
| prior | `CMA00304`–`349` cull | Earlier CMA reaction cull |

## Agent rule

- **Do not** delete or re-wire zone clips without a new owner Want/archive/delete map.
- Phone smoke still confirms Want/Skip select + zone-stable SFX (`docs/PHONE_SMOKE.md`).
