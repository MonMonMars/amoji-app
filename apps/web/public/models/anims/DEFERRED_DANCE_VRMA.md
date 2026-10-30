# Deferred dance / perform VRMA (FBX to VRMA)

Path B follow-up after #50. Preferred clip ids are lib_C### under
pps/web/public/models/anims/. Plant-feet runtime already pins hips/feet
for every loaded clip that does not free feet. Local models/anims/lib_C*.vrma
always wins over interim remotes (dancePerfClipSources).

## Shipped this PR (local FBX->VRMA on DESKTOP)

Converted with Blender 5.2 + VRM Addon l_ext.user_default.vrm 4.10.2
(D:\Blender\projects\mon-character\free-library\fbx_to_vrma.py):

| Id | Name | File | Source FBX |
|---|---|---|---|
| C112 | GentleSway | nims/lib_C112.vrma | dance/rokoko/C112_Rokoko_GentleSway.fbx |
| C113 | DancingMedium | nims/lib_C113.vrma | dance/rokoko/C113_Rokoko_DancingMedium.fbx |
| C114 | DancingParty | nims/lib_C114.vrma | dance/rokoko/C114_Rokoko_DancingParty.fbx |
| C111 | DoTheRobot | nims/lib_C111.vrma | dance/rokoko/C111_Rokoko_DoTheRobot.fbx |
| C118 | ClubDancer01 | nims/lib_C118.vrma | dance/rokoko/C118_Rokoko_ClubDancer01.fbx |
| C119 | ClubDancer02 | nims/lib_C119.vrma | dance/rokoko/C119_Rokoko_ClubDancer02.fbx |
| C124 | ClubDancer05 | nims/lib_C124.vrma | dance/rokoko/C124_Rokoko_ClubDancer05.fbx |
| C116 | HypeMan | nims/lib_C116.vrma | idle/rokoko_perform/C116_Rokoko_HypeMan.fbx |
| C117 | DJ | nims/lib_C117.vrma | idle/rokoko_perform/C117_Rokoko_DJ.fbx |
| C128 | DJ02 | nims/lib_C128.vrma | idle/rokoko_perform/C128_Rokoko_DJ02.fbx |
| C60 | JazzDancing | nims/lib_C60.vrma | dance/mixamo/JazzDancing.fbx |

DANCE_CLIP_SOURCES marks these status: 'local'. Interim Mixamo-class remotes
for C110/C61/C62/C03 from #50 remain until local FBX for those ids lands.

## Still deferred

| Id | Name | Source FBX (free-library) | Notes |
|---|---|---|---|
| C09 | KayKitDance | nimations/dance/kaykit/Dance.fbx | KayKit rig is **not** Mixamo/humanoid — only 6 bones (Body, Head, rmLeft/Right, handSlotLeft/Right). VRM 1.0 required humanoid bones cannot be assigned; skip until retargeted onto a Mixamo/VRM humanoid.

Also plant-feet shortlist idle gallery picks that lack FBX->VRMA remain deferred (C110 still interim-remote).

Ready idle VRMAs already in-repo: IdleBreathCalm.vrma, StandardIdle.vrma
(from D:\GrokBot_Files\amoji-idle-library-ready\).

## Convert recipe (DESKTOP)

1. Blender: D:\Blender\5.2.0\blender.exe with BLENDER_USER_RESOURCES=D:\Blender\userdata
2. VRM Addon enabled as l_ext.user_default.vrm (extensions/user_default/vrm)
3. Run: lender --background --python D:\Blender\projects\mon-character\free-library\fbx_to_vrma.py
4. Copy rma-out/lib_C*.vrma -> pps/web/public/models/anims/
5. Manifest row + DANCE_CLIP_SOURCES status -> local
