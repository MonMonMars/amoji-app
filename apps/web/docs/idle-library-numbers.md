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
