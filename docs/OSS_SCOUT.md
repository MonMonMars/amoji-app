# OSS scout — open-source candidates (research note)

**Status:** research only. **Nothing in this document is implemented.** No Amoji code was touched when this list was produced.

**Source:** external scout pass relayed by the owner (2026-11-21/22). Full private notes live off-repo; this file records only what is safe and useful to keep with the code.

**Scope of that pass:** TTS was deferred to a separate voice scout (see [`VOICE_SOUND_INVENTORY.md`](./VOICE_SOUND_INVENTORY.md)); idle packs were skipped; SFX was handed to the TTS/SFX pass.

**Licence rule for this file:** an entry lands in WANT only if it carries a real SPDX identifier. "No SPDX" is the single most common trap below, so every SKIP row names its reason.

---

## WANT — licence clear, worth wiring

| Project | Licence | What it gives us | Risk / constraint |
| --- | --- | --- | --- |
| [three-vrm-lip-sync](https://github.com/vlapky/three-vrm-lip-sync) | MIT | Live MFCC visemes for `@pixiv/three-vrm`; wire on the TTS stream | Runtime audio analysis; needs a real A/B on device |
| [wLipSync](https://github.com/mrxz/wLipSync) | MIT | WASM MFCC engine — lower level than the above | Lower-level API; only worth it if the library above fights our audio graph |
| [uLipSync](https://github.com/hecomi/uLipSync) | MIT | Unity / VRM0+1 path, if we ever need it | Wrong engine for the web app — keep as reference only |
| [fbx2vrma-converter](https://github.com/TK-256/fbx2vrma-converter) | MIT | Mixamo / humanoid FBX → VRMA | **Do not redistribute Mixamo clips**; conversion tooling is fine, the motions are not |
| [vrm-mixamo-retarget](https://github.com/saori-eth/vrm-mixamo-retargeter) | MIT | Runtime Three.js retarget | Runtime cost per clip; bake is usually better for idles |
| [Amica](https://github.com/semperai/amica) | MIT | VRM companion patterns: emotion tags + Ollama | Reference patterns, not a dependency |
| [Chronicler](https://github.com/yantrikos/chronicler) | MIT | ST-card roleplay + local memory sidecar | Memory sidecar overlaps our own recall rules — read [`PRIVACY_MEMORY.md`](./PRIVACY_MEMORY.md) first |
| [OPEN-AVATAR](https://github.com/timesbye/OPEN-AVATAR) | MIT | Emotion → blendshape mapping sketch | Sketch-grade; needs our own emotion vocabulary |
| [AVATAR](https://github.com/ARPAHLS/avatar) | MIT (code) | Electron overlay: lip-sync to system/TTS audio, VRMA, local LLMs, MCP/agent bus | **Harvest patterns only.** Bundled VRoid motions and GIPHY backdrops carry their own terms |
| [VPuppet](https://github.com/Spartan-Game-Studios/puppet) | MIT (source) | MediaPipe Face Landmarker → VRM: 52 ARKit blendshapes, smoothing, gaze, body/hands, mic lip-sync | Steam build is paid — use the MIT source as a mapper, **not a vendor** |
| [Old Metrowagon](https://sketchfab.com/3d-models/old-metrowagon-036900893db94ac2b37395c561602031) — Yni Viar | CC-BY | Stylised metro wagon with a real interior (~27k tris) | Attribution required; Sketchfab login to download. Not anime-JP styling |

### How these map to pending work in this repo

These are the concrete reasons the list matters, tied to work already open:

| Tool | Pending work it unblocks |
| --- | --- |
| `fbx2vrma-converter` + `vrm-mixamo-retarget` | The missing FBX→VRMA step for the **Rocketbox fallback** — library `motion:C170`–`C193`, excluding the owner-banned `C186`/`C187`/`C188`/`C191`. Until now the conversion path was the blocker. |
| `three-vrm-lip-sync` | Mouth movement on the TTS stream — see [`TTS_PIPELINE.md`](./TTS_PIPELINE.md) and [`VOICE_CHAT_LIFECYCLE.md`](./VOICE_CHAT_LIFECYCLE.md). |
| `Amica` / `OPEN-AVATAR` | Emotion tag → VRM expression mapping, which the reply-mode emotion chart already gestures at. |
| Old Metrowagon | The interior gap recorded at the bottom of this file. |

---

## WATCH — licences fine, need a reason to adopt

| Project | Licence | Note |
| --- | --- | --- |
| [ai-girlfriend](https://github.com/Sogrey/ai-girlfriend) | MIT | Companion app; patterns only |
| [vrm-studio](https://github.com/ZaberKo/vrm-studio) | MIT | Editing pipeline; useful if we start authoring our own VRMs |
| [tour-avatar](https://github.com/liwei0513/tour-avatar) | MIT | Mobile-oriented — closest thing to our phone-first constraint |
| VRoid Project 7-clip VRMA | Commercial OK with credit | **No redistribution of extractable / re-riggable files** — user-side load only, cannot be bundled |

---

## SKIP — and the exact reason

| Project | Reason |
| --- | --- |
| [liqu-companion](https://github.com/CameronCodesStuff/liqu-companion) | No SPDX identifier |
| [FurTuber](https://github.com/TwigOtter/FurTuber) | No SPDX identifier |
| [ai-avatar-companion](https://github.com/macekond/ai-avatar-companion) | GPL-3.0 — copyleft incompatible with our bundling |
| SillyTavern | AGPL |
| Open-LLM-VTuber (frontend) | Commercial-redistribute licence — not bundle-safe |
| locoxsoco / vrm-ai-emotions | No SPDX **and** NVIDIA NIM dependency |
| Motorica Dance | NC |
| vibe-break dance clips | Licences unclear |

---

## Suggested wire order

Recorded from the scout pass, not yet agreed as a plan:

1. Lip-sync on the TTS stream
2. FBX/VRMA dance + gesture tooling
3. Emotion tags → VRM expressions
4. Ollama + card/memory sidecar

---

## Open gap (recorded verbatim)

> Still no free commercial anime-toon Japanese train interior. Innerscene CC0 metro car remains the wire-soon geometry, dressed with toon materials or a night HDRI.

`Innerscene CC0 metro car` is the fallback geometry; the plan is to dress it with toon materials or a night HDRI rather than find a licensed interior.

---

## Related

- [`ASSETS.md`](./ASSETS.md) — asset + licence pipeline
- [`MODELS.md`](./MODELS.md) — model shortlist
- [`OWNER_RESOURCE_LIBRARY.md`](./OWNER_RESOURCE_LIBRARY.md) — the owner's own resource catalogue (consult before swapping defaults)
