# Modular head / body GLBs

Head is identity (name, face, voice). Body is the outfit. Swap bodies inside this female cluster. **Do not rescale the head.** **Do not re-split** these files — the app loads the existing `*_head.glb` / `*_body.glb` as-is.

GitHub `amoji-app` is the source of truth for the app. The meshes themselves live on Mon's PC and are **not** committed in this change (they are large binaries).

## Where Mon copies them from

```
D:\Blender\projects\mon-character\free-library\modular\
```

Each id folder there should already contain `<ID>_head.glb` and `<ID>_body.glb` (the split exports). Copy those two files per id. Leave `*_ORIGINAL.vrm` on the PC.

## Where they go in this repo

```
apps/web/public/models/modular/<ID>/<ID>_head.glb
apps/web/public/models/modular/<ID>/<ID>_body.glb
```

The viewer requests `/models/modular/<ID>/<ID>_head.glb` and `_body.glb` (Pages base path prefixed when set).

### Demo wardrobe (female cluster)

| ID | Name | Role | Head file | Body file | neck_z |
|----|------|------|-----------|-----------|--------|
| A02 | Shibu | head + body | `A02/A02_head.glb` | `A02/A02_body.glb` | 1.315 |
| A10 | AgahoMei Normal | head + body | `A10/A10_head.glb` | `A10/A10_body.glb` | 1.301 |
| A119 | Kanami Uniform | head + body | `A119/A119_head.glb` | `A119/A119_body.glb` | 1.313 |
| A120 | Morikawa Yuki Summer Uniform | outfit | `A120/A120_head.glb` | `A120/A120_body.glb` | 1.315 |
| A106 | AuroraGradHairJK | outfit | `A106/A106_head.glb` | `A106/A106_body.glb` | 1.320 |

Heads in the chat wardrobe: **A02, A10, A119**.  
Outfits: **A119, A120, A106, A02, A10**.

Example (PowerShell, from the modular library):

```powershell
$src = "D:\Blender\projects\mon-character\free-library\modular"
$dst = "apps\web\public\models\modular"
foreach ($id in @("A02","A10","A119","A120","A106")) {
  New-Item -ItemType Directory -Force -Path "$dst\$id" | Out-Null
  Copy-Item "$src\$id\${id}_head.glb" "$dst\$id\"
  Copy-Item "$src\$id\${id}_body.glb" "$dst\$id\"
}
```

If the library folders are named `out\<ID>` instead, use that path as `$src`. Copy only the two GLBs.

## Runtime

1. Body GLB armature is the rig (`J_Bip_C_Hips`, `J_Bip_C_Neck`, `J_Bip_C_Head`, …).
2. Head meshes bind onto that rig with the exported inverse bind matrices. Scale stays **1**.
3. Name and voice follow the **head** id.
4. Changing outfit unloads body meshes and binds the next `*_body.glb`. The head mesh stays.
5. Neck seam is the exported cut (`neck_z`, about ±0.002). Skin-tone mismatch is expected in v1.

Until those files are present, a cloth change reloads the outfit's full want-list VRM (then the head's VRM, then `seed-san.vrm`) so the visible body still changes. Name and voice stay with the head.

A98 is a tall outlier and is not part of this wardrobe. Do not cross-swap A98 with this cluster.

Last head and body are stored in `localStorage` under `amoji.modular.v1`.
