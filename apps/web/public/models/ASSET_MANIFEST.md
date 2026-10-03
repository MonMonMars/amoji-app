# Amoji Asset Manifest

Every binary in this directory (top level or under `cast/`) must have an entry. CI fails on unmanifested files.

## Shipped binaries

| File | License | Source | Notes |
|---|---|---|---|
| seed-san.vrm | VRM Public License 1.0 (https://vrm.dev/en/licenses/1.0/index) — "Seed-san" model by VirtualCast, Inc.; credit notation required | Official VRM 1.0 conformance sample: https://github.com/vrm-c/vrm-specification/tree/master/samples/Seed-san | Licensed fallback avatar for open-source and GitHub Pages builds. VRM 1.0 with full emotional + viseme preset set. Credit: Seed-san model by VirtualCast, Inc. Also the universal fallback whenever a cast file is missing or fails to load. |

## Local anime cast (r2026-10-04.50)

The 22-character cast maps to local VRM files under `cast/` (see
`apps/web/lib/prefs.ts`). These were collected from rigmodels.com community
uploads in earlier curation passes. **LICENSE STATUS: UNVERIFIED** — treat as
internal demo assets only; each entry must be re-validated or replaced with an
original/commissioned model before any public App Store / commercial release.

Until the binaries land in this repo, every character's loader walks the
fallback chain to seed-san.vrm (see `apps/web/lib/vrm/avatar.ts` and the loader
in `apps/web/components/CompanionCanvas.tsx`), so the app stays playable.

| Cast file | Character | Gender |
|---|---|---|
| cast/juno.vrm | Juno | female |
| cast/nova.vrm | Nova | female |
| cast/zane.vrm | Blaze | male |
| cast/hana.vrm | Mochi | female |
| cast/kai.vrm | Kai | male |
| cast/luna.vrm | Luna | female |
| cast/rin.vrm | Rin | female |
| cast/rex.vrm | Ren | male |
| cast/alicia.vrm | Tifa | female |
| cast/shino.vrm | Aerith | female |
| cast/atlas.vrm | Cloud | male |
| cast/avatarsample-a.vrm | Kasumi | female |
| cast/fumiriya.vrm | Marin | female |
| cast/sumire.vrm | Ayane | female |
| cast/nana.vrm | Hitomi | female |
| cast/vroid-male.vrm | Robbie | male |
| cast/mikel.vrm | Mika | female |
| cast/cyrus.vrm | Anchor | male |
| cast/lydia.vrm | Lydia | female |
| cast/mimi.vrm | Ruby | female |
| cast/yuki.vrm | Snowy | female |
| cast/kael.vrm | Alan | male |

## Retired / banned assets

| File | Why |
|---|---|
| marin.vrm | Copyright-flagged by CI (`banned asset check`); must never be committed under any path. |
| juno.vrm (Kizuna AI "Kamatte") | Kizuna AI Inc. developer sample — closed/local builds only, never committed; public builds use seed-san.vrm. |
| Remote arweave cast (r2026-10-03.32–.42, Polygonal Mind "100 Avatars") | Superseded by the local cast above. Remote URLs caused facing/arm-pose defects, dead-link risk, and load latency. |
| companion-juno.vrm ("Mister") | Only lip-sync/blend shapes, no emotional expression; VRM 0.x. md5 `c3eaaa37f869df12e79a3ab923db900f`. |

## Companion art (r2026-10-03.01) — outside this directory, not covered by the CI manifest check

| Directory | License | Source | Notes |
|---|---|---|---|
| `apps/web/public/portraits/*.jpg` (15 files) | AI-generated original artwork (Amoji project) | Generated in-project via the image-generation gateway; character designs are original anime archetypes, not official game/anime IP | Selection-thumbnail + status-plate portraits for the cast. |
| `apps/web/public/backgrounds/*.jpg` (12 files) | AI-generated original artwork (Amoji project) | Same as above; Shinkai-inspired original scenic paintings | Painted anime backdrops for all 12 scenes; gradient fallbacks remain in `prefs.ts`. |
