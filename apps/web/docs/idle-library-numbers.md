# Idle library # map (chat SoT)

Source: `apps/web/lib/idle-library.ts`
Free-library: `D:\Blender\projects\mon-character\free-library\` (gallery/index show matching `#N`)

| # | clipId | Cxx | playable | default |
|---|--------|-----|----------|---------|
| 1 | IdleBreathCalm | — | yes | ON |
| 2 | StandardIdle | — | yes | ON |
| 3 | LookAround | C01 | yes | off |
| 4 | lib_C02 | C02 | no | |
| 5 | lib_C04 | C04 | no | |
| 6–12 | … | C11–C41 | no | |
| 13 | LookAround | C42 | yes (alias #3) | off |
| 14 | lib_C44 | C44 | no | |
| 15 | HelloWave | C53 | yes | |
| 16 | Shrug | C54 | yes | |
| 17 | Sleepy | C55 | yes | |
| 18 | Thinking | C56 | yes | |
| 19 | lib_C57 | C57 | no | |
| 20 | ThumbsUp | C58 | yes | |
| 21 | Clapping | C59 | yes | |
| 22 | Cheer | C63 | yes | |
| 23–31 | … | C64–C95 | mostly no VRMA yet | |
| 32–36 | Relax / Idle* | app | yes | off |

Chat: `IdlePickRails` — tap `#N` to pin; right-click/long-press toggles ON/OFF (`amoji.idleEnabled.v1`).
Feet: all idle loads use `rebaseClipHips` + `pinPlantedClipTracks`.
