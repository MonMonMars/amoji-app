# Amoji SDK (`@amoji/*`)

**Plug-and-play emotion layer for robots and companions.** Your AI stays the brain;
Amoji is the face, body language, and voice color that makes it *feel* present.

One install for the full stack:

```bash
npm install @amoji/engine
```

Three lines to a robot that smiles:

```ts
import { Amoji } from '@amoji/engine';

const amoji = Amoji.attach();                 // character + channels
amoji.start();                                // idle autonomy — never looks switched off
amoji.say('任務完成！我好開心呀！');           // analyzed → face + body + voice, emotion-synced
```

## Packages

| Package | npm | What it does |
|---|---|---|
| [`@amoji/engine`](./engine) | `npm i @amoji/engine` | **Umbrella.** One `attach()`; routes `say()` / `setEmotion()` / `react()` to every channel; idle loop; event bus; `.aigf` companion-card portability |
| [`@amoji/emotion-core`](./emotion-core) | `npm i @amoji/emotion-core` | Continuous emotion dynamics: activation, decay, blending, idle drift, saccade gaze. Deterministic, seeded, fully offline |
| [`@amoji/robot-face`](./robot-face) | `npm i @amoji/robot-face` | Animated face on a monitor canvas **or** LED-matrix (Unitree-style RGB buffer) with `HttpDriver` / `UnitreeDriver`. Zero dependencies |
| [`@amoji/vrm-renderer`](./vrm-renderer) | `npm i @amoji/vrm-renderer` | Maps emotion frames → VRM humanoid bone targets + procedural idle-pose library |

Use `@amoji/engine` if you want everything wired together. Use the individual
packages if you only need one channel (e.g. just the face on your existing stack).

## The three channels

```ts
const amoji = Amoji.attach({
  face:  myFaceOrDisplay,   // AmojiFace driver — monitor / LED matrix
  body:  myBodyAdapter,     // intent-only posture/gesture — never safety-critical
  voice: myTtsBridge,       // receives prosody-colored speak() calls
  character: 'sunny-companion',
});

amoji.on('said',  ({ text, emotion }) => log(emotion, text));
amoji.on('idle',  (line)              => /* idle dialogue chosen */);
amoji.on('user.poke', () => amoji.react('poke'));
```

## Carry your companion anywhere — `.aigf`

A companion is a portable card, not a walled garden. Save from the app, load on a robot:

```ts
import { Amoji } from '@amoji/engine';

// identity, persona, voice config, memory blob, chat history all travel with the card
const amoji = Amoji.attach({ aigf: fs.readFileSync('sunny.aigf.json', 'utf8') });
```

## Licensee integration

See [`ROBOTICS.md`](../ROBOTICS.md) at the repo root for the full integration
guide: Jetson quick-start, driver contract, body-channel safety rules, voice
prosody, events, tuning, and troubleshooting.
