# Deferred dance / perform VRMA (FBX → VRMA)

Path B follow-up after #49. Preferred clip ids are `lib_C###` under
`apps/web/public/models/anims/`. Plant-feet runtime already pins hips/feet
for every loaded clip that does not free feet.

## Shipped this PR

- **Measured BPM** from bundled MP3s (`scripts/estimate-audio-bpm.py` →
  `apps/web/lib/measured-bpm.ts` + `public/audio/bpm-map.json`).
  `resolvePerfMotion` prefers measured BPM when confidence >= 0.22; else style defaults.
- **Interim Mixamo-class remotes** (same 3dchat host as Dance/Sing) for:
  - `lib_C110` ← `twistDance.vrma`
  - `lib_C61` ← `hipHopDancing.vrma` / `hipHopDance.vrma`
  - `lib_C62` ← `sambaDancing.vrma` / `rumbaDancing.vrma`
  - `lib_C03` ← `hipHopDance.vrma`
  Local `models/anims/lib_C*.vrma` still preferred when present.
- CompanionCanvas recomputes `timeScale` via `timeScaleForProfile` when a
  preferred `lib_C*` clip is the one that actually plays.

## Still deferred (no VRMA on disk; FBX sources on D:)

| Id | Name | Source FBX (free-library) | Notes |
|---|---|---|---|
| C112 | GentleSway | `animations/dance/rokoko/C112_Rokoko_GentleSway.fbx` | Rokoko; soft ballad |
| C113 | DancingMedium | `animations/dance/rokoko/C113_Rokoko_DancingMedium.fbx` | Rokoko |
| C114 | DancingParty | `animations/dance/rokoko/C114_Rokoko_DancingParty.fbx` | Rokoko |
| C111 | DoTheRobot | `animations/dance/rokoko/C111_Rokoko_DoTheRobot.fbx` | Rokoko |
| C118 | ClubDancer01 | `animations/dance/rokoko/C118_Rokoko_ClubDancer01.fbx` | Rokoko |
| C119 | ClubDancer02 | `animations/dance/rokoko/C119_Rokoko_ClubDancer02.fbx` | Rokoko |
| C124 | ClubDancer05 | `animations/dance/rokoko/C124_Rokoko_ClubDancer05.fbx` | Rokoko |
| C116 | HypeMan | `animations/idle/rokoko_perform/C116_Rokoko_HypeMan.fbx` | Rokoko perform |
| C117 | DJ | `animations/idle/rokoko_perform/C117_Rokoko_DJ.fbx` | Rokoko perform |
| C128 | DJ02 | `animations/idle/rokoko_perform/C128_Rokoko_DJ02.fbx` | Rokoko perform |
| C60 | JazzDancing | `animations/dance/mixamo/JazzDancing.fbx` | Mixamo; embedding-only plan |
| C09 | KayKitDance | `animations/dance/kaykit/Dance.fbx` | CC0 KayKit |

Also plant-feet shortlist C110–C128 idle gallery picks remain FBX until convert.
Ready idle VRMAs already in-repo: `IdleBreathCalm.vrma`, `StandardIdle.vrma`
(from `D:\GrokBot_Files\amoji-idle-library-ready\`).

## Convert recipe (when tooling exists)

1. Import FBX in Blender / Unity humanoid (Mixamo / Rokoko Mixamo-skeleton packs are 30fps).
2. Export VRMA via UniVRM AnimationClipToVrma (or equivalent) targeting VRM 1.0 humanoid.
3. Plant feet / rebase hips offline if needed; runtime `pinPlantedClipTracks` still applies.
4. Drop as `apps/web/public/models/anims/lib_C###.vrma` and add ASSET_MANIFEST row.
5. Mark matching `DANCE_CLIP_SOURCES` entry status (or idle-library `playable: true`).

No in-repo Blender/Unity VRMA exporter script was available on DESKTOP for this PR.
