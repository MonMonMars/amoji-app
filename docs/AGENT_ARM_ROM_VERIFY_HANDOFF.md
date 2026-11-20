# Arm / spine ROM clamp — verify handoff (2026-11-19)

## Status: **already shipped** (no new runtime clamp code this pass)

Pixel’s skeleton ROM request is implemented on `main` via **#351** (`bone-joint-limits.ts`, `quat-blend.ts`, `avatar.clampAxialNoFlip`) and exercised in **CompanionCanvas** idle entry blend + per-frame poke path.

## Where it lives

| Layer | File | Role |
|-------|------|------|
| Limits | `apps/web/lib/vrm/bone-joint-limits.ts` | `BONE_BLEND_LIMITS`, `AXIAL_NO_FLIP_BONES` (hips/spine/chest/upperChest/neck/head/arms) |
| Blend | `apps/web/lib/vrm/quat-blend.ts` | `shortestQuatSlerpClamped` → `clampBoneByName` |
| Pose fields | `apps/web/lib/vrm/avatar.ts` | `HUMAN_LIMITS`, `clampAxialNoFlip()` |
| Poke | `apps/web/lib/poke-hit.ts` | Caps on spine/elbow during section reactions |
| Canvas | `apps/web/components/CompanionCanvas.tsx` | `applyBoneBlend` clamps each bone; `avatar.clampAxialNoFlip()` after mixer/poke/cast |

## Fold with #545

#545 idle smear fix already landed on `main` as **r274**. This pass ships only the ROM verification tests and this note as **r275**.

## Tests added (this pass)

- `quat-blend.test.ts` — elbow hyperextension ROM
- `idle-pose-smooth.test.ts` — source asserts idle/poke → `clampBoneByName` → `clampAxialNoFlip`

Run: `cd apps/web && npm test -- --run quat-blend idle-pose-smooth`

## Phone

After merge: hold chat 60–90s (idle stability from #545) + poke torso/arm — no full-turn spine or sleeve spins.
