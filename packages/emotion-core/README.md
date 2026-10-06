# @amoji/emotion-core

**Continuous emotion dynamics for robots and companions.** Text / tags in → a
living emotional state out: activation, decay, blending, idle drift, and
saccadic gaze. Deterministic, seeded, and fully offline — no network, no model.

```bash
npm install @amoji/emotion-core
```

## Quick start

```ts
import { EmotionEngine, analyzeText } from '@amoji/emotion-core';

const engine = new EmotionEngine();            // seedable for reproducible runs
engine.update({ lexicon: analyzeText('I am so happy to see you!') });

setInterval(() => {
  const frame = engine.tick(16);               // ms since last tick
  // frame.face   → eye/mouth/brow parameters
  // frame.body   → posture + gesture intensity
  // frame.valence / frame.arousal / frame.gaze / frame.idle
  driveMyActuators(frame);
}, 16);
```

## What's inside

| Export | What it does |
|---|---|
| `EmotionEngine` | The dynamics loop: `update(input)`, `tick(dtMs)`, `setConfig` / `getConfig` |
| `analyzeText` | Offline utterance analysis → lexicon weights (no LLM needed) |
| `CATALOG` | Emotion parameter catalog — every supported emotion's face/body signature |
| `EMOTION_IDS`, `FACE_PARAM_NAMES`, `BODY_PARAM_NAMES` | Enumerations for your UI or driver |
| `DEFAULT_EMOTION_CONFIG`, `validateEmotionConfig` | Tuning: blend times, idle thresholds, saccade rates |
| `EmotionFrame`, `EmotionInput`, `EmotionConfig`, `EmotionId` | Types |

## Notes

- Everything runs in milliseconds; feed it your render loop's `dt`.
- Same seed + same inputs ⇒ same frames. Testable, replayable.
- Usually consumed through [`@amoji/engine`](../README.md), which wires this to
  face, body, and voice channels for you.
