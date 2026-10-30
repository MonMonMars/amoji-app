# Deferred dance / perform VRMA (FBX to VRMA)

Path B follow-up after #50/#51. Preferred clip ids are lib_C### under
`apps/web/public/models/anims/`. Plant-feet runtime already pins hips/feet
for every loaded clip that does not free feet. Local models/anims/lib_C*.vrma
always wins over interim remotes (dancePerfClipSources).

## Shipped (local FBX->VRMA on DESKTOP)

### #51 — direct Mixamo/Rokoko humanoid convert

Converted with Blender 5.2 + VRM Addon `bl_ext.user_default.vrm` 4.10.2
(`D:\Blender\projects\mon-character\free-library\fbx_to_vrma.py`):

| Id | Name | File | Source FBX |
|---|---|---|---|
| C112 | GentleSway | anims/lib_C112.vrma | dance/rokoko/C112_Rokoko_GentleSway.fbx |
| C113 | DancingMedium | anims/lib_C113.vrma | dance/rokoko/C113_Rokoko_DancingMedium.fbx |
| C114 | DancingParty | anims/lib_C114.vrma | dance/rokoko/C114_Rokoko_DancingParty.fbx |
| C111 | DoTheRobot | anims/lib_C111.vrma | dance/rokoko/C111_Rokoko_DoTheRobot.fbx |
| C118 | ClubDancer01 | anims/lib_C118.vrma | dance/rokoko/C118_Rokoko_ClubDancer01.fbx |
| C119 | ClubDancer02 | anims/lib_C119.vrma | dance/rokoko/C119_Rokoko_ClubDancer02.fbx |
| C124 | ClubDancer05 | anims/lib_C124.vrma | dance/rokoko/C124_Rokoko_ClubDancer05.fbx |
| C116 | HypeMan | anims/lib_C116.vrma | idle/rokoko_perform/C116_Rokoko_HypeMan.fbx |
| C117 | DJ | anims/lib_C117.vrma | idle/rokoko_perform/C117_Rokoko_DJ.fbx |
| C128 | DJ02 | anims/lib_C128.vrma | idle/rokoko_perform/C128_Rokoko_DJ02.fbx |
| C60 | JazzDancing | anims/lib_C60.vrma | dance/mixamo/JazzDancing.fbx |

### #52 — KayKit C09 retarget

KayKit `Dance.fbx` is a **6-bone non-humanoid** (Body, Head, armLeft/Right,
handSlotLeft/Right; CC0). Direct VRM1 humanoid assign fails. Retargeted onto
Mixamo JazzDancing skeleton (legs left at rest for plant-feet), then exported:

| Id | Name | File | Source FBX | Skeleton donor |
|---|---|---|---|---|
| C09 | KayKitDance | anims/lib_C09.vrma | dance/kaykit/Dance.fbx | dance/mixamo/JazzDancing.fbx |

Script: `D:\Blender\projects\mon-character\free-library\kaykit_retarget_to_vrma.py`
(map Body→Hips/Spine*, Head→Neck/Head, arm*→Arm/ForeArm, handSlot*→Hand;
hip translation clamped; frames 1–51 ≈ 1.67s). Validated: glTF + VRMC_vrm_animation,
52 humanBones, 35 channels.

DANCE_CLIP_SOURCES marks C09 status: `local`. Interim Mixamo-class remotes
for C110/C61/C62/C03 from #50 remain until local FBX for those ids lands.

## Still deferred

None for the KayKit/Rokoko/Jazz dance shortlist above.

Also plant-feet shortlist idle gallery picks that lack FBX->VRMA remain deferred
(C110 still interim-remote).

Ready idle VRMAs already in-repo: IdleBreathCalm.vrma, StandardIdle.vrma
(from `D:\GrokBot_Files\amoji-idle-library-ready\`).

## Convert recipe (DESKTOP)

1. Blender: `D:\Blender\5.2.0\blender.exe` with `BLENDER_USER_RESOURCES=D:\Blender\userdata`
2. VRM Addon enabled as `bl_ext.user_default.vrm` (extensions/user_default/vrm)
3. Humanoid FBX: `blender --background --python ...\fbx_to_vrma.py -- --only C60`
4. KayKit C09: `blender --background --python ...\kaykit_retarget_to_vrma.py`
5. Copy `vrma-out/lib_C*.vrma` -> `apps/web/public/models/anims/`
6. Manifest row + DANCE_CLIP_SOURCES status -> local
