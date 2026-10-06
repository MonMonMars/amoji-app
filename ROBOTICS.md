# Amoji Robotics — integration guide for robot builders

The Amoji Emotion Engine is a **presentation layer**: your AI stays the brain,
Amoji becomes the face, body language, and voice color of your robot.
This guide is written for the engineer integrating it on a real machine
(Jetson, Raspberry Pi, kiosk PC, or a dev laptop talking to a robot).

```
packages/
  emotion-core/   continuous emotion dynamics (activation, decay, blending, gaze)
  robot-face/     monitor canvas + LED-matrix face, Http/Unitree drivers
  vrm-renderer/   3D avatar frame mapping (full-body displays)
  engine/         umbrella — one Amoji.attach(), face + body + voice channels
```

---

## 1. Three lines to a robot that smiles

```ts
import { Amoji, AmojiFace, UnitreeDriver } from '@amoji/engine';

const amoji = Amoji.attach({
  face: new AmojiFace({ driver: new UnitreeDriver('192.168.1.50') }),
  character: 'sunny-companion',
});
amoji.start();
amoji.say('System check complete. I feel great today!');  // face + voice, emotion-synced
```

- `amoji.say(text)` — built-in multilingual lexicon (Cantonese/中文/日本語/English)
  picks the expression; your TTS bridge receives the text.
- `amoji.setEmotion('pride', 0.7)` — deterministic, works fully offline, no LLM.
- `amoji.on('user.poke', () => amoji.react('poke'))` — personality-driven reactions.

## 2. Display paths

| Path | What you do | What Amoji does |
|---|---|---|
| **Monitor / webview** | pass a `<canvas>` (or a full-screen webview pointing at your hosted page) | animated glowing face: eyes, pupils, blinks, mouth, lipsync |
| **LED matrix** (Unitree-style face) | implement `showFrame(frame: Uint8Array, size)` in a driver | delivers a `size×size×3` RGB buffer every animation frame |
| **Both** | pass `canvas` and `driver` together | renders both, keeps them identical |

No-driver mode: `new AmojiFace()` animates internally — useful on a dev laptop
with the LED preview from `apps/web/app/robot-demo`.

**Zero-code option:** point a webview on the robot's screen at the hosted
face endpoint and drive it over `postMessage` — no SDK install at all.
See [`docs/ROBOT-FACE.md`](docs/ROBOT-FACE.md) for the URL parameters and the
message bridge (`amoji:say`, `amoji:emotion`, `amoji:state`, …).

### The driver contract

```ts
interface FaceDriver {
  showFrame?(frame: Uint8Array, size: number): void;  // RGB bytes, top-left origin
  speak?(text: string): void;                         // → your TTS
}
```

- `HttpDriver(url)` POSTs each frame as `{ size, frame: number[] }` JSON at a
  capped framerate (default 15 fps) — point it at **your** bridge process.
- `UnitreeDriver(ip, port)` is the same thing pre-pointed at
  `http://<robot>:8080/api/face` — that endpoint is **your bridge**, not a
  built-in Unitree service. A 20-line Express/Flask bridge that receives the
  JSON and pushes bytes to WS2812/HUB75/serial is all it takes.

Minimal bridge sketch (runs anywhere Node does):

```js
import express from 'express';
import { SerialPort } from 'serialport';           // or your LED library

const port = new SerialPort({ path: 'COM5', baudRate: 1_000_000 });
express()
  .use(express.json({ limit: '1mb' }))
  .post('/api/face', (req, res) => {
    const { size, frame } = req.body;              // RGB bytes as number[]
    port.write(Buffer.from(frame));                // → your LED hardware
    res.sendStatus(204);
  })
  .listen(8080);
```

## 3. Body channel — intent only, safety first

```ts
class MyBodyDriver {
  setPosture(emotion: string, intensity: number) {
    // map to your OEM high-level API, e.g. Unitree SDK2 high-level:
    const g = gaitHintForEmotion(emotion, intensity); // { bounce, tempo, headPitchDeg }
    // …your mapping here. Clamp. Never bypass the OEM's balance controller.
  }
  gesture(id: string) {
    // 'poke' | 'greet' | 'nod' | 'shake' | 'celebrate' — your motion presets
  }
}

const amoji = Amoji.attach({ face, body: new MyBodyDriver(), voice });
```

**Hard rules (part of the license):**
1. Amoji output is *intent*. Your adapter maps it onto the OEM's **high-level**
   motion API only — never motor-level torque/position commands.
2. Clamp everything: `|headPitchDeg| ≤ 15`, `bounce ∈ [0.5, 1.5]`,
   `tempo ∈ [0.7, 1.4]`. Emotion must never make a robot unpredictable.
3. Your e-stop / safety watchdog stays in charge and can starve the adapter
   at any time. Amoji must fail silent: if the engine dies, the face freezes
   to neutral — it never repeats stale frames (see `holdMs` below).

`gaitHintForEmotion()` is deliberately conservative; treat its output as a
starting point, then have your robotics engineer tighten it for your platform.

## 4. Voice prosody

```ts
const amoji = Amoji.attach({
  face, body,
  voice: {
    speak: (text, prosody) => tts.speak(text, {
      rate: prosody?.rate,        // e.g. joy 1.12×, sadness 0.82×
      pitch: prosody?.pitch,      // e.g. fear +30%, anger −15%
      volume: prosody?.energy,
    }),
  },
});
```

Works with any TTS that takes rate/pitch. Feed real audio amplitude back into
the face for lipsync: `face.setVoiceLevel(v)` (0..1, auto-decays).

## 5. Loading a user's companion (.aigf)

The Amoji consumer app exports companions as one `.aigf` JSON card
(identity, persona, voice, language, memory, history). Let the same soul
drive your robot:

```ts
import { readFileSync } from 'node:fs';
const card = readFileSync('/media/usb/juno.aigf.json', 'utf8');
const amoji = Amoji.attach({ face, body, voice, aigf: card });
amoji.character.name;      // 'Juno'
amoji.say(amoji.greeting()); // greets in her language (yue/zh/ja/en)
```

Memory/history stay opaque to the engine — feed them to your own LLM prompt
so she remembers her human. The personality, reactions and language come back
exactly as exported.

## 6. Events

```ts
amoji.on('said',   ({ text, emotion }) => log(text, emotion));
amoji.on('idle',   ({ emotion }) => statusLight.set(emotion));
amoji.on('gait',   (hint) => bodyAdapter.push(hint));
amoji.on('user.poke', () => /* your touch sensor fired — she reacts */);
```

## 7. Tuning

| Knob | Where | Default | Note |
|---|---|---|---|
| Expression hold | `new AmojiFace({ holdMs })` | 4000 ms | then eases back to breathing neutral |
| Idle beat | `Amoji.attach({ idleMs })` | 7000 ms | `0` disables idle autonomy |
| Determinism | `Amoji.attach({ seed, rng })` | seeded | pass your own rng for tests |
| LED size | `new AmojiFace({ ledSize })` | 16 | any square matrix |
| Global intensity | `engine.setConfig({ intensity })` | 1.0 | 0..1 scales all expression |

## 8. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Face stuck on one expression | your process stopped calling `amoji.*` — after `holdMs` it returns to neutral by itself; if not, the rAF loop died: check `face.stop()` wasn't called |
| LED shows nothing | bridge not reachable — `HttpDriver` swallows fetch errors by design; check your bridge logs |
| Mouth doesn't move while speaking | feed audio amplitude via `setVoiceLevel()`; without it lipsync is idle-only |
| Emotion feels too strong | `engine.setConfig({ intensity: 0.6 })`, and clamp harder in your body adapter |
| Everything neutral, no errors | text had no lexicon hits — expected; use `setEmotion()` from your stack for explicit states |

## 9. License

MIT for evaluation and development. Shipping Amoji in a commercial robot
requires a B2B license — see the tier table in the product spec
(`amoji-b2b-sdk-spec.html`) or contact the Amoji team. Seed characters are
original placeholders; bring your own licensed characters via
`Amoji.attach({ character: yourConfig })`.
