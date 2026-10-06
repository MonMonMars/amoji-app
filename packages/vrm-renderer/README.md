# @amoji/vrm-renderer

**Emotion frames → VRM humanoid bone targets + a procedural idle-pose library.**
Turns what [`@amoji/emotion-core`](../emotion-core) feels into what a VRM avatar
shows. Works with any three.js VRM loader — no renderer lock-in.

```bash
npm install @amoji/vrm-renderer
```

## Quick start

```ts
import { mapFrameToVrm, IDLE_POSES, sampleIdlePoseFrom } from '@amoji/vrm-renderer';

// each frame:
const targets = mapFrameToVrm(frame, intensity, idlePose);
// targets = { blendShape: { joy, angry, sorrow, fun, surprise, relaxed },
//             bones: { headPitch, headYaw, headRoll, leftUpperArm, ... } }  — radians & 0..1 weights
applyToAvatar(vrm, targets);
```

## What's inside

| Export | What it does |
|---|---|
| `mapFrameToVrm(frame, intensity?, pose?)` | Fold an `EmotionFrame` into VRM bone targets; optional idle-pose offsets layered on top |
| `IDLE_POSES` | Curated idle-pose library (relaxed, weight-shifted, breathing, …) — never a zombie T-pose |
| `sampleIdlePoseFrom(tMs, seed, poses)` | Deterministic pose pick for time `t` — same seed, same pose sequence |
| `posesByIds(ids)` | Filter the library by pose id |
| `cycleDuration`, `poseIndexFor`, `POSE_BASE_MS`, `POSE_JITTER_MS`, `POSE_BLEND_MS` | Pose-scheduling math for your own loop |
| `ARM_DOWN_BASE`, `ELBOW_BASE` | Sensible humanoid arm defaults (arms hang, elbows soft — never straight) |
| `VrmTargets`, `IdlePoseDef`, `IdlePoseOffsets` | Types |

## Notes

- Pose transitions are time-blended (`POSE_BLEND_MS`) — no snapping between poses.
- Feet stay planted: poses offset the upper body, not the root.
- Usually consumed through [`@amoji/engine`](../README.md), which also drives
  face and voice channels.
