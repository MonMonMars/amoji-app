# Amoji Asset Manifest

Every binary in this directory must have an entry. CI fails on unmanifested files.

| File | License | Source | Notes |
|---|---|---|---|
| juno.vrm | Kizuna AI "Kamatte" official VRM sample (Kizuna AI Inc. developer distribution; review usage guidelines before public/App Store release) | Copied from prior repo's curated legal roster: `_incoming/agent3/prototypes/assets/companion-kizuna.vrm` (md5 `bfc42acdf7f29752359e1c6edbed25b8`, byte-identical to `kizuna-kamatte.vrm`) | Default companion avatar "Juno". VRM 1.0, full emotional preset set (happy/angry/sad/surprised/relaxed). Replaces the initially selected "Mister" community model, which had no emotional blend shapes and was VRM 0.x (unsupported by @pixiv/three-vrm v3). Ships in closed/local builds only — NOT committed to the public repo; public builds load seed-san.vrm instead. |
| seed-san.vrm | VRM Public License 1.0 (https://vrm.dev/en/licenses/1.0/index) — "Seed-san" model by VirtualCast, Inc.; credit notation required | Official VRM 1.0 conformance sample: https://github.com/vrm-c/vrm-specification/tree/master/samples/Seed-san | Licensed fallback avatar for open-source and GitHub Pages builds. VRM 1.0 with full emotional + viseme preset set. Credit: Seed-san model by VirtualCast, Inc. |

## Remote per-character cast (r2026-10-03.32)

The 15-character cast loads a distinct VRM per character at runtime over HTTPS —
no binaries committed. Source: Polygonal Mind "100 Avatars" R1–R3, listed as
CC0 1.0 Universal in the open-source-avatars registry
(https://github.com/ToxSam/open-source-avatars). Credit: avatar designs by
Polygonal Mind. Re-verify each entry against the upstream registry before any
App Store / commercial release. All are remote URLs in `CharacterDef.model`;
any load failure (dead link, VRM 0.x, missing CORS) walks the fallback chain to
seed-san.vrm.

| Character | Avatar | Model URL |
|---|---|---|
| Juno | Olivia (056, R1) | https://arweave.net/MgsNlTetzAoVEC6E-lswj65vp7StkOZXXd5OjjqzYZI |
| Nova | Rose (057, R1) | https://arweave.net/Ea1KXujzJatQgCFSMzGOzp_UtHqB1pyia--U3AtkMAY |
| Blaze | Chad (079, R1) | https://arweave.net/s15TxeRcxamOZ0qDfjME1Bl2Ku7Vs4IQs8RthpxYjOQ |
| Mochi | MushroomFairy (220, R3) | https://arweave.net/ULlu6wg-zCwLokTXxbXzFlJzugVW_yp2pssEKJbvwx8 |
| Kai | Bruno (233, R3) | https://arweave.net/WR_xW_yGKwubTj-kdlyw5jNVx5m2ldMxwg_enz_Znbw |
| Luna | LadyKoi (255, R3) | https://arweave.net/t3aTp6AhxfdLcq5I3HZx29wK8MFQGmDC9wPwXrHQoW0 |
| Rin | Polydancer (021, R1) | https://arweave.net/jPOg-G0MPH55ZQmamFhT9f8cHn-hjeAQ0mRO5gWeKMQ |
| Ren | Ro (017, R1) | https://arweave.net/6S5a74z2s5aZrTE71nJR1a1j9x5v46mPy3MKJZMylwg |
| Tifa | Amazonas (061, R1) | https://arweave.net/fqZDwToo41u1a7VnHhZX1BTK5lktXpK_H6H20MVbPqQ |
| Aerith | Agnes (243, R3) | https://arweave.net/c8mrbRq29sfQdovW1l_D2JYGOaCNF3JxTaUsmHTSNAg |
| Cloud | Kiba (213, R3) | https://arweave.net/Nf6SIdJuYGYzUMJKNgKq44Zr-lCZS4No_FYtR6BFBYM |
| Kasumi | Erika (053, R1) | https://arweave.net/GZkfa0SNnrBWluRL_pXpakg7T3K3d4l87__wR4mD3UM |
| Marin | Jenny (281, R3) | https://arweave.net/kgTirc4OvUWbJhIKC2CB3_pYsYuB62KTj90IdE8s3sk |
| Ayane | StitchWitch (215, R3) | https://arweave.net/O-cHPoD2LyfqSbkltB15-nwGK1aUT0M1JMLf1-gq46g |
| Hitomi | Eugenia (226, R3) | https://arweave.net/saOexMViu7mqSeaXfQzNIPrKWQ0nqkSf-FpOQjZfBcU |

## Superseded candidates (not shipped)

| File | Why rejected |
|---|---|
| companion-juno.vrm ("Mister", arweave `elvlpN6jefoDXqqCWMxCBVZnl6Z2lLD7-wC8N5z1bVk`) | Only lip-sync/blink blend shapes — no emotional expression; VRM 0.x (unsupported by three-vrm v3). md5 `c3eaaa37f869df12e79a3ab923db900f`. |

## Companion art (r2026-10-03.01) — outside this directory, not covered by the CI manifest check

| Directory | License | Source | Notes |
|---|---|---|---|
| `apps/web/public/portraits/*.jpg` (15 files) | AI-generated original artwork (Amoji project) | Generated in-project via the image-generation gateway; character designs are original anime archetypes, not official game/anime IP | Selection-thumbnail + status-plate portraits for the 15-character cast. |
| `apps/web/public/backgrounds/*.jpg` (12 files) | AI-generated original artwork (Amoji project) | Same as above; Shinkai-inspired original scenic paintings | Painted anime backdrops for all 12 scenes; gradient fallbacks remain in `prefs.ts`. |
