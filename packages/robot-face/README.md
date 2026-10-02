# @amoji/robot-face

**Plug-and-use emotion face for humanoid robots.** One API: text / emotion in → animated face out, on a monitor or an LED-matrix face (Unitree-style). Zero dependencies.

```bash
npm install @amoji/robot-face
```

## Quick start — 3 lines

```ts
import { AmojiFace, UnitreeDriver } from '@amoji/robot-face';

const face = new AmojiFace({ driver: new UnitreeDriver('192.168.1.50') });
face.start();

face.say('你好！見到你真好！');  // analyzes the text → matching expression + speech hook
face.setEmotion('joy', 1);       // or drive it directly from your robot stack
```

## Display paths

| Path | How |
|---|---|
| **Monitor / phone display** | Pass a `<canvas>`: `new AmojiFace({ canvas })` — animated glowing eyes + mouth |
| **LED matrix face** | Your driver receives a `size×size×3` RGB `Uint8Array` every frame via `showFrame(frame, size)` — bridge it to WS2812 / Unitree face service / serial / ROS |
| **Both** | Pass canvas *and* driver at once |

## Drivers included

- `HttpDriver(url)` — POSTs each frame as JSON `{ size, frame: number[] }` to your bridge (ESP32, Unitree face service, Raspberry Pi…).
- `UnitreeDriver(ip, port=8080)` — preconfigured for Unitree robots' face service.
- Bring your own: implement `FaceDriver { showFrame?, speak? }` — e.g. publish the buffer to a ROS topic, or push it over WebSocket.

```ts
const face = new AmojiFace({
  driver: {
    showFrame: (frame, size) => myLedLibrary.render(frame, size),
    speak: (text) => myTts.speak(text),   // hook your robot's voice here
  },
});
```

## Emotions

`joy · excitement · love · contentment · pride · surprise · confusion · sadness · anger · fear`

- `face.say(text)` — built-in multilingual analyzer (Cantonese/中文/English keywords) picks the expression; hook `speak` for TTS.
- `face.setEmotion(emotion, intensity)` — direct control from your autonomy stack.
- Expressions ease in, hold (`holdMs`, default 4000), then ease back to a breathing neutral idle with blinks.

## Live demo

https://monmonmars.github.io/amoji-app/robot-demo — type text, watch the face; LED preview shows the exact buffer a robot receives.

## License

MIT — use it in your robot, ship it in your product, keep the `Amoji` credit.
