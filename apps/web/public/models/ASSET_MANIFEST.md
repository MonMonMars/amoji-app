# Amoji Asset Manifest

Every binary in this directory (top level or under `cast/`) must have an entry. CI fails on unmanifested files.

Release tag for the live companion cast: **`free-library-want-2026-10-12`** (46 characters). VRM + PNG assets stream from [GitHub Releases](https://github.com/MonMonMars/amoji-app/releases/tag/free-library-want-2026-10-12); they are **not** committed to git.

## Shipped binaries (in-repo)

| File | License | Source | Notes |
|---|---|---|---|
| seed-san.vrm | VRM Public License 1.0 (https://vrm.dev/en/licenses/1.0/index) — "Seed-san" model by VirtualCast, Inc.; credit notation required | Official VRM 1.0 conformance sample: https://github.com/vrm-c/vrm-specification/tree/master/samples/Seed-san | Licensed fallback avatar for open-source and GitHub Pages builds. Also the universal fallback whenever a cast file is missing or fails to load. Credit: Seed-san model by VirtualCast, Inc. |

## Live cast — free-library WANT list (46 characters)

Source of truth: `apps/web/lib/want-roster.json` → generated `apps/web/lib/characters-want.ts` (`node scripts/generate-want-cast.mjs`).

| Character id | Gender | Remote VRM |
|---|---|---|
| a01-shino | female | `…/a01-shino.vrm` |
| a02-shibu | female | `…/a02-shibu.vrm` |
| a03-fumiriya | female | `…/a03-fumiriya.vrm` |
| a04-avatarsample-a | female | `…/a04-avatarsample-a.vrm` |
| a05-avatarsample-c | female | `…/a05-avatarsample-c.vrm` |
| a10-agahomei-normal | female | `…/a10-agahomei-normal.vrm` |
| a14-vivi | female | `…/a14-vivi.vrm` |
| a16-vita | female | `…/a16-vita.vrm` |
| a17-victoria-rubin | female | `…/a17-victoria-rubin.vrm` |
| a23-hairsample-female | female | `…/a23-hairsample-female.vrm` |
| a24-hairsample-male | male | `…/a24-hairsample-male.vrm` |
| a61-saori-kamiya-llunne | female | `…/a61-saori-kamiya-llunne.vrm` |
| a63-hinoame-satuki-mei-sirayuki | female | `…/a63-hinoame-satuki-mei-sirayuki.vrm` |
| a64-lily-lily-animeit | female | `…/a64-lily-lily-animeit.vrm` |
| a70-vtuber-aihina-sample | female | `…/a70-vtuber-aihina-sample.vrm` |
| a71-mary-sweety | female | `…/a71-mary-sweety.vrm` |
| a74-mizuka | female | `…/a74-mizuka.vrm` |
| a75-sorano | female | `…/a75-sorano.vrm` |
| a77-sasha | female | `…/a77-sasha.vrm` |
| a79-amami-karasu | female | `…/a79-amami-karasu.vrm` |
| a81-cinna | female | `…/a81-cinna.vrm` |
| a82-renel-bonnie | female | `…/a82-renel-bonnie.vrm` |
| a83-ao-witch | female | `…/a83-ao-witch.vrm` |
| a85-kara | female | `…/a85-kara.vrm` |
| a89-rurina | female | `…/a89-rurina.vrm` |
| a93-edokko | female | `…/a93-edokko.vrm` |
| a94-rita | female | `…/a94-rita.vrm` |
| a95-mizu | female | `…/a95-mizu.vrm` |
| a96-pee-aruako | female | `…/a96-pee-aruako.vrm` |
| a97-pee-saaya | female | `…/a97-pee-saaya.vrm` |
| a98-ethan | male | `…/a98-ethan.vrm` |
| a99-miyora | female | `…/a99-miyora.vrm` |
| a103-rockredgradientjk | female | `…/a103-rockredgradientjk.vrm` |
| a104-simplebrownsailorjk | female | `…/a104-simplebrownsailorjk.vrm` |
| a105-serizawa-aoi | female | `…/a105-serizawa-aoi.vrm` |
| a106-auroragradhairjk | female | `…/a106-auroragradhairjk.vrm` |
| a107-dm-office-casual | female | `…/a107-dm-office-casual.vrm` |
| a109-riona | female | `…/a109-riona.vrm` |
| a112-mahochan-jk | female | `…/a112-mahochan-jk.vrm` |
| a114-sailor-cardigan-girl | female | `…/a114-sailor-cardigan-girl.vrm` |
| a116-haru-uniform | female | `…/a116-haru-uniform.vrm` |
| a117-erigawa-risa | female | `…/a117-erigawa-risa.vrm` |
| a119-kanami-uniform | female | `…/a119-kanami-uniform.vrm` |
| a120-morikawa-yuki-summer-uniform | female | `…/a120-morikawa-yuki-summer-uniform.vrm` |
| a121-nagano-mami-uniform | female | `…/a121-nagano-mami-uniform.vrm` |
| a122-shiratori-hikari-shifuku | female | `…/a122-shiratori-hikari-shifuku.vrm` |

Base URL for every row: `https://github.com/MonMonMars/amoji-app/releases/download/free-library-want-2026-10-12/` (matching PNG portraits at the same path with `.png`).

**License / credits** (from roster `creditNotes`):

- VRoid Sendagaya Shino/Shibu and Sakurada Fumiriya: **CC0**
- AvatarSample_A/C: VRoid sample terms — commercial OK; do not sell raw VRM alone
- Other Hub/BOOTH free commercial entries: follow each folder README.txt
- Removed from public picker: kitagawa, kizuna, and other unverified agent3 cast slots

## Retired local cast (`cast/*.vrm`) — demo-only

The former in-repo `cast/` binaries are **retired** from the active picker (face-lab / local demos only). Each file on disk must stay listed here for CI.

| Cast file | Status |
|---|---|
| cast/alicia.vrm | Retired — unverified agent3 demo |
| cast/atlas.vrm | Retired — unverified agent3 demo |
| cast/avatarsample-a.vrm | Retired — local demo |
| cast/cyrus.vrm | Retired — local demo |
| cast/elio.vrm | Retired — local demo |
| cast/ember.vrm | Retired — unverified agent3 demo |
| cast/fumiriya.vrm | Retired — local demo |
| cast/hana.vrm | Retired — local demo |
| cast/hina.vrm | Retired — unverified agent3 demo |
| cast/juno.vrm | Retired — Kizuna-style demo; never public roster |
| cast/kael.vrm | Retired — local demo |
| cast/kai.vrm | Retired — local demo |
| cast/kitagawa.vrm | Retired — copyright-risk; removed from picker |
| cast/kizuna.vrm | Retired — copyright-risk; removed from picker |
| cast/luna.vrm | Retired — local demo |
| cast/lydia.vrm | Retired — local demo |
| cast/mei.vrm | Retired — unverified agent3 demo |
| cast/mikel.vrm | Retired — local demo |
| cast/mimi.vrm | Retired — local demo |
| cast/mio.vrm | Retired — unverified agent3 demo |
| cast/nana.vrm | Retired — local demo |
| cast/nova.vrm | Retired — unverified agent3 demo |
| cast/olivia.vrm | Retired — local demo |
| cast/rex.vrm | Retired — local demo |
| cast/rin.vrm | Retired — local demo |
| cast/sky.vrm | Retired — unverified agent3 demo |
| cast/sumire.vrm | Retired — local demo |
| cast/vroid-male.vrm | Retired — local demo |
| cast/yuki.vrm | Retired — unverified agent3 demo |
| cast/zane.vrm | Retired — local demo |

## Motion library — `anims/`

Real VRMA animation clips (VRMC_vrm_animation), force-committed for GitHub Pages. Body-only at playback — facial expressions stay on the emotion engine.

| File | Used for |
|---|---|
| anims/IdleBreathCalm.vrma | idle rotation (primary default) |
| anims/StandardIdle.vrma | idle rotation (local neutral stand; vendored, not remote) |
| anims/LookAround.vrma | idle rotation (curious variant) |
| anims/Relax.vrma | idle rotation (soft variant) |
| (remote) weightShift.vrma | optional idle if fetch succeeds |
| anims/IdleNeutral.vrma | on disk, out of the default rotation (neck pitched down) |
| anims/Thinking.vrma | on disk, out of the default rotation (head pitched down) |
| anims/Impatient.vrma | on disk, out of the default rotation |
| anims/IdleChinHand.vrma | on disk, out of the default rotation (arms into torso) |
| anims/IdleSassy.vrma | on disk, out of the default rotation (arms into torso) |
| anims/IdleHug.vrma | on disk, out of the default rotation (arms into torso) |
| anims/Sleepy.vrma | on disk, out of the default rotation |
| anims/Jump.vrma | performance clip (move trigger) |
| anims/Angry.vrma | performance clip (mood: anger) |
| anims/Sad.vrma | performance clip (mood: sad) |
| anims/Surprised.vrma | performance clip (reaction) |
| anims/Blush.vrma | performance clip |
| anims/Clapping.vrma | performance clip |
| anims/Goodbye.vrma | performance clip |
| anims/Cheer.vrma | performance clip |
| anims/Idea.vrma | performance clip |

Additional dormant clips ship on disk for future triggers (see repo `anims/` directory).

## Retired / banned assets

| File | Why |
|---|---|
| marin.vrm | Copyright-flagged; must never be committed under any path. |
| cast/kitagawa.vrm, cast/kizuna.vrm, etc. | Retired unverified agent3 roster — not in want-list release. |
| juno.vrm (Kizuna AI "Kamatte") | Never committed; public builds use seed-san.vrm. |

## Modular head / body GLBs — drop-in, not committed here

Female demo wardrobe (head = identity, body = outfit). The viewer loads these when the files exist and otherwise keeps the single-VRM path. **Do not re-split. Do not rescale the head.** Copy instructions: `modular/README.md`. Source folder on Mon's PC: `D:\Blender\projects\mon-character\free-library\modular\`.

| Path | Role |
|---|---|
| modular/A02/A02_head.glb | Shibu head (identity) |
| modular/A02/A02_body.glb | Shibu outfit |
| modular/A10/A10_head.glb | AgahoMei Normal head (identity) |
| modular/A10/A10_body.glb | AgahoMei outfit |
| modular/A119/A119_head.glb | Kanami Uniform head (identity) |
| modular/A119/A119_body.glb | Kanami outfit |
| modular/A120/A120_head.glb | present in the library; not a demo identity |
| modular/A120/A120_body.glb | Morikawa Yuki Summer Uniform outfit |
| modular/A106/A106_head.glb | present in the library; not a demo identity |
| modular/A106/A106_body.glb | AuroraGradHairJK outfit |

## Companion art — outside this directory

Portraits for the want-list cast are the release PNGs (https URLs in `prefs.ts`). Legacy `/portraits/*` art remains for retired characters / face-lab only.
