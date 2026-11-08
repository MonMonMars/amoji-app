# Cast lighting profile notes

Pairs with PR **#299** (`apps/web/lib/vrm/cast-lighting.ts`, `cast-lighting-profile.ts`).

## Model

Shared daylight rig (hemi / key / fill / ambient + exposure) under ACES. Most roster ids use **1.0 multipliers**. Only characters that visibly wash or crush under the default get overrides.

## Allowlist (2026-11 review)

| Cast # | Character id | Notes |
| ---: | --- | --- |
| 1 | `a01-shino` | VRoid Sendagaya ref — soft MToon + matcap reads hot |
| 2 | `a02-shibu` | Same family as #1 |
| 3 | `a03-fumiriya` | Male ref sample; same MToon/matcap family |
| 13 | `a63-hinoame-satuki-mei-sirayuki` | Grazing shadow pockets before shade floor |

Sendagaya trio: soften key, lift fill/ambient, pull exposure slightly. `#13`: milder key cut, stronger fill/ambient. Matcap dampen (`CAST_MATCAP_DAMPEN_IDS`) applies to #1–3 so hair does not blow out.

## Editing

1. Prefer multipliers over one-off scene lights.
2. Resolve id from model path with `characterIdFromModelRef`.
3. Add a test in `cast-lighting.test.ts` when touching the allowlist.
4. Indoor vs outdoor still comes from the backdrop `setting` on `CompanionCanvas` — profile multiplies that base, it does not replace it.
