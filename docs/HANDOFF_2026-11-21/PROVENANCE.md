# Handoff pack provenance — 2026-11-21

This folder folds the external GrokBot (Momoto token-save) handoff pack into the repo so the repo is no longer the second copy of the state — it is the canonical one.

## Source

| Field | Value |
| --- | --- |
| External pack path | `D:\GrokBot_Files\AGENT_HANDOFF_2026-11-21\amoji\` |
| Pack date | **2026-11-21 ~15:15 HKT** (Asia/Hong_Kong) |
| Fetched from | `origin/main` @ `9989644984de77acf1a0c4c71c0a13bcbb4df9b6` (`r2026-11-19.280`, #556) |
| Folded into repo | `docs/HANDOFF_2026-11-21/` (docs-only; no product change) |

## What was copied

- `README.md` — pack inventory + outstanding items (copied verbatim, BOM stripped)
- `STATE.md` — live revision, main SHA, landed r271–r280 train, HOLDs, open PRs, paths (copied verbatim, BOM stripped)

## What was deliberately **not** copied

`copies/` in the external pack was a set of **read-only snapshots of files already on `origin/main` at `99896449`**:

| Pack copy | Repo truth (already present, byte-identical minus BOM) |
| --- | --- |
| `copies/revision.ts` | `apps/web/lib/revision.ts` |
| `copies/revision.txt` | `apps/web/public/revision.txt` |
| `copies/ASSET_MANIFEST.md` | `docs/ASSETS.md` / asset manifest sources |
| `copies/IDLE_NUMBERED_MAP.md` | `docs/OWNER_RESOURCE_LIBRARY.md` idle section |
| `copies/idle-library-numbers.md` | `apps/web/lib/idle-library.ts` numbering (see owner resource library) |
| `copies/owner-picker-selection.json` | generated from `docs/owner-resources.html` export (schema `owner-picker-selection-v1`) |
| `copies/convert-summary.json` | **outside git** — see below |

Duplicating them in `docs/` would create a second copy that silently drifts from `main`. Do not re-add them; read the in-tree file instead.

## `convert-summary.json` is outside git

The Mixamo C14/C15/C16/C18 plant report is a build artifact, not repo content:

- `D:\Blender\projects\mon-character\free-library\vrma-out\c14-18-planted\convert-summary.json`
- Planted VRMAs: same folder (`IdleMixamoIdle.vrma`, `IdleMixamoStanding.vrma`, `IdleMixamoBreathing.vrma`, `IdleMixamoHappy.vrma`)
- Source FBX+GIF: `D:\Blender\projects\mon-character\free-library\animations\idle\mixamo\`
- Fallback set (not shipped): `D:\Blender\projects\mon-character\free-library\animations\idle\rocketbox\`

Max abs hips-Z offset recorded per clip: C14 `0.114`, C15 `0.148`, C16 `0.227`, C18 `0.135` (all toes re-grounded to `min_toe_z_after = -0.0`).
