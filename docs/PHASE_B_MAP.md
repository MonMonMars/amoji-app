# Phase B entry map (surgical — after owner smoke)

Use only when the owner names a **failing `PHONE_SMOKE.md` row** and device.

| Smoke row | First files to inspect |
|-----------|-------------------------|
| Card greet silent / robot | `lib/voice.ts` (`playVoiceGreeting`), `lib/gtts.ts`, `lib/edge-tts.ts`, `lib/audio-output.ts`, `components/SelectionBoard.tsx`, `components/TtsVoiceRow.tsx` |
| Only Yue-F / wrong speakers (R10) | `lib/audio-output.ts`, `lib/voice.ts` (`beginTts`, `pinSinkBeforePlay`), `lib/voice-chat-focus.ts`, `components/PreChatAudioGate.tsx` |
| Mic off→on | `lib/voice-chat-focus.ts`, `components/ChatPanel.tsx`, `lib/voice.ts` (`waitForVadRelease`) |
| News repeat / English on zh-yue | `lib/live-tools.ts` (`NEWS_TOLD_*`, `sayNews`), `lib/client-chat.ts` news paths |
| Idle blend / wrong stand (R11) | `lib/idle-prefs.ts`, idle blend in chat/scene, honor `owner-resource-manifest.ts` |
| Poke lean / SFX (R13) | poke impulse + lean side, `docs/SFX_WANT_LIST.md` |
| Lighting (R12) | `applyCastShaderLook`, MToon/unify cast |
| Captions dup / scroll | `lib/speech-caption.ts`, `components/ChatPanel.tsx`, `components/ChatMessage.tsx` |
| Nonsense / history-resume / UM | `lib/spoken-line-sanity.ts`, `components/ChatPanel.tsx`, `lib/client-chat.ts` |

**Redesign candidates** (only if surgical fixes fail twice): `CompanionAudioPolicy`, `IdleController`, `GreetArbitrator`, `NewsTellPipeline`, `PokeImpulse` — see artifact `PROGRAMMING_PLAN.md`.