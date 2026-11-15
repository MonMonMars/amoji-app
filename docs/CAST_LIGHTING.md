# Cast lighting profile notes

Pairs with `apps/web/lib/vrm/cast-lighting.ts` and `cast-lighting-profile.ts`.

## Model

**One shared daylight rig** (hemi / key / fill / ambient + ACES exposure) for every roster id. Face key stays in the rig shape but intensity is **0** for all. There are **no per-character light multipliers**.

Material path is also shared:

- `dampenCastMatcap` — every load
- `floorCastShadeColors` — every load
- `unifyCastMToon` — every load (soft-fix thick outline / hard cel)

Per-id wardrobe **texture** patches (`patchCastTextures`, eye stabilize) stay — those are mesh/content fixes, not lighting.

## Editing

1. Change shared constants in `cast-lighting.ts` only — never reintroduce per-id light overrides.
2. Keep `CAST_LIGHTING_OVERRIDES` empty; `cast-lighting.test.ts` asserts this.
3. Resolve id from model path with `characterIdFromModelRef` when needed for materials/thumbs.
4. Indoor vs outdoor backdrop prop on `CompanionCanvas` is deprecated/ignored — the shared rig lights every backdrop.
