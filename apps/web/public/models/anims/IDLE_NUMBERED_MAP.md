# Idle numbered map (# → name → clipId → playable)

Source of truth: `apps/web/lib/idle-library.ts`. Chat says "use #N".
Defaults: **only #1 IdleBreathCalm + #2 StandardIdle** (`defaultEnabled`).

| # | name | clipId | Cxx | playable | notes |
|---|------|--------|-----|----------|-------|
| 1 | IdleBreathCalm | IdleBreathCalm | — | yes | default ON |
| 2 | StandardIdle | StandardIdle | — | yes | default ON |
| 3 | RokokoEverydayIdles | LookAround | C01 | yes | LookingAround (unique) |
| 4 | Idle_Loop | lib_C02 | C02 | yes | Quaternius UAL Idle_Loop (#54) |
| 5 | KayKitIdle | lib_C04 | C04 | yes | KayKit retarget (#53) |
| 6 | UAL2FoldArms | lib_C11 | C11 | yes | Quaternius UAL2 FoldArms (#54) |
| 7 | Bored | lib_C25 | C25 | yes | Mixamo (#53) |
| 8 | RokokoArguing | lib_C36 | C36 | yes | Rokoko (#53) |
| 9 | RokokoChatting | lib_C37 | C37 | yes | Rokoko (#53) |
| 10 | RokokoChatting02 | lib_C38 | C38 | yes | Rokoko (#53) |
| 11 | RokokoConversation | lib_C39 | C39 | yes | Rokoko (#53) |
| 12 | RokokoListeningToMusic | lib_C41 | C41 | yes | Rokoko (#53) |
| 13 | RokokoLookingAround02 | lib_C42 | C42 | yes | unique LookingAround02 VRMA |
| 14 | RokokoWatchingSomething | lib_C44 | C44 | yes | Rokoko (#53) |
| 15 | StandingGreeting | HelloWave | C53 | yes | |
| 16 | Shrugging | Shrug | C54 | yes | |
| 17 | Yawn | Sleepy | C55 | yes | |
| 18 | Thinking | Thinking | C56 | yes | |
| 19 | NervouslyLookAround | lib_C57 | C57 | yes | Mixamo (#53) |
| 20 | StandingThumbsUp | ThumbsUp | C58 | yes | |
| 21 | StandingClap | Clapping | C59 | yes | |
| 22 | VictoryIdle | Cheer | C63 | yes | |
| 23 | DefeatIdle | lib_C64 | C64 | yes | Mixamo (#53) |
| 24 | UAL1Talking | lib_C65 | C65 | yes | Quaternius Idle_Talking_Loop (#54) |
| 25 | UAL2NinjaIdle | lib_C75 | C75 | yes | Quaternius NinjaJump_Idle (#54) |
| 26 | KenneySurvivorsIdle | IdleKenneyStand | C84 | yes | Kenney Survivors FBX (#54) |
| 27 | PSXOfficeIdle | lib_C85 | C85 | no | gif-only |
| 28 | PSXOfficeTalk | lib_C87 | C87 | no | gif-only |
| 29 | PSXSurvivorIdle | lib_C90 | C90 | no | gif-only |
| 30 | PSXSurvivorTalk | lib_C92 | C92 | no | gif-only |
| 31 | SquadIdle | lib_C95 | C95 | no | gif-only |
| 32 | Relax | Relax | — | yes | off by default |
| 33 | IdleNeutral | IdleNeutral | — | yes | off (head-down) |
| 34 | IdleSassy | IdleSassy | — | yes | off (arms-into-torso) |
| 35 | IdleChinHand | IdleChinHand | — | yes | off (arms-into-torso) |
| 36 | IdleHug | IdleHug | — | yes | off (arms-into-torso) |
| 37 | IdleKaykitB | IdleKaykitB | — | yes | KayKit Rig_Medium Idle_B retarget (#54) |
| 38 | IdleKaykitA | IdleKaykitA | — | yes | KayKit Rig_Medium Idle_A retarget (#54) |
| 39 | IdleQuaterniusHuman | IdleQuaterniusHuman | — | yes | Quaternius AnimatedHuman Idle (#54) |
| 40 | IdleMixamoBreathing | IdleMixamoBreathing | — | yes | Mixamo BreathingIdle (#54) |
| 41 | IdleMixamoHappy | IdleMixamoHappy | — | yes | Mixamo HappyIdle (#54) |

## Skipped / deferred

- PSX / Squad (#27–31): gif-only, no FBX→VRMA.
- Float-feet gallery rows C10, C14–C24, C26–C35: not in IDLE_LIBRARY planted list.

| 55 | lib_C05 | C05 | KayKitWave | yes | off |
| 56 | lib_C06 | C06 | KayKitCheer | yes | off |
| 57 | lib_C12 | C12 | UAL2Yes | yes | off |
| 58 | lib_C45 | C45 | UAL2No (=Flash IdleUAL2No) | yes | off |
| 59 | IdleUAL2Phone | C161 | Idle_TalkingPhone_Loop | yes | off |
| 60 | lib_C46 | C46 | UAL2Lantern (=Flash IdleUAL2Lantern) | yes | off |

| 61 | KayKitLayingDownIdle | lib_C07 | C07 | yes | PR#64 gallery leftovers |
| 62 | KayKitInteract | lib_C08 | C08 | yes | |
| 63 | UAL2Consume | lib_C13 | C13 | yes | |
| 64 | UAL2RailLoop | lib_C47 | C47 | yes | |
| 65 | UAL2RailCall | lib_C48 | C48 | yes | |
| 66 | UAL2ChestOpen | lib_C49 | C49 | yes | |
| 67 | UAL2ZombieIdle | lib_C50 | C50 | yes | |
| 68 | UAL2ZombieScratch | lib_C51 | C51 | yes | |
| 69 | UAL2FarmHarvest | lib_C52 | C52 | yes | |
| 70 | UAL2ShieldIdle | lib_C71 | C71 | yes | |
| 71 | UAL2FarmPlantSeed | lib_C72 | C72 | yes | |
| 72 | UAL2FarmWatering | lib_C73 | C73 | yes | |
| 73 | UAL2TreeChopping | lib_C74 | C74 | yes | |
| 74 | UAL1Torch | lib_C66 | C66 | yes | |
| 75 | UAL1PistolIdle | lib_C67 | C67 | yes | |
| 76 | UAL1SwordIdle | lib_C68 | C68 | yes | |
| 77 | UAL1SpellIdle | lib_C69 | C69 | yes | |
| 78 | UAL1Interact | lib_C70 | C70 | yes | |
| 79 | UAL1CrouchIdle | lib_C76 | C76 | yes | |
| 80 | UAL1SittingIdle | lib_C77 | C77 | yes | |
| 81 | UAL1SittingTalking | lib_C78 | C78 | yes | |
| 82 | UAL1SwimIdle | lib_C79 | C79 | yes | |
| 83 | UAL1Driving | lib_C80 | C80 | yes | |
| 84 | UAL1FixingKneeling | lib_C81 | C81 | yes | |
| 85 | UAL1Push | lib_C82 | C82 | yes | |
| 86 | UAL1PickUpTable | lib_C83 | C83 | yes | |
| 87 | RokokoHypeMan | lib_C116 | C116 | yes | |
| 88 | RokokoDJ | lib_C117 | C117 | yes | |
| 89 | RokokoDJ02 | lib_C128 | C128 | yes | |
| 90 | IdleInnersceneSam | IdleInnersceneSam | — | yes | Batch4 remap (research #61→90); CC0 |
| 91 | IdleInnersceneHarper | IdleInnersceneHarper | — | yes | Batch4; CC0 |
| 92 | IdleInnersceneMaya | IdleInnersceneMaya | — | yes | Batch4; CC0 |
| 93 | IdleRpmMStanding001 | IdleRpmMStanding001 | — | yes | Batch4 RPM M |
| 94 | IdleRpmMVar001 | IdleRpmMVar001 | — | yes | Batch4 RPM M |
| 95 | IdleRpmMVar002 | IdleRpmMVar002 | — | yes | Batch4 RPM M |
| 96 | IdleRpmMArmStanding001 | IdleRpmMArmStanding001 | — | no | anim-only GLB; skipped (near-dupe #93) |
| 97 | IdleGodotTPSPlayer | IdleGodotTPSPlayer | — | yes | MIT TPS Idle-cycle; ≠ #58 |
| 98 | IdleRpmMStanding002 | IdleRpmMStanding002 | — | yes | Batch4 RPM M longer |

## Batch4 remap (2026-11-01 Asia/Hong_Kong)

Research pack claimed #61–80; PR #64 already shipped rails #61–89 @ c77df56. Remapped convert to picker **#90+**. Defaults stay **#1+#2**.
**Skipped:** MixamoLookingAround (≈#3/#13), UAL2FoldArms (already #6), pointer-only QuaterniusWomen/GodotRetarget/CMU/KinemIQ.
**VERIFY/float-risk unwired:** #99–103 (NervousLook/Bored/Yawn near-dupes of #19/#7/#17; Rokoko LookingAround FLOAT-RISK).

| 99 | KayKitDance | lib_C09 | C09 | yes | PR4 action/dance unused VRMA |
| 100 | JazzDancing | lib_C60 | C60 | yes | Mixamo dance |
| 101 | RokokoDoTheRobot | lib_C111 | C111 | yes | Rokoko dance |
| 102 | RokokoGentleSway | lib_C112 | C112 | yes | |
| 103 | RokokoDancingMedium | lib_C113 | C113 | yes | |
| 104 | RokokoDancingParty | lib_C114 | C114 | yes | |
| 105 | RokokoClubDancer01 | lib_C118 | C118 | yes | |
| 106 | RokokoClubDancer02 | lib_C119 | C119 | yes | |
| 107 | RokokoClubDancer05 | lib_C124 | C124 | yes | |
| 108 | PlayPunch | PlayPunch | -- | yes | app action VRMA |
| 109 | YesCheer | YesCheer | -- | yes | |
| 110 | TaDa | TaDa | -- | yes | |
| 111 | Bow | Bow | -- | yes | |
| 112 | StompAngry | StompAngry | -- | yes | |

## PR4 action/dance (2026-11-01 Asia/Hong_Kong)

Unused playable VRMAs already under `models/anims/` wired to picker **#99-112** (Batch4 left VERIFY research #99-103 unwired; free nums start at #99 after main #98).
Defaults stay **#1+#2**. No voice/LLM/stories.
**Skipped:** float-feet C10/C14-24/C26-35; gif-only; already-wired C116/C117/C128; #13 LookAround; BreathCalm tilt; Jump/Spin/Bounce (float/locomotion); kungfu C120-C147 FBX without VRMA (no convert this PR); interim-remote dance C03/C61/C62/C110 (no local VRMA); emotion-only named VRMAs (Angry/Cry/...).

| 113 | RokokoMartialArtsKata | lib_C120 | C120 | yes | PR5 kungfu convert (mixamo synth hips) |
| 114 | RokokoThaiChiTake | lib_C121 | C121 | yes | Rokoko hips map |
| 115 | RokokoSamuraiDrawSword | lib_C122 | C122 | yes | mixamo synth hips |
| 116 | RokokoBattleTauntsSword | lib_C123 | C123 | yes | mixamo synth hips |
| 117 | UALPunchJab | lib_C146 | C146 | yes | UAL1 DEF |
| 118 | UALPunchCross | lib_C147 | C147 | yes | UAL1 DEF |

## PR5 kungfu (2026-11-01 Asia/Hong_Kong)

Convert unused kungfu gallery FBX → VRMA; wire picker **#113-118** after PR4 #99-112 on main.
Defaults stay **#1+#2**. No voice/LLM/stories.
**Skipped:** KayKit Attack/Block C134–C138 (6-bone puppet, not humanoid); float/locomotion Jump/Hop/Run/Dash/Walk/Roll/Climb; dance C125–C129/C144–C145 (out of kungfu scope / already deferred).
