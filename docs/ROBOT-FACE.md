# Amoji Robot Face — integration guide (B2B)

The Amoji emotion engine runs anywhere a face can be shown. Three ways to plug in,
in order of effort: **URL display**, **postMessage bridge**, **embedded engine**.

---

## 1. URL display — zero code (`/face`)

Point your robot's screen (or any webview) at the hosted endpoint:

```
https://monmonmars.github.io/amoji-app/face?lang=yue&character=juno&auto=1
```

| Param | Values | Default | Effect |
|---|---|---|---|
| `lang` | `yue` `zh` `ja` `en` | `yue` | spoken + STT language |
| `character` | `juno nova blaze mochi kai luna rin ren` | `juno` | voice gender + personality |
| `say` | any text | — | boot line she speaks on load |
| `emotion` | any emotion id | — | boot emotion |
| `auto` | `1` | off | hands-free voice loop: listen → think → speak, forever |
| `subs` | `1` | off | subtitles of what she says |
| `debug` | `1` | off | status pill (mode, heard, said, revision) |

In `auto=1` mode the face is a complete social interface: microphone in,
free LLM brain, emotional neural TTS out, face reacts and lip-syncs.

## 2. postMessage bridge — your stack stays in charge

Embed `/face` in a webview/iframe and drive it from ROS, Python, Node, anything:

```js
// parent / robot process
const win = webview.contentWindow;

win.postMessage({ type: 'amoji:say', text: '任務完成！' });       // she says it, face reacts
win.postMessage({ type: 'amoji:emotion', emotion: 'joy', intensity: 1 });
win.postMessage({ type: 'amoji:listen' });                        // start one voice exchange
win.postMessage({ type: 'amoji:stop' });                          // stop speech + auto loop
```

She reports state back — listen for it:

```js
window.addEventListener('message', (e) => {
  if (e.data?.type === 'amoji:state') {
    // 'idle' | 'listening' | 'thinking' | 'speaking'
    robot.setStatusLight(e.data.mode);
  }
});
```

Inside the page itself, a direct handle is also exposed:

```js
window.amoji.say('你好');
window.amoji.emotion('surprise', 1);
window.amoji.listen();
window.amoji.face.setLook(0.5, 0);   // gaze from your face/person sensor
```

## 3. Embedded engine — npm-class integration

```ts
import { AmojiFace, ledFrame, LED_SIZE, drawFace } from '@amoji/robot-face';

const face = new AmojiFace({
  canvas: document.querySelector('canvas'),   // monitor path (optional)
  driver: {
    showFrame: (frame, size) => {             // LED-matrix path
      myLedStrip.write(frame);                // WS2812 / Unitree face service / serial / ROS
    },
    speak: (text) => robotTts.say(text),      // optional TTS hook
  },
});
face.start();

face.say('你好！見到你真好！');   // text → emotion analysis → expression
face.setEmotion('sadness', 1);   // direct control
face.showHints({ joy: 0.8 });    // straight from your LLM's emotion output
face.setLook(x, y);              // gaze tracking
face.setVoiceLevel(amplitude);   // lipsync from live TTS audio
```

The LED buffer is `size×size×3` RGB bytes (default 16×16) — push it to any
matrix at your frame rate.

## Emotion ids

`joy excitement love contentment pride surprise confusion sadness anger fear`
plus `neutral` — and the wider app set (`relief shame guilt boredom contempt`
`disgust embarrassment jealousy`) maps onto the nearest face blend.

## What runs where

Everything above is free and keyless: emotion analysis is on-device, the voice
brain is the free Pollinations endpoint, TTS is Edge neural voices or the
platform speech synthesizer. Swap in your own keys later without touching the
face API.
