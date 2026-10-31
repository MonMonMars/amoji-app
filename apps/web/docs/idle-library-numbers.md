# Idle library # map (chat SoT)

Source: `apps/web/lib/idle-library.ts`
Also: `apps/web/public/models/anims/IDLE_NUMBERED_MAP.md`
Free-library: `D:\Blender\projects\mon-character\free-library\`

| # | clipId | Cxx | playable | default |
|---|--------|-----|----------|---------|
| 1 | IdleBreathCalm | — | yes | ON |
| 2 | StandardIdle | — | yes | ON |
| 3 | LookAround | C01 | yes | off |
| 4 | lib_C02 | C02 | yes | off |
| 5 | lib_C04 | C04 | yes | off |
| 6 | lib_C11 | C11 | yes | off |
| 7 | lib_C25 | C25 | yes | off |
| 8–14 | Rokoko / Watching | C36–C44 | yes | off |
| 15–23 | Mixamo gestures + Defeat | C53–C64 | yes | off |
| 24 | lib_C65 | C65 | yes | off |
| 25 | lib_C75 | C75 | yes | off |
| 26 | IdleKenneyStand | C84 | yes | off |
| 27–31 | PSX / Squad | C85–C95 | no (gif) | |
| 32 | Relax | — | yes | off |
| 33–36 | IdleNeutral/Sassy/ChinHand/Hug | — | yes | off (never defaults) |
| 37 | IdleKaykitB | — | yes | off |
| 38 | IdleKaykitA | — | yes | off |
| 39 | IdleQuaterniusHuman | — | yes | off |
| 40 | IdleMixamoBreathing | — | yes | off |
| 41 | IdleMixamoHappy | — | yes | off |

Chat: `IdlePickRails` — tap `#N` to pin; right-click/long-press toggles ON/OFF (`amoji.idleEnabled.v1`).
Feet: all idle loads use `rebaseClipHips` + `pinPlantedClipTracks`.

| 55–56 | lib_C05/C06 | C05–C06 KayKit Wave/Cheer | yes | off |
| 57 | lib_C12 | C12 UAL2Yes | yes | off |
| 58 | lib_C45 | C45 UAL2No (Flash IdleUAL2No alias) | yes | off |
| 59 | IdleUAL2Phone | C161 | yes | off |
| 60 | lib_C46 | C46 Lantern | yes | off |

| 61 | lib_C07 | C07 | yes | off |
| 62 | lib_C08 | C08 | yes | off |
| 63 | lib_C13 | C13 | yes | off |
| 64–86 | UAL2/UAL1 leftovers | C47–C83 | yes | off |
| 87–89 | Rokoko Hype/DJ/DJ02 | C116–C128 | yes | off |
| 90 | IdleInnersceneSam | — | yes | off |
| 91 | IdleInnersceneHarper | — | yes | off |
| 92 | IdleInnersceneMaya | — | yes | off |
| 93 | IdleRpmMStanding001 | — | yes | off |
| 94 | IdleRpmMVar001 | — | yes | off |
| 95 | IdleRpmMVar002 | — | yes | off |
| 96 | IdleRpmMArmStanding001 | — | no | off (anim-only GLB) |
| 97 | IdleGodotTPSPlayer | — | yes | off |
| 98 | IdleRpmMStanding002 | — | yes | off |

Batch4 remap: research #61–80 → picker #90+ after PR#64 rails #61–89. VERIFY #99–103 unwired.
| 99 | lib_C09 | C09 KayKitDance | yes | off |
| 100 | lib_C60 | C60 JazzDancing | yes | off |
| 101 | lib_C111 | C111 DoTheRobot | yes | off |
| 102 | lib_C112 | C112 GentleSway | yes | off |
| 103 | lib_C113 | C113 DancingMedium | yes | off |
| 104 | lib_C114 | C114 DancingParty | yes | off |
| 105 | lib_C118 | C118 ClubDancer01 | yes | off |
| 106 | lib_C119 | C119 ClubDancer02 | yes | off |
| 107 | lib_C124 | C124 ClubDancer05 | yes | off |
| 108 | PlayPunch | -- | yes | off |
| 109 | YesCheer | -- | yes | off |
| 110 | TaDa | -- | yes | off |
| 111 | Bow | -- | yes | off |
| 112 | StompAngry | -- | yes | off |

PR4 action/dance: unused local VRMAs onto rails #99+ (after Batch4 #90-98). No convert. Kungfu C120+ FBX-only deferred. Jump/Spin/Bounce skipped (float/locomotion). Interim-remote C03/C61/C62/C110 (no local VRMA) deferred. Float-feet / gif-only / already-wired Cxx skipped.

| 113 | lib_C120 | C120 | yes | off |
| 114 | lib_C121 | C121 | yes | off |
| 115 | lib_C122 | C122 | yes | off |
| 116 | lib_C123 | C123 | yes | off |
| 117 | lib_C146 | C146 | yes | off |
| 118 | lib_C147 | C147 | yes | off |

PR5 kungfu: FBX→VRMA convert for planted martial clips onto rails **#113-118** (after PR4 #99-112 @ 2aa3e3b). Defaults stay **#1+#2**. No voice/LLM/stories.
**Skipped:** KayKit C134–C138 (6-bone Body/Head/arm* puppet — not VRM humanoid after inspect+retry); jump/locomotion/pose C130–C133/C139–C143; non-kungfu dance leftovers C125–C129/C144–C145.
