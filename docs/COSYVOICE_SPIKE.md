# CosyVoice spike

Decision for Mon: **leave Edge neural and Web Speech as the default.** Do not bundle CosyVoice. This change adds an optional, default-off experiment that can call a CosyVoice server you run yourself. If that call fails or times out, the existing chain speaks.

## What is already on main

Production replies use `freeVoiceHops()` in `apps/web/lib/tts-chain.ts`:

**Edge (locale + gender) → speechSynthesis**

Yue can add `canto-tts-nano` only when that runtime exists. It does not. OpenAI speech runs only when a key is saved. `gtts.ts` is no longer a hop.

`HELD_GPU_ENGINES` in `apps/web/lib/voice-catalog.ts` already lists `cosyvoice` as “not called”. Kokoro, Piper, MeloTTS, and Bark are catalog rows with `shipping: false`. Nothing in that list is downloaded by the app.

PR **#1** (Voice bake-off, branch `cursor/voice-bakeoff-3886`) is still **open and unmerged**. It was cut from r136 and is not on current main. No bake-off panel, Azure client, or feature flag from that PR remains in the tree. The hop list above is the switch that replaced it. This spike does not revive Azure (that path needs a key).

## Why there is no in-browser CosyVoice demo

| Build | Weights | What it needs | Fit for GitHub Pages |
| --- | --- | --- | --- |
| Fun-CosyVoice3-0.5B | ~3.4 GB fp32 plus a ~1 GB tokenizer | GPU, about 8–12 GB VRAM; Python + vLLM or TensorRT | No |
| CosyVoice2-0.5B | ~2.6 GB | Same. Official FastAPI default. **No SFT speakers** (zero-shot only) | No |
| CosyVoice-300M-SFT | hundreds of MB to ~1 GB class | The only build with baked speakers, including **粤语女**. Still a Python server. CPU is too slow for a chat reply | Server you host, not a Pages asset |
| Community 300M ONNX | ~1.4 GB across six graphs | ONNX Runtime, not a browser package. WebGPU covers only some ONNX ops | No |

The official browser story does not exist. A WASM/WebGPU port would still be a multi-hundred-megabyte download and a GPU on the phone. That is out of scope for this app.

Closest **free in-browser** engines are already named in the catalog and still unwired: **Kokoro** (Apache-2.0, small, weak Cantonese versus Edge 曉曼) and **Piper** via sherpa-onnx WASM. They are the right follow-up if the goal is “no server”. They are not CosyVoice, and this spike does not bundle them.

## What this spike wires

Default chain, unchanged:

```text
edge → synth
```

Only when **both** are true:

1. Settings → Voice → **CosyVoice experiment** is on (`localStorage` `amoji.cosyvoice.experimental.v1=on`; missing means off).
2. A server URL is saved (or `NEXT_PUBLIC_COSYVOICE_URL` is set, and Clear has not stored an empty override).

the hop list becomes:

```text
cosyvoice → edge → synth
```

`speak()` tries `POST {origin}/inference_sft` with form fields `tts_text` and `spk_id`. The body is raw PCM. The client wraps a WAV header at **22050 Hz** and plays it on an `<audio>` element. After **8 seconds** with no audio, or on any error, Edge runs. `stopSpeaking()` cuts the clip. Singing stays on Edge (SSML melody). The experiment is not inserted ahead of a saved OpenAI key; OpenAI, when configured, still leads, then this hop list.

▶ Play on that settings row speaks one line through CosyVoice only, so a bad URL does not have to be turned on for live chat first.

### Speaker map (CosyVoice-300M-SFT only)

| Language | Female | Male |
| --- | --- | --- |
| 廣東話 | 粤语女 | none — Edge 雲龍 speaks |
| 中文 | 中文女 | 中文男 |
| 日本語 | none — Edge Nanami speaks | 日语男 |
| English | 英文女 | 英文男 |

A missing speaker rejects immediately (no 8s wait). CosyVoice2/3 will HTTP-error on these ids; that also falls through to Edge.

Upstream SFT sometimes drops the last character or two of a line. That is a model bug, not something this client fixes. Another reason not to make it the default.

## How to listen

On a machine with a GPU (CPU will miss the 8s budget):

```bash
# CosyVoice repo, Apache-2.0. Model download is the heavy part — not this app.
python runtime/python/fastapi/server.py --port 50000 --model_dir pretrained_models/CosyVoice-300M-SFT
```

The official server already sends `Access-Control-Allow-Origin: *`.

Then in the app: Settings → Voice → paste `http://127.0.0.1:50000` → ▶ Play. Turn the experiment on only if that clip is worth hearing instead of Edge for live replies. Phone browsers cannot call your laptop’s localhost; the URL has to be reachable from the device.

## Plug-in points

| Piece | Role |
| --- | --- |
| `apps/web/lib/tts-chain.ts` | `freeVoiceHops(..., { cosyvoice })` prepends the hop only when the flag is passed. Default calls omit it. |
| `apps/web/lib/cosyvoice-tts.ts` | Flag, URL, speaker map, PCM→WAV, `speakCosyVoice` / `stopCosyVoice`. |
| `apps/web/lib/voice.ts` | Passes `cosyvoice: cosyvoiceActive()` into the hop list. Failure calls the next hop. |
| `packages/engine` `VoiceDriver` | Licensee hook (`speak(text, prosody)`). Not used by the web app’s playback. SFT has no rate/pitch channel, so a driver would ignore `VoiceProsody` or move to `inference_instruct`. Not wired. |

## Recommendation

1. Compare **粤语女** to Edge **曉曼** on a real Cantonese line. If 曉曼 wins, leave the flag off and close the experiment.
2. Do not put CosyVoice2/3 in the client until there is a reference clip and a zero-shot route. That is a different feature (voice clone), and it is heavier.
3. If the goal is offline / no GPU box, prototype **Kokoro or Piper** as another non-shipping hop the way `canto-nano` is stubbed. Do not download those weights in the Pages build until a listen says they beat Edge somewhere Edge is weak.
4. Keep PR #1 closed or rebased only if you still want a side-by-side panel. The chain flag is enough to try one engine without a second UI.
