# Adding New Characters & Motions — the legal pipeline

The Amoji public repo (and any future App Store build) must only ship assets
we have the rights to redistribute. This guide is the checklist for adding
characters (VRM models) and motions (animation clips).

## TL;DR of the rules

1. **Every binary in `apps/web/public/models/` needs a manifest entry** — CI
   fails otherwise (`ASSET_MANIFEST.md`: file, license, source, notes).
2. **Public-repo builds use `seed-san.vrm`** (VRM Public License 1.0). The
   prettier licensed models (e.g. the Kizuna AI sample behind `juno.vrm`) ship
   in closed/local builds only — they are not committed here.
3. **No ripped game/anime character models.** Not in the public repo, not in
   the App Store build. CI bans known ones by name (see `banned asset check`
   in `.github/workflows/ci.yml`). Ripped assets also void B2B deals — a robot
   vendor will run a license audit.
4. Adult-tagged assets are out entirely — instant App Store rejection.

## Where to get SAFE models

| Source | License | Notes |
|---|---|---|
| [VRM spec samples](https://github.com/vrm-c/vrm-specification/tree/master/samples) (Seed-san) | VRM Public License 1.0 | Current fallback. Credit: VirtualCast, Inc. |
| [VRoid Hub](https://hub.vroid.com) | Per-model (many allow redistribution w/ credit) | Filter "allow commercial use". Export VRM from VRoid Studio. Best quality path for anime-style companions. |
| Booth / Gumroad original VRMs | Per-product | Buy once, keep receipt; check redistribution terms for shipped apps. |
| Commission an original character | Full rights | Cleanest for B2B. Own the IP, name and face. |

Sites that aggregate "10,000+ free models" (rigmodels.com, renderskill, etc.)
are mostly user-uploaded rips of copyrighted game characters (FF7, DOA,
Resident Evil, anime). Treat everything there as **rejected unless the
uploader is the rights holder** — and verify, don't assume. Downloads there
also require a free account + ad-wait, so they can't be fetched by automation.

## Motion library

| Source | License | Notes |
|---|---|---|
| [Quaternius Universal Animation Library](https://quaternius.com) | **CC0** (public domain) | 500+ humanoid clips (idle, sit, talk, dance). No login. Safest bulk source. FBX → convert to glTF/VRMA. |
| [Mixamo](https://www.mixamo.com) | Adobe license: free to use in projects, **do not redistribute raw files** | Needs an Adobe login. Convert FBX → VRMA, ship the converted clip inside the app only. |
| rigmodels.com/animations | unclear | Same rip concerns as their models. Avoid for shipped builds. |

### Motion pipeline (once clips are in hand)

1. Convert the clip to **VRMA** (VRM Animation) — the format
   `CompanionCanvas` already loads as `models/idle.vrma`.
   Tools: Unity + VRM Animation addon, or Blender with a Mixamo-rig → VRM-bone
   retarget, or `fbx2gltf` + manual bone-name mapping.
2. Drop the file in `apps/web/public/models/`, add a manifest row.
3. CompanionCanvas strips expression tracks from clips automatically, so faces
   stay under the emotion engine's control — body from the clip, face from us.
4. Procedural idle poses (`packages/vrm-renderer/src/idle-poses.ts`) remain the
   fallback when no clip is present, and are blended per-character via the
   character-id motion seed.

## Adding a new character (code-side, model ships later)

1. `apps/web/lib/prefs.ts` — add a `CharacterDef` (id, name, gender, accent
   color, 4-language tagline, persona prompt).
2. `apps/web/lib/edge-tts.ts` — add a `CAST` row (per-language neural voice).
3. `apps/web/lib/voice.ts` — add `VOICE_MATRIX` (browser fallback) and
   `EXPRESSIVENESS` entries.
4. When the VRM lands: file into `models/`, manifest row, and (closed builds)
   add the filename to `MODEL_CANDIDATES` in `CompanionCanvas.tsx`.
5. Bump `APP_REVISION` in `apps/web/lib/revision.ts`.
