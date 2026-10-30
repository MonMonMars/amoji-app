# Amoji Asset Manifest

Every binary in this directory (top level or under `cast/`) must have an entry. CI fails on unmanifested files.

Live companion cast (51 characters) streams from GitHub Releases; binaries are **not** committed to git (`models/want/` stays `.gitkeep`). Pages downloads each roster `modelUrl` at build time.

- **`free-library-want-2026-10-12`** ??original 46 want-list characters ([release](https://github.com/MonMonMars/amoji-app/releases/tag/free-library-want-2026-10-12))
- **`free-library-realistic-2026-10-18`** ??five realistic keepers A459, A460, A461, A463, A468 ([release](https://github.com/MonMonMars/amoji-app/releases/tag/free-library-realistic-2026-10-18))

## Shipped binaries (in-repo)

| File | License | Source | Notes |
|---|---|---|---|
| seed-san.vrm | VRM Public License 1.0 (https://vrm.dev/en/licenses/1.0/index) ??"Seed-san" model by VirtualCast, Inc.; credit notation required | Official VRM 1.0 conformance sample: https://github.com/vrm-c/vrm-specification/tree/master/samples/Seed-san | Licensed fallback avatar for open-source and GitHub Pages builds. Also the universal fallback whenever a cast file is missing or fails to load. Credit: Seed-san model by VirtualCast, Inc. |

## Live cast ??free-library WANT list (46 characters)

Source of truth: `apps/web/lib/want-roster.json` ??generated `apps/web/lib/characters-want.ts` (`node scripts/generate-want-cast.mjs`).

| Character id | Gender | Remote VRM |
|---|---|---|
| a01-shino | female | `??a01-shino.vrm` |
| a02-shibu | female | `??a02-shibu.vrm` |
| a03-fumiriya | female | `??a03-fumiriya.vrm` |
| a04-avatarsample-a | female | `??a04-avatarsample-a.vrm` |
| a05-avatarsample-c | female | `??a05-avatarsample-c.vrm` |
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

**License / credits** (from roster `creditNotes`):

- VRoid Sendagaya Shino/Shibu and Sakurada Fumiriya: **CC0**
- AvatarSample_A/C: VRoid sample terms ??commercial OK; do not sell raw VRM alone
- Other Hub/BOOTH free commercial entries: follow each folder README.txt
- Removed from public picker: kitagawa, kizuna, and other unverified agent3 cast slots

## Live cast ??realistic keepers (5 characters)

Appended to the same roster after the original 46. They are selectable in the companion picker. Gallery `SKIP_STATIC` does not apply to cast selection (unrigged A457/A458/A462/A464???67 stay out).

| Character id | Library | Gender | Remote VRM |
|---|---|---|---|
| a459-chinesewarriormonk | A459 | male | `??a459-chinesewarriormonk.vrm` |
| a460-freerealisticfemale | A460 | female | `??a460-freerealisticfemale.vrm` |
| a461-fashionruffle | A461 | female | `??a461-fashionruffle.vrm` |
| a463-sophia | A463 | female | `??a463-sophia.vrm` |
| a468-eric | A468 | male | `??a468-eric.vrm` |

Base URL for every row: `https://github.com/MonMonMars/amoji-app/releases/download/free-library-realistic-2026-10-18/` (matching PNG portraits at the same path with `.png`).

**License / credits** ??CC BY 4.0 Sketchfab, credit required:

- A459 Chinese Warrior Monk: Sketchfab fayjayfay
- A460 Free Realistic Female: Sketchfab nepalvr360
- A461 Fashion Ruffle: Sketchfab
- A463 Sophia: Sketchfab RenderPeople
- A468 Eric: Sketchfab

## Retired local cast (`cast/*.vrm`) ??demo-only

The former in-repo `cast/` binaries are **retired** from the active picker (face-lab / local demos only). Each file on disk must stay listed here for CI.

| Cast file | Status |
|---|---|
| cast/alicia.vrm | Retired ??unverified agent3 demo |
| cast/atlas.vrm | Retired ??unverified agent3 demo |
| cast/avatarsample-a.vrm | Retired ??local demo |
| cast/cyrus.vrm | Retired ??local demo |
| cast/elio.vrm | Retired ??local demo |
| cast/ember.vrm | Retired ??unverified agent3 demo |
| cast/fumiriya.vrm | Retired ??local demo |
| cast/hana.vrm | Retired ??local demo |
| cast/hina.vrm | Retired ??unverified agent3 demo |
| cast/juno.vrm | Retired ??Kizuna-style demo; never public roster |
| cast/kael.vrm | Retired ??local demo |
| cast/kai.vrm | Retired ??local demo |
| cast/kitagawa.vrm | Retired ??copyright-risk; removed from picker |
| cast/kizuna.vrm | Retired ??copyright-risk; removed from picker |
| cast/luna.vrm | Retired ??local demo |
| cast/lydia.vrm | Retired ??local demo |
| cast/mei.vrm | Retired ??unverified agent3 demo |
| cast/mikel.vrm | Retired ??local demo |
| cast/mimi.vrm | Retired ??local demo |
| cast/mio.vrm | Retired ??unverified agent3 demo |
| cast/nana.vrm | Retired ??local demo |
| cast/nova.vrm | Retired ??unverified agent3 demo |
| cast/olivia.vrm | Retired ??local demo |
| cast/rex.vrm | Retired ??local demo |
| cast/rin.vrm | Retired ??local demo |
| cast/sky.vrm | Retired ??unverified agent3 demo |
| cast/sumire.vrm | Retired ??local demo |
| cast/vroid-male.vrm | Retired ??local demo |
| cast/yuki.vrm | Retired ??unverified agent3 demo |
| cast/zane.vrm | Retired ??local demo |

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
| cast/kitagawa.vrm, cast/kizuna.vrm, etc. | Retired unverified agent3 roster ??not in want-list release. |
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

