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
| **Voice** | ChatGPT-style emotional prosody (joy→bright, sad→soft, surprise→pitch jump) in all 4 languages; 🔊 toggle; tap-to-talk mic 🎙️ (zh-HK Cantonese recognition) |
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

## LLM keys (optional — the app works free out of the box)

Drop any of these into `apps/web/.env.local` to auto-upgrade reply quality:
`GEMINI_API_KEY` · `GROQ_API_KEY` · `OPENROUTER_API_KEY` · `GITHUB_TOKEN` (Models API) · `MOONSHOT_API_KEY`

No key → free keyless Pollinations with built-in offline banter fallback. Secret files are gitignored — never commit them.

## Asset policy

Only assets with an entry in `apps/web/public/models/ASSET_MANIFEST.md` may ship; CI enforces this.

---

*Built with 🤖 for Master Simon · Amoji — connection between AI and human.*
