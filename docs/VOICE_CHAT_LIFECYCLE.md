# Voice chat lifecycle (overlap + interrupt + new topic)

Canonical plan: chat send → speech queue → gTTS/synth → caption → lip sync; card uses `stopSpeakingForCardAudition`.

See branch `cursor/chat-interrupt-new-topic-0340-0eac` for full mermaid diagrams, failure-mode table, P0–P2 file map, vitest + phone matrix, and merge order after #519 (card voice, merged r228).

**P0 shipped:** `apps/web/lib/chat-interrupt.ts`, `ChatPanel.send` clears content continuation on 停 / new-topic phrases before `resolveContentContinuationOnSend`.

**P1:** `clientChat` abort on newer send; epoch checks on all tiers.

**P2:** LLM history trim on topic pivot; optional caption policy.

**Tests:** `npm test -- --run chat-interrupt speech-queue no-double-speak content-continuation`

**Coordination:** align with Interrupt talk + new topic agent (`bcb37eb7` — transcript not accessible from this run).
