# Voice bake-off (free engines)

The live app includes a **Voice bake-off** panel in **Settings → Voice** (gear icon in chat). Use it to hear the same Cantonese / Mandarin / English sample phrase through each free TTS path before picking what feels best.

Production replies still use the existing chain in `apps/web/lib/voice.ts`: **edge-tts → gTTS → browser speechSynthesis** (plus optional paid OpenAI tier if you configure a key). The bake-off does not change that chain.

## Engines

| Engine | Cost | Cantonese | Notes |
|--------|------|-----------|--------|
| **Browser Web Speech** | Free | zh-HK on Apple (Sin-ji / HiuMaan); varies on Windows/Android | Instant local TTS; includes **Web Speech STT** (mic button) when the browser supports it |
| **Edge neural (edge-tts)** | Free | **Best free Cantonese candidate** — 曉曼 / 雲龍 neural | Uses Microsoft read-aloud WebSocket (or your HTTP TTS proxy from Settings) |
| **Google Translate TTS (gTTS)** | Free | zh-HK locale | Flatter, less natural; good fallback on iPhone silent-switch / blocked WebSocket |
| **Azure Speech F0** | Free tier (500k chars/mo) | Excellent zh-HK neural | Needs **your** key — never commit secrets |

**Puter.js TTS** is intentionally **not** included (external login/quota and Pages deploy friction).

**xAI / Grok realtime voice** is **not** included (paid).

## How to try each option

1. Open [amoji-app](https://monmonmars.github.io/amoji-app/) → chat → **Settings** (gear).
2. Scroll to **Voice bake-off**.
3. Pick a **sample phrase** (Cantonese samples included when language is 廣東話).
4. Click **▶ Play** on each engine card and compare latency + quality.
5. Choose an **active** engine (click the card title), then **🎤 Mic** for a round-trip: Web Speech STT → echo on the active engine.

### Azure Speech (optional)

1. Sign up for [Azure free account](https://azure.microsoft.com/free/).
2. Create a **Speech** resource in a nearby region (e.g. `eastasia` for Hong Kong).
3. Either:
   - Paste **subscription key + region** in the bake-off panel → **Save Azure key (this device only)**, or
   - Set build-time env vars for static export: `NEXT_PUBLIC_AZURE_SPEECH_KEY` and optionally `NEXT_PUBLIC_AZURE_SPEECH_REGION` (also reads `EXPO_PUBLIC_*` names for shared configs).

If the browser blocks cross-origin calls to Azure, you may see a fetch/CORS error — use Edge neural or gTTS for zero-config Pages hosting.

## Expected ranking (honest)

1. **Edge neural** — likely best **free** Cantonese for natural prosody (when WebSocket or proxy works).
2. **Azure F0** — similar neural quality when key + network allow REST from the browser.
3. **Browser Web Speech** — highly **variable** by OS; great on macOS/iOS for zh-HK, weaker elsewhere.
4. **gTTS** — audible almost everywhere but **weakest** expressiveness.

None of these match paid **Grok / OpenAI Realtime** speech-to-speech; the app’s goal is a strong **STT → LLM → TTS** stack at zero API cost.
