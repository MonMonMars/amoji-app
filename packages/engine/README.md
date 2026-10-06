# @amoji/engine

**The Amoji Emotion Engine — plug-and-play feelings for any robot.**
One `attach()`; text / emotion in → face + body + voice emotion out, personality-driven.
Your AI stays the brain — Amoji is the face, body language, and voice color.

```ts
import { Amoji, AmojiFace, UnitreeDriver } from '@amoji/engine';

const amoji = Amoji.attach({
  face: new AmojiFace({ driver: new UnitreeDriver('192.168.1.50') }),
  // body: myUnitreeAdapter,        // optional posture/gesture intent channel
  // voice: myTtsBridge,            // optional — receives prosody-colored speak()
  character: 'sunny-companion',
});

amoji.start();                        // idle autonomy — never looks switched off
amoji.say('任務完成！我好開心呀！');   // analyzed → emotion-synced face + body + voice
amoji.setEmotion('pride', 0.7);       // or drive raw emotions from your stack
amoji.on('user.poke', () => amoji.react('poke'));
```

## What's inside

| Module | What it does |
|---|---|
| `Amoji` | Umbrella: routes `say()` / `setEmotion()` / `react()` to every attached channel; idle loop; event bus (`said`, `idle`, `user.poke`, `gait`, …) |
| `EmotionEngine` (from `@amoji/emotion-core`) | Continuous emotion dynamics: activation, decay, blending, idle drift, saccade gaze — deterministic, seeded, offline |
| `AmojiFace` (from `@amoji/robot-face`) | Monitor canvas **and** LED-matrix face (Unitree-style RGB buffer + `HttpDriver`/`UnitreeDriver`) |
| `BodyDriver` | Intent-only posture + gesture channel — **never** touches safety-critical control; you map it onto your OEM high-level API |
| `prosodyForEmotion` | Emotion → TTS rate/pitch/energy multipliers — works with any TTS engine |
| `gaitHintForEmotion` | Conservative gait-modulation hints (bounce/tempo/head pitch) for Phase-2 body adapters |
| `.aigf` support | `parseAigf` / `loadAigfCharacter` — load a user's Amoji companion card and let the same soul drive the robot body |

## Seed characters

`sunny-companion` · `calm-companion` · `mischief-companion` — or pass your own
`CharacterConfig`, or a raw `.aigf` card via `Amoji.attach({ aigf })`.

## Philosophy (from the B2B spec)

- **Presentation layer only.** We never replace your autonomy stack or balance control.
- **Deterministic core.** `setEmotion()` works offline, is testable, and is safe — the LLM is optional.
- **Companion bridge.** The same `.aigf` soul file that moves between phones moves between robots.

## Repo layout

This package is wired for the pnpm workspace (`packages/*`). Tests run from the
web app suite (`apps/web/tests/engine-sdk.test.ts`); typecheck with
`tsc --noEmit -p packages/engine` (paths resolve the sibling packages from source).

MIT — evaluation & development use; commercial robot shipments need an Amoji B2B license.
