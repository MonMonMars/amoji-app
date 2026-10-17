# Amoji 🤖💜

**Emotion infrastructure between AI and humans.** One emotion engine, two products:

- **B2C — the companion app.** A cozy 3D AI companion (Juno, Nova, Blaze, Mochi, Kai, Luna) who chats in natural Cantonese (default), 中文, 日本語 or English — with emotional voice, lip-sync, facial & body expression, long-term memory, and daily check-ins. Made for iPhone first; runs in any browser today.
- **B2B — the robot face SDK** (`@amoji/robot-face`). The same emotion engine as a 3-line plug-in for humanoid robots (Unitree-style LED faces, Tesla-bot builds, DIY). Text/emotion in → animated face out.

**Live demo:** https://monmonmars.github.io/amoji-app/setup
**Robot-face demo:** https://monmonmars.github.io/amoji-app/robot-demo

---

## The companion app (B2C)

| Area | What it does |
|---|---|
| **Companions** | 6 characters × 8 scenes × 4 languages; each with its own personality in the LLM prompt |
| **Emotion** | 18 idle poses, VRMA clips, viseme lip-sync, facial + body expression — she feels what she says |
| **Voice** | **Free neural voices** (Edge TTS), one slot per companion per language — not one female voice and one male voice. English and 中文 spread across the live Edge list (Jenny, Sonia, Aria, Xiaoxiao, Xiaoyi, HsiaoChen, …). 廣東話 stays on `zh-HK` (HiuGaai / HiuMaan / WanLung) because that is the whole free Cantonese catalog; pitch and pace still differ per character. 日本語 is Nanami / Keita with the same per-character pitch and pace. If Edge is blocked, browser `speechSynthesis` keeps that pitch and pace. 🔊 toggle; tap-to-talk mic 🎙️ |
| **Memory** 🧠 | Device-private long-term memory — name, likes, job, pets, mood history; injected into her prompt; 🧠 button to forget |
| **Check-ins** ⏰ | Time-aware greeting, visit streak, follow-ups on yesterday's mood |
| **Brain** | Free keyless LLM by default (Pollinations), offline banter fallback, optional bring-your-own-key upgrade (Gemini / Groq / OpenRouter / Kimi) |
| **Interaction** | Poke her, drag to rotate, pinch to zoom |

Try it: *"my name is Simon, I like hiking"* — she remembers next session.

## The robot face SDK (B2B)

```ts
import { AmojiFace, UnitreeDriver } from '@amoji/robot-face';

const face = new AmojiFace({ driver: new UnitreeDriver('192.168.1.50') });
face.start();

face.say('你好！見到你真好！');  // text → emotion → face + speech hook
face.setEmotion('surprise', 1);  // or drive directly from your autonomy stack
```

- **Two display paths** — monitor/phone canvas, or LED-matrix face (size×size×3 RGB buffer per frame)
- **10 emotions** with blink, breathing idle, smooth easing
- **Drivers included** — `UnitreeDriver`, `HttpDriver` (any ESP32/Pi bridge), or bring-your-own (ROS / serial / WebSocket)
- Zero dependencies, MIT license — details in [`packages/robot-face/README.md`](packages/robot-face/README.md)

---

## Architecture

```
apps/web                     Next.js 14 companion app (GitHub Pages static build)
  lib/emotion-core …         → packages/emotion-core: portable parametric emotion core
  lib/edge-tts.ts            free neural TTS client (Edge read-aloud, SSML prosody)
  lib/robot-face.ts          robot-face engine (web build of the SDK)
  app/api/chat/route.ts      LLM router (free default, key upgrades)
packages/emotion-core        emotion analysis + parametric expression mapping
packages/vrm-renderer        pure VRM frame mapper
packages/robot-face          @amoji/robot-face — the B2B SDK
```

All memory lives on the user's device (localStorage) — nothing is uploaded except the chat text sent to the LLM provider.

## Commands

```bash
npx pnpm@9 install     # pnpm only — npm heap-crashes on this dependency family
pnpm dev               # start the web app (http://localhost:3000/play)
pnpm test              # run all package tests
pnpm typecheck         # typecheck all packages
pnpm build             # production build of the web app
```

## Free voice (no key)

Default chain for English, 中文, 日本語, and 廣東話: **Edge TTS → browser `speechSynthesis`**. Yue stays on Edge `zh-HK` voices, then Web Speech. `canto-tts-nano` is not in this repo, so that hop is skipped. Kokoro, MeloTTS, VoxCPM2, Chatterbox, CosyVoice, and Qwen3-TTS are not hosted here.

Chat text keeps its punctuation. The spoken string may drop mark-names (`hyphen`, `period`) and rewrite dashes. The bubble does not change.

**Local** (`pnpm dev`): leave `NEXT_PUBLIC_TTS_PROXY` empty. The browser opens the free Edge read-aloud socket. No API key. Edge playback is an audio element. On an iPhone, the hardware silent switch mutes Web Speech, so a working Edge socket or this HTTPS proxy is what stays audible when the switch is on.

**GitHub Pages** is a static export and has no voice server. The same socket is the default, so the workflow does not need a secret. If a network blocks `wss://speech.platform.bing.com`, deploy the free Cloudflare worker in [`server/amoji-proxy`](server/amoji-proxy/README.md) (Edge route has no key) and set the public URL:

1. Copy `apps/web/.env.example` to `apps/web/.env.local` and set `NEXT_PUBLIC_TTS_PROXY=https://<name>.workers.dev` for local builds, or
2. In the GitHub repo, add an Actions **variable** (not a secret) named `AMOJI_TTS_PROXY` with that URL. The Pages workflow bakes it in. Clearing the proxy field in Settings turns the socket back on for that browser.

`NEXT_PUBLIC_EDGE_TTS_TOKEN` is optional. The app and the worker already use the public read-aloud client token. Set it only if that published value changes. Do not commit OpenAI, Google, Azure, or Polly keys. Those paid clouds are optional later; OpenAI speech stays an opt-in key in Settings and is not the default voice.

### Manual check

1. **English**: Shino speaks as Jenny (`en-US-JennyNeural`). Switch to Shibu and test again: Sonia (`en-GB-SoniaNeural`), a different voice. Ethan is Ryan (`en-GB-RyanNeural`); the other male is Guy. Neural off: a browser English voice still speaks, higher or lower with the character.
2. **中文**: Shino is Xiaoxiao, Shibu is Xiaoyi. The two males are Yunjian and Yunxi. Offline, a Chinese browser voice still speaks when one is installed.
3. **廣東話**: Shino is HiuGaai, Shibu is HiuMaan, both `zh-HK`. The two males share WanLung at different pitches. Offline, a `zh-HK` browser voice speaks when installed. No canto-tts-nano download.
4. **日本語**: Nanami or Keita. The free list has one female and one male voice, so companions differ by pitch and pace. Then a `ja-JP` browser voice if Edge is blocked.
6. Send a line with punctuation (`你好。再講` or `Wait — really.`). The bubble still shows the marks. She does not say the words "period" or "hyphen".

## LLM keys (optional — the app works free out of the box)

Drop any of these into `apps/web/.env.local` to auto-upgrade reply quality:
`GEMINI_API_KEY` · `GROQ_API_KEY` · `OPENROUTER_API_KEY` · `GITHUB_TOKEN` (Models API) · `MOONSHOT_API_KEY`

No key → free keyless Pollinations with built-in offline banter fallback. Secret files are gitignored — never commit them.

## Asset policy

Only assets with an entry in `apps/web/public/models/ASSET_MANIFEST.md` may ship; CI enforces this.

Modular head/body swap (female demo wardrobe) loads `apps/web/public/models/modular/<ID>/<ID>_head.glb` and `_body.glb` when those files are present, and keeps the single-VRM path when they are not. Head is identity; body is the outfit; the head is not rescaled. Copy the existing GLBs from `D:\Blender\projects\mon-character\free-library\modular\` — see `apps/web/public/models/modular/README.md`. Do not re-split them.

---

*Built with 🤖 for Master Simon · Amoji — connection between AI and human.*
