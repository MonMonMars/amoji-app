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