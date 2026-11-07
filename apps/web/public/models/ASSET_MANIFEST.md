# Amoji Asset Manifest

Every binary in this directory (top level or under `cast/`) must have an entry. CI fails on unmanifested files.

Live companion cast (**44 characters**) streams from GitHub Releases; binaries are **not** committed to git (`models/want/` stays `.gitkeep`). Pages downloads each roster `modelUrl` at build time.

- **`free-library-want-2026-10-12`** ??the want-list release ([release](https://github.com/MonMonMars/amoji-app/releases/tag/free-library-want-2026-10-12)). It carries 46 assets; the app ships 44. `a04-avatarsample-a` and `a05-avatarsample-c` left the roster on 2026-11-08 — see "Removed from the roster" below.

## Shipped binaries (in-repo)

| File | License | Source | Notes |
|---|---|---|---|
| seed-san.vrm | VRM Public License 1.0 (https://vrm.dev/en/licenses/1.0/index) ??"Seed-san" model by VirtualCast, Inc.; credit notation required | Official VRM 1.0 conformance sample: https://github.com/vrm-c/vrm-specification/tree/master/samples/Seed-san | Licensed fallback avatar for open-source and GitHub Pages builds. Also the universal fallback whenever a cast file is missing or fails to load. Credit: Seed-san model by VirtualCast, Inc. |

## Live cast — free-library WANT list (44 characters)

Source of truth: `apps/web/lib/want-roster.json` ??generated `apps/web/lib/characters-want.ts` (`node scripts/generate-want-cast.mjs`).

| Character id | Gender | Remote VRM |
|---|---|---|
| a01-shino | female | `??a01-shino.vrm` |
| a02-shibu | female | `??a02-shibu.vrm` |
| a03-fumiriya | female | `??a03-fumiriya.vrm` |
| a10-agahomei-normal | female | `??a10-agahomei-normal.vrm` |
| a14-vivi | female | `??a14-vivi.vrm` |
| a16-vita | female | `??a16-vita.vrm` |
| a17-victoria-rubin | female | `??a17-victoria-rubin.vrm` |
| a23-hairsample-female | female | `??a23-hairsample-female.vrm` |
| a24-hairsample-male | male | `??a24-hairsample-male.vrm` |
| a61-saori-kamiya-llunne | female | `??a61-saori-kamiya-llunne.vrm` |
| a63-hinoame-satuki-mei-sirayuki | female | `??a63-hinoame-satuki-mei-sirayuki.vrm` |
| a64-lily-lily-animeit | female | `??a64-lily-lily-animeit.vrm` |
| a70-vtuber-aihina-sample | female | `??a70-vtuber-aihina-sample.vrm` |
| a71-mary-sweety | female | `??a71-mary-sweety.vrm` |
| a74-mizuka | female | `??a74-mizuka.vrm` |
| a75-sorano | female | `??a75-sorano.vrm` |
| a77-sasha | female | `??a77-sasha.vrm` |
| a79-amami-karasu | female | `??a79-amami-karasu.vrm` |
| a81-cinna | female | `??a81-cinna.vrm` |
| a82-renel-bonnie | female | `??a82-renel-bonnie.vrm` |
| a83-ao-witch | female | `??a83-ao-witch.vrm` |
| a85-kara | female | `??a85-kara.vrm` |
| a89-rurina | female | `??a89-rurina.vrm` |
| a93-edokko | female | `??a93-edokko.vrm` |
| a94-rita | male | `??a94-rita.vrm` |
| a95-mizu | female | `??a95-mizu.vrm` |
| a96-pee-aruako | female | `??a96-pee-aruako.vrm` |
| a97-pee-saaya | female | `??a97-pee-saaya.vrm` |
| a98-ethan | male | `??a98-ethan.vrm` |
| a99-miyora | female | `??a99-miyora.vrm` |
| a103-rockredgradientjk | female | `??a103-rockredgradientjk.vrm` |
| a104-simplebrownsailorjk | female | `??a104-simplebrownsailorjk.vrm` |
| a105-serizawa-aoi | female | `??a105-serizawa-aoi.vrm` |
| a106-auroragradhairjk | female | `??a106-auroragradhairjk.vrm` |
| a107-dm-office-casual | male | `??a107-dm-office-casual.vrm` |
| a109-riona | female | `??a109-riona.vrm` |
| a112-mahochan-jk | female | `??a112-mahochan-jk.vrm` |
| a114-sailor-cardigan-girl | female | `??a114-sailor-cardigan-girl.vrm` |
| a116-haru-uniform | female | `??a116-haru-uniform.vrm` |
| a117-erigawa-risa | female | `??a117-erigawa-risa.vrm` |
| a119-kanami-uniform | female | `??a119-kanami-uniform.vrm` |
| a120-morikawa-yuki-summer-uniform | female | `??a120-morikawa-yuki-summer-uniform.vrm` |
| a121-nagano-mami-uniform | female | `??a121-nagano-mami-uniform.vrm` |
| a122-shiratori-hikari-shifuku | female | `??a122-shiratori-hikari-shifuku.vrm` |

Base URL for every row: `https://github.com/MonMonMars/amoji-app/releases/download/free-library-want-2026-10-12/` (matching PNG portraits at the same path with `.png`).

### FROZEN — do not re-export (a14, a16, a17)

`a14-vivi`, `a16-vita` and `a17-victoria-rubin` are **CC0 only because they are
β-era VRoid Studio exports**. VRoid Studio v0.14.0 (2021-06-29) renamed these
samples to AvatarSample_E/F/G **and disabled CC0 export for them**:

> "- Copyright Waiver (CC0) when exporting VRM files for the new sample models has been disabled"

Their CC0 status therefore lives entirely in the bytes already on disk
(`licenseName=CC0` in each file). Opening any of the three in VRoid Studio
≥ v0.14.0 and re-saving **permanently loses the CC0 declaration** — the file
comes back with `licenseName=Other` and no licence URL, i.e. an unlicensed model,
and no document can restore it. Never re-export, re-bake or "repair" these three.
If one is ever damaged, the only safe move is to drop it from the roster.

### Removed from the roster 2026-11-08

| Character id | Embedded licence | Why removed |
|---|---|---|
| a04-avatarsample-a | `licenseName=Other`, `otherPermissionUrl` empty, title `AvatarSample_A` | VRoidPreset_A original. Terms prohibit "redistributing the .vroid or VRM file of the sample model ... in exchange for a fee". |
| a05-avatarsample-c | `licenseName=Other`, `otherPermissionUrl` empty, title `AvatarSample_C` | VRoidPreset_C original, same clause. |

Both still exist in the release and in local `want/` trees; they are simply no
longer roster entries, so nothing loads them. `apps/web/lib/castNo.ts` keeps their
badge numbers (4 and 5) reserved so the rest of the fan is not renumbered.

**License / credits**: every model that requires attribution is credited on the `/credits` page (`apps/web/lib/credits.ts`), with the strings read from the VRM's own embedded metadata. Roster `creditNotes` summarise the rest.

- VRoid Sendagaya Shino/Shibu and Sakurada Fumiriya: **CC0**
- **Removed 2026-11-08:** AvatarSample_A/C — VRoidPreset originals. The pixiv terms forbid redistributing the sample VRM file in exchange for a fee, which is what bundling it in a paid product is. Not merely unattributed: affirmatively restricted.
- Other Hub/BOOTH free commercial entries: follow each folder README.txt
- Removed from public picker: kitagawa, kizuna, and other unverified agent3 cast slots

## Retired local cast (`cast/*.vrm`) — CC0 only

The former in-repo `cast/` binaries are **retired** from the active picker (face-lab / local demos only). Every file that remains is **CC0**, verified by reading the embedded VRM licence metadata (`extensions.VRM.meta.licenseName`) out of each file — not from a folder README.

`.gitignore` blocks `apps/web/public/models/cast/*.vrm`, so a new binary here cannot be committed without deliberately editing that rule. Each file on disk must still stay listed below for CI (`apps/web/tests/assets.test.ts`).

| Cast file | License | Source | Notes |
|---|---|---|---|
| cast/cyrus.vrm | CC0 | Polygonal Mind (100Avatars, "Udom") | local demo |
| cast/fumiriya.vrm | CC0 | VRoid official sample (Sakurada Fumiriya) | same model as `a03-fumiriya` |
| cast/hina.vrm | CC0 | Polygonal Mind ("Lydia") | local demo |
| cast/juno.vrm | CC0 | Polygonal Mind | local demo; never a public roster id |
| cast/kael.vrm | CC0 | Polygonal Mind ("Rose") | local demo |
| cast/luna.vrm | CC0 | CC0 (VIPEDeployer, "Cyberpal") | local demo |
| cast/lydia.vrm | CC0 | Polygonal Mind ("Lydia") | local demo |
| cast/mikel.vrm | CC0 | Polygonal Mind ("Mikel") | local demo |
| cast/mimi.vrm | CC0 | Polygonal Mind ("Rabbit") | local demo |
| cast/mio.vrm | CC0 | Polygonal Mind ("Kate") | local demo |
| cast/olivia.vrm | CC0 | Polygonal Mind ("Olivia") | local demo |
| cast/rin.vrm | CC0 | Polygonal Mind ("Chill") | local demo |
| cast/sumire.vrm | CC0 | Polygonal Mind ("Jennifer") | local demo |
| cast/yuki.vrm | CC0 | Polygonal Mind ("Olivia") | local demo |

### Purged 2026-11-08 (licensing)

16 binaries were removed from git and from the tree. Re-adding any of them needs a fresh licence review; most are not merely unattributed but affirmatively restricted.

| Cast file | Embedded licence | Why removed |
|---|---|---|
| cast/kitagawa.vrm | `Other` + Hub params `corporate_commercial_use=disallow`, `redistribution=disallow`, `personal_commercial_use=nonprofit` | Copyrighted anime character (喜多川海夢), title in the file |
| cast/kizuna.vrm | VRM 1.0 `commercialUsage=personalNonProfit`, `allowRedistribution=false` | Kizuna AI official model |
| cast/hana.vrm | `Redistribution_Prohibited` | licence string is the prohibition |
| cast/nana.vrm | `Redistribution_Prohibited` | same model as hana |
| cast/alicia.vrm | `Other`, `https://3d.nicovideo.jp/alicia/rule.html` | Dwango "Alicia Solid", separate terms |
| cast/atlas.vrm | `Other`, no URL, author "jin", title "masc vroid" | provenance unprovable |
| cast/vroid-male.vrm | `Other`, no URL, author "jin", title "masc vroid" | provenance unprovable |
| cast/zane.vrm | `Other`, no URL, author "jin", title "masc vroid" | provenance unprovable |
| cast/mei.vrm | `Other`, no URL, title "AvatarSample_B" | VRoidPreset original |
| cast/elio.vrm | `Other`, no URL, title "AvatarSample_C" | VRoidPreset original |
| cast/avatarsample-a.vrm | `Other`, no URL, title "AvatarSample_A" | VRoidPreset original |
| cast/ember.vrm | CC_BY (VTubeMe, "MetaPerson Avatar") | attribution required; retired demo meshes carry no credit surface |
| cast/kai.vrm | CC_BY (VTubeMe) | same |
| cast/nova.vrm | CC_BY (VTubeMe) | same |
| cast/rex.vrm | CC_BY (VTubeMe) | same |
| cast/sky.vrm | CC_BY (VTubeMe) | same |


## Motion library ??`anims/`

Real VRMA animation clips (VRMC_vrm_animation), force-committed for GitHub Pages. Body-only at playback ??facial expressions stay on the emotion engine.

| File | Used for |
|---|---|
| anims/IdleBreathCalm.vrma | idle rotation only (b01 primary default) |
| anims/StandardIdle.vrma | idle rotation only (b02 local neutral stand) |
| anims/LookAround.vrma | optional side-rail pick (b03; not default rotation) |
| anims/Relax.vrma | optional side-rail pick (b04; not default rotation) |
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
| anims/lib_C112.vrma | dance GentleSway (Rokoko->VRMA local) |
| anims/lib_C113.vrma | dance DancingMedium (Rokoko->VRMA local) |
| anims/lib_C114.vrma | dance DancingParty (Rokoko->VRMA local) |
| anims/lib_C111.vrma | dance DoTheRobot (Rokoko->VRMA local) |
| anims/lib_C118.vrma | dance ClubDancer01 (Rokoko->VRMA local) |
| anims/lib_C119.vrma | dance ClubDancer02 (Rokoko->VRMA local) |
| anims/lib_C124.vrma | dance ClubDancer05 (Rokoko->VRMA local) |
| anims/lib_C116.vrma | perform HypeMan (Rokoko->VRMA local) |
| anims/lib_C117.vrma | perform DJ (Rokoko->VRMA local) |
| anims/lib_C128.vrma | perform DJ02 (Rokoko->VRMA local) |
| anims/lib_C60.vrma | dance JazzDancing (Mixamo->VRMA local) |
| anims/lib_C09.vrma | dance KayKitDance (KayKit retarget->Mixamo->VRMA local) |
| anims/lib_C04.vrma | idle KayKitIdle (KayKit retarget->Mixamo->VRMA local) |
| anims/lib_C25.vrma | idle Bored (Mixamo->VRMA local) |
| anims/lib_C36.vrma | idle RokokoArguing (Rokoko Mixamo FBX->VRMA local; hips bone injected) |
| anims/lib_C37.vrma | idle RokokoChatting (Rokoko Mixamo FBX->VRMA local) |
| anims/lib_C38.vrma | idle RokokoChatting02 (Rokoko Mixamo FBX->VRMA local) |
| anims/lib_C39.vrma | idle RokokoConversation (Rokoko Mixamo FBX->VRMA local) |
| anims/lib_C41.vrma | idle RokokoListeningToMusic (Rokoko Mixamo FBX->VRMA local) |
| anims/lib_C42.vrma | idle RokokoLookingAround02 (Rokoko Mixamo FBX->VRMA local; unique #13) |
| anims/lib_C44.vrma | idle RokokoWatchingSomething (Rokoko Mixamo FBX->VRMA local) |
| anims/lib_C57.vrma | idle NervouslyLookAround (Mixamo->VRMA local) |
| anims/lib_C64.vrma | idle DefeatIdle (Mixamo->VRMA local) |
| anims/lib_C02.vrma | idle Idle_Loop (Quaternius UAL Unity FBX→VRMA; #4) |
| anims/lib_C11.vrma | idle FoldArms (Quaternius UAL2 FBX→VRMA; #6) |
| anims/lib_C65.vrma | idle Idle_Talking_Loop (Quaternius UAL; #24) |
| anims/lib_C75.vrma | idle NinjaJump_Idle_Loop (Quaternius UAL2; #25) |
| anims/IdleKenneyStand.vrma | idle Kenney Survivors (CC0; #26) |
| anims/IdleKaykitB.vrma | idle KayKit Rig_Medium Idle_B retarget→Mixamo (#37) |
| anims/IdleKaykitA.vrma | idle KayKit Rig_Medium Idle_A retarget→Mixamo (#38) |
| anims/IdleQuaterniusHuman.vrma | idle Quaternius AnimatedHuman Idle (#39) |
| anims/IdleMixamoBreathing.vrma | idle Mixamo BreathingIdle (#40) |
| anims/IdleMixamoHappy.vrma | idle Mixamo HappyIdle (#41) |

Additional dormant clips ship on disk for future triggers (see repo `anims/` directory).

## Retired / banned assets

| File | Why |
|---|---|
| marin.vrm | Copyright-flagged; must never be committed under any path. |
| cast/kitagawa.vrm, cast/kizuna.vrm, cast/hana.vrm, cast/nana.vrm, cast/alicia.vrm | Deleted 2026-11-08 — the embedded licence on each forbids redistribution; see "Purged 2026-11-08" above. |
| juno.vrm (Kizuna AI "Kamatte") | Never committed; public builds use seed-san.vrm. |

## Modular head / body GLBs ??drop-in, not committed here

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

## Companion art ??outside this directory

Portraits for the want-list cast are the release PNGs (https URLs in `prefs.ts`). Legacy `/portraits/*` art remains for retired characters / face-lab only.

