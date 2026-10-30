# Idle numbered map (# → name → clipId → playable)

Source of truth: `apps/web/lib/idle-library.ts`. Chat says "use #N".
Defaults: **only #1 IdleBreathCalm + #2 StandardIdle** (`defaultEnabled`).

| # | name | clipId | Cxx | playable | notes |
|---|------|--------|-----|----------|-------|
| 1 | IdleBreathCalm | IdleBreathCalm | — | yes | default ON |
| 2 | StandardIdle | StandardIdle | — | yes | default ON |
| 3 | RokokoEverydayIdles | LookAround | C01 | yes | shared clip with #13 |
| 4 | Idle_Loop | lib_C02 | C02 | yes | Quaternius UAL Idle_Loop (#54) |
| 5 | KayKitIdle | lib_C04 | C04 | yes | KayKit retarget (#53) |
| 6 | UAL2FoldArms | lib_C11 | C11 | yes | Quaternius UAL2 FoldArms (#54) |
| 7 | Bored | lib_C25 | C25 | yes | Mixamo (#53) |
| 8 | RokokoArguing | lib_C36 | C36 | yes | Rokoko (#53) |
| 9 | RokokoChatting | lib_C37 | C37 | yes | Rokoko (#53) |
| 10 | RokokoChatting02 | lib_C38 | C38 | yes | Rokoko (#53) |
| 11 | RokokoConversation | lib_C39 | C39 | yes | Rokoko (#53) |
| 12 | RokokoListeningToMusic | lib_C41 | C41 | yes | Rokoko (#53) |
| 13 | RokokoLookingAround02 | LookAround | C42 | yes | alias of #3 LookAround.vrma |
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
