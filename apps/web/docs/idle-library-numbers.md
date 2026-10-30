# Idle library # map (chat SoT)

Source: `apps/web/lib/idle-library.ts`
Also: `apps/web/public/models/anims/IDLE_NUMBERED_MAP.md`
Free-library: `D:\Blender\projects\mon-character\free-library\`

| # | clipId | Cxx | playable | default |
|---|--------|-----|----------|---------|
| 1 | IdleBreathCalm | — | yes | ON |
| 2 | StandardIdle | — | yes | ON |
| 3 | LookAround | C01 | yes | off |
| 4 | lib_C02 | C02 | no (gif) | |
| 5 | lib_C04 | C04 | yes | off |
| 6 | lib_C11 | C11 | no (gif) | |
| 7 | lib_C25 | C25 | yes | off |
| 8 | lib_C36 | C36 | yes | off |
| 9 | lib_C37 | C37 | yes | off |
| 10 | lib_C38 | C38 | yes | off |
| 11 | lib_C39 | C39 | yes | off |
| 12 | lib_C41 | C41 | yes | off |
| 13 | LookAround | C42 | yes (alias #3) | off |
| 14 | lib_C44 | C44 | yes | off |
| 15 | HelloWave | C53 | yes | |
| 16 | Shrug | C54 | yes | |
| 17 | Sleepy | C55 | yes | |
| 18 | Thinking | C56 | yes | |
| 19 | lib_C57 | C57 | yes | off |
| 20 | ThumbsUp | C58 | yes | |
| 21 | Clapping | C59 | yes | |
| 22 | Cheer | C63 | yes | |
| 23 | lib_C64 | C64 | yes | off |
| 24–31 | lib_C65…C95 | gif packs | no | |
| 32–36 | Relax / Idle* | app | yes | off (never defaults) |

Chat: `IdlePickRails` — tap `#N` to pin; right-click/long-press toggles ON/OFF (`amoji.idleEnabled.v1`).
Feet: all idle loads use `rebaseClipHips` + `pinPlantedClipTracks`.
