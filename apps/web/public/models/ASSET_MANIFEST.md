# Amoji Asset Manifest

Every binary in this directory (top level or under `cast/`) must have an entry. CI fails on unmanifested files.

## Shipped binaries

| File | License | Source | Notes |
|---|---|---|---|
| seed-san.vrm | VRM Public License 1.0 (https://vrm.dev/en/licenses/1.0/index) — "Seed-san" model by VirtualCast, Inc.; credit notation required | Official VRM 1.0 conformance sample: https://github.com/vrm-c/vrm-specification/tree/master/samples/Seed-san | Licensed fallback avatar for open-source and GitHub Pages builds. VRM 1.0 with full emotional + viseme preset set. Credit: Seed-san model by VirtualCast, Inc. Also the universal fallback whenever a cast file is missing or fails to load. |

## Local anime cast (r2026-10-04.52 — 29 characters)

The full 29-character cast maps to local VRM files under `cast/` (see
`apps/web/lib/prefs.ts` — flagship agent3 top-10 first, then the classic
cast). The agent3 flagship models plus the classic-cast community uploads
were collected in earlier curation passes. **LICENSE STATUS: UNVERIFIED** —
treat as internal demo assets only; each entry must be re-validated or
replaced with an original/commissioned model before any public App Store /
commercial release.

Until the binaries land in this repo, every character's loader walks the
fallback chain to seed-san.vrm (see `apps/web/lib/vrm/avatar.ts` and the loader
in `apps/web/components/CompanionCanvas.tsx`), so the app stays playable.

| Cast file | Character | Gender |
|---|---|---|
| cast/nova.vrm | Nova | female |
| cast/kizuna.vrm | Kizuna | female |
| cast/alicia.vrm | Alicia | female |
| cast/ember.vrm | Ember | female |
| cast/mei.vrm | Mei | female |
| cast/atlas.vrm | Atlas | male |
| cast/sky.vrm | Sky | female |
| cast/yuki.vrm | Yuki | female |
| cast/hina.vrm | Hina | female |
| cast/mio.vrm | Mio | female |
| cast/hana.vrm | Mochi | female |
| cast/juno.vrm | Juno | female |
| cast/zane.vrm | Blaze | male |
| cast/kai.vrm | Kai | male |
| cast/luna.vrm | Luna | female |
| cast/rin.vrm | Rin | female |
| cast/rex.vrm | Ren | male |
| cast/elio.vrm | Cloud | male |
| cast/avatarsample-a.vrm | Kasumi | female |
| cast/fumiriya.vrm | Marin | female |
| cast/sumire.vrm | Ayane | female |
| cast/nana.vrm | Hitomi | female |
| cast/vroid-male.vrm | Robbie | male |
| cast/mikel.vrm | Mika | male |
| cast/cyrus.vrm | Anchor | male |
| cast/lydia.vrm | Lydia | female |
| cast/mimi.vrm | Ruby | female |
| cast/olivia.vrm | Snowy | female |
| cast/kael.vrm | Alan | male |

Notes on specific slots:

- `cast/kizuna.vrm` — Kizuna AI-style idol sample from the agent3 gallery.
  **Learning/demo only — swap for an original or properly licensed model
  before any release.** Same rule as the old juno.vrm "Kamatte" slot.
- `cast/mei.vrm` — VRoid-style sweetheart (agent3 gallery). Same unverified
  license status as the rest of the classic cast until re-validated.
- r52 rename: the roster is now keyed by character id, not source-file name
  (Mochi←hana, Blaze←zane, Ren←rex, Cloud←elio, Kasumi←avatarsample-a,
  Marin←fumiriya, Ayane←sumire, Hitomi←nana, Robbie←vroid-male,
  Mika←mikel, Anchor←cyrus, Ruby←mimi, Snowy←olivia, Alan←kael). The model
  files keep their original names on disk.

## Retired / banned assets

| File | Why |
|---|---|
| marin.vrm | Copyright-flagged by CI (`banned asset check`); must never be committed under any path. The Marin **character** uses cast/fumiriya.vrm and is unaffected. |
| cast/shino.vrm | Retired at r2026-10-04.52 — the old Aerith slot gave way to flagship Alicia; the file is no longer imported. |
| juno.vrm (Kizuna AI "Kamatte") | Kizuna AI Inc. developer sample — closed/local builds only, never committed; public builds use seed-san.vrm. |
| Remote arweave cast (r2026-10-03.32–.42, Polygonal Mind "100 Avatars") | Superseded by the local cast above. Remote URLs caused facing/arm-pose defects, dead-link risk, and load latency. |
| companion-juno.vrm ("Mister") | Only lip-sync/blend shapes, no emotional expression; VRM 0.x. md5 `c3eaaa37f869df12e79a3ab923db900f`. |

## Companion art (r2026-10-04.52) — outside this directory, not covered by the CI manifest check

| Directory | License | Source | Notes |
|---|---|---|---|
| `apps/web/public/portraits/*.jpg` (11 files) | AI-generated original artwork (Amoji project) | Generated in-project via the image-generation gateway; character designs are original anime archetypes, not official game/anime IP | Selection-thumbnail + status-plate portraits for the classic cast (Mochi, Juno, Blaze, Kai, Luna, Rin, Ren, Kasumi, Marin, Ayane, Hitomi). |
| `apps/web/public/portraits/*.png` (18 files) | agent3 gallery renders — same UNVERIFIED demo-only status as the cast VRMs | Local curation pass (`_incoming/agent3/prototypes/assets/companion-char-*.png`) | Portraits for the flagship top-10 plus the rebadged cast (Nova, Kizuna, Alicia, Ember, Mei, Atlas, Sky, Yuki, Hina, Mio, Cloud, Robbie, Mika, Anchor, Lydia, Ruby, Snowy, Alan). Swap for original art before release. |
| `apps/web/public/backgrounds/*.jpg` (12 files) | AI-generated original artwork (Amoji project) | Same as above; Shinkai-inspired original scenic paintings | Painted anime backdrops for all 12 scenes; gradient fallbacks remain in `prefs.ts`. |
