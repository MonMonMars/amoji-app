# Voice — one-time emotional bake (Cantonese)

**Status:** plan only · no production code, no keys, no revision bump
**Date:** 2026-11-28 (HKT) · **Owner:** Pixel
**Scope:** pre-generate the app's **fixed** Cantonese emotional moments with a
high-emotion engine, ship them as static MP3s, and play them through the clip
machinery that already exists.
**Budget rule:** one-time spend only, no recurring per-character or monthly
billing. **Net bake:** 222 short lines / ~2,560 characters.

---

## RECOMMENDATION

**Build it — after a 10-line audition, not before.** The entire fixed-moment
surface is only ~2,560 Cantonese characters, so one month of ElevenLabs Creator
(US$22, cancelled immediately) generates every file, and the assets are then
permanent with zero marginal cost and zero added latency. The app already has
the exact delivery machinery (`voice-clips.ts` → `playVoiceClip()` → the speech
queue), so this is a small, reversible integration rather than a new voice
system. The one thing that is **not** proven is ElevenLabs' Cantonese quality:
`language_code: "yue"` is documented for v3/v4 but we have not heard it, and the
owner has rejected synthetic voices before. Treat the audition in §5 as a hard
gate; if the 10 lines do not sound like a Hong Kong speaker, stop and spend
nothing further. This is the only option that fits "one-time spend, no
recurring billing" without a card left on file.

---

## 1. Why this works

Emotional *moments* matter more than unbounded chat. The app already separates
them: greetings, poke reactions, comfort lines, goodnights and idle chatter are
**fixed strings** selected in code, while only the open-ended reply tail is
LLM-generated. Pre-rendering the fixed strings buys the highest emotional value
per dollar: a cached MP3 is instant (no network round-trip), free forever, works
offline under the existing clip player, and cannot regress the live chain
because it is only preferred when a file exists.

The live chain today is `gtts → synth → canto-nano → edge` for default/female
and `edge → synth → gtts` for male (`apps/web/lib/tts-chain.ts`). In practice
gTTS wins, and gTTS is a Google *Translate* MP3: one speaker, no SSML, no
prosody, emotion = playback rate only. That is the flatness the owner hears.
Baking replaces **only** those lines where the words are known in advance.

---

## 2. The exact line list to record

Counts are derived from the real banks in `apps/web/lib/interaction-lines.ts`,
`voice-clips.ts`, `idle-talk.ts`, `personality-voice.ts` and the 19 `EmotionId`
values in `packages/emotion-core/src/catalog.ts`. Character counts are the
Cantonese string only (punctuation included, SSML/tags excluded).

| # | Moment | Lines | Example Cantonese line | ElevenLabs tag | App emotion(s) | Priority |
|---|--------|------:|------------------------|----------------|----------------|----------|
| 1 | Greetings / card taps (`GREETING_TEXT` × 3 takes, `CARD_GREET_PHRASES`) | 12 | 「好開心認識你。」 | `[warm]` | love, joy | P0 |
| 2 | Poke impact — 7 effective personalities × 13 zones, one canonical take per pair (`shortInteractionLines`) | 91 | 「哈哈，個頭呀？」 | `[playful]` `[laughs]` | joy, surprise | P0 |
| 3 | Poke recover / settle — 7 × 6 high-traffic zones | 42 | 「緩過嚟喇。換邊？」 | `[relieved]` `[sighs]` | relief, contentment | P1 |
| 4 | Comfort / stay-with-you (`STAY_TOPIC_LINES` + 6 takes) | 12 | 「你頭先嗰句我聽到喇——我仲喺度陪住。」 | `[soft]` `[sighs]` | love, contentment, relief | P0 |
| 5 | Goodnight / farewell — **new canned bank** (8 lines) | 8 | 「早啲唞，聽日再傾。」 | `[gentle]` `[whispers]` | love, sadness | P1 |
| 6 | Apology / repair — **new canned bank** (6 lines) | 6 | 「對唔住，頭先我講錯咗。」 | `[sad]` `[sighs]` | guilt, shame | P1 |
| 7 | Warm opinion / praise — **new canned bank** (8 lines) | 8 | 「我覺得你好努力，真係。」 | `[warm]` `[happy]` | pride, love, joy | P2 |
| 8 | Idle chatter — 7 personalities × 6 (`voiceIdleLines`) | 42 | 「今日天氣有啲涼，記住加件衫。」 | `[calm]` | contentment, neutral | P2 |
| 9 | Shy hand-hold (`HAND_HOLD_SHY.yue`) | 1 | 「你點解攞住我隻手㗎……我有少少怕醜。」 | `[shy]` `[whispers]` | embarrassment | P1 |
| | **Total** | **222** | | | | |

Tag names are **directional prompts, not an enum**. ElevenLabs documents
`[sad]`, `[laughs]`, `[whispers]` and `[sighs]`; adjectives like `[warm]` or
`[gentle]` are natural-language hints whose effect varies by model and by
Cantonese support. The audition in §5 is where each tag is confirmed or
dropped; nothing in the runtime depends on a tag.

Per-category character estimate (the sum is the number that drives cost):

| # | Lines × avg chars | Characters |
|---|-------------------|-----------:|
| 1 | 12 × 5.5 | 66 |
| 2 | 91 × 8 | 728 |
| 3 | 42 × 9 | 378 |
| 4 | 12 × 18 | 216 |
| 5 | 8 × 13 | 104 |
| 6 | 6 × 15 | 90 |
| 7 | 8 × 15 | 120 |
| 8 | 42 × 20 | 840 |
| 9 | 1 × 18 | 18 |
| | **Net bake** | **2,560** |

### Why "7 personalities", not 12

`personalityFor()` in `apps/web/lib/personality.ts` assigns **every female cast
member the `shy` personality** and hashes males across the six male
personalities (`steady`, `cool`, `warm`, `quiet`, `sporty`, `wry`). So the
reachable poke bank is 1 + 6 = 7 personalities, not 12. This is why a
few-hundred-line bake is realistic.

### What must NOT be baked

- **Laugh / giggle / smile / wow / um / oh / ha** — already recorded human
  bursts (215 `.mp3` files under `apps/web/public/voice-clips/`). TTS laughing
  is the exact failure the library exists to prevent. Do not add these.
- **Loading fillers** — `performSpeak()` drops `filler` jobs before any tier
  runs (`if (filler) { settle(); return; }`), so a baked filler would never
  play. Keep the recorded um clips.
- **Song / music intro** — the title is dynamic
  (`performanceIntroLine()` interpolates the track name), so the whole sentence
  cannot be cached. Only the fixed frame could be stitched, which needs audio
  concatenation and is not worth it. Leave on the live chain.
- **Open-ended chat replies** — LLM text changes every turn. A baked line with
  the wrong words must never be substituted just because the emotion matches.

The three **new canned banks** (goodnight, apology, praise) are the only new
product strings in this plan. They need a trigger, so §4 wires them to the
existing farewell detector (`apps/web/lib/moves.ts` `goodbye` regex /
`follow-up.ts` `FAREWELL_RE`) and to explicit chips/actions; they are not
injected into arbitrary LLM replies.

---

## 3. Estimated one-time cost

ElevenLabs bills **1 credit per character** for TTS (their pricing FAQ,
fetched 2026-11-28). Generation envelope:

| Item | Characters |
|------|-----------:|
| Net bake | 2,560 |
| 10-line audition (≈16 chars each) | ~160 |
| Retake allowance (20% of net) | ~512 |
| **Generation envelope** | **~3,232** (round to 3,300) |

Plan arithmetic (USD, excluding tax; prices as of 2026-11-28):

| Plan | Included | Price | Arithmetic | Result |
|------|----------|-------|------------|--------|
| Free | 10,000 credits / month | $0 | 3,232 ÷ 10,000 = 32% of one month | **$0**, but Free has **no commercial licence** |
| Starter | commercial licence; smaller allowance than Creator (confirm at checkout) | $60 / year ($5/mo) | 3,232 fits any paid allowance | $60 one-time for a year |
| **Creator (recommended)** | 100,000 credits / month | **$22 / month** | 3,232 ÷ 100,000 = 3.2%; 3,232 × $0.00022/char = **$0.71 of credit value** | **$22 one-time**, cancel immediately |
| Pro | 600,000 credits / month (pricing page, 2026-11-28) | $99 / month | 3,232 × $0.000165 = $0.53 | overkill |

- Effective rate: **$22 ÷ 100,000 = $0.00022 per character** = **$0.22 per
  1,000 characters**.
- The full envelope costs **$0.71 of credit value**; the $22 is a plan minimum,
  not a metered charge. Cancel after generation — the MP3s are permanent local
  assets and the account is not needed afterwards.
- The free 10,000/month allowance would cover the bake **three times over**,
  but the free plan's outputs are non-commercial. Do not ship free-plan audio in
  the live product.
- Black Friday 2026 (ends 2026-12-01) advertises Creator annual at $99 for the
  first year. That is a 12-month commitment and therefore **not** a one-time
  spend; ignore it for this job.

**Bottom line: one-time US$22 (+ tax), zero recurring, zero per-character
billing afterwards.**

---

## 4. How they slot into the existing machinery

### 4.1 File layout (do not touch `CLIP_LIBRARY`)

`CLIP_LIBRARY` in `apps/web/lib/voice-clips.ts` is a flattened source of truth:
`listClipLibrary()` numbers every row in order, and the SFX picker/CMA indices
depend on those numbers. Adding files to it would shift every id. The existing
code already avoids this for extra takes (`LONG_UM_FILES`, `cma-reaction/`), so
the bake follows that precedent:

```
apps/web/public/voice-clips/moments/
  yue/female/<moment-id>.mp3
  yue/male/<moment-id>.mp3
  manifest.json          # generated; source of truth for what exists
```

Suggested ids (stable, not localized): `greet-hello-01`, `poke-impact-shy-head`,
`comfort-stay-03`, `farewell-goodnight-02`, `apology-repair-01`,
`praise-warm-04`, `idle-shy-06`, `handhold-shy-01`.

`manifest.json` rows carry `{ id, moment, gender, emotion, text, file, engine,
model, voiceId, generatedAt }`. The `text` field is what enables the exact-text
lookup below; the generator writes it, the runtime never guesses.

### 4.2 New module (one file, no new system)

`apps/web/lib/voice-moments.ts`:

- `momentClipFor(moment, gender, emotion?)` → path from the manifest.
- `momentClipForText(text, gender)` → path when the exact cleaned text matches a
  manifest row (covers callers that do not pass a moment id).
- `bakedMomentAvailable(moment, gender)` → boolean; used by the UI to avoid
  promising a moment that has no file.
- No network, no fetch of the manifest at runtime: import the JSON so it is
  tree-shaken into the bundle (it is a few KB).

### 4.3 Preferred-clip path, then existing chain

Add an optional `moment?: MomentId` to `SpeakOptions` (`apps/web/lib/voice.ts`
~1717) and to `SpeechJob` (~1306), copied through `speak()` → `lineQueue` →
`drainSpeech()` → `performSpeak()`. `performSpeak()` gains a `moment` argument
(next to `voicePin`, ~1859). Then, **after** `cleanForSpeech()` and the filler
gate, **before** the tier chain:

```ts
const dominantEmotion = /* highest-scoring key of emotionHints, or 'neutral' */;
const baked = lang === 'yue' && !filler
  ? momentClipFor(moment, companionGender, dominantEmotion)
    ?? momentClipForText(text, companionGender)
  : null;
if (baked) {
  try {
    await playVoiceClip(baked, text);
    settle();
    return;                       // baked wins; never double-voice
  } catch {
    /* 404 / cancel / stall -> fall through to today's chain */
  }
}
```

This reuses exactly the existing helpers:

- `playVoiceClip()` (`apps/web/lib/play-voice-clip.ts`) already plays to the end,
  reports `noteSpeechStarted()`/`followAudioElement()` so lip-sync and the
  performance bed see it, and rejects after a 6 s stall on a missing file.
- `voice-clips.ts` remains the place for **bursts**; moments are a separate
  folder because they are sentences, not vocalizations.
- No new queue, no new audio element, no change to `mustBeHeard`: the bed gate
  and the `speak()` idempotence check have already run before `performSpeak()`,
  so a baked moment inherits both invariants. A `mustBeHeard` poke still ends
  the music bed first, exactly as today.

### 4.4 Call-site mapping

| Caller today | Passes | Moment |
|---|---|---|
| `playSelectGreeting()` / `playVoiceGreeting()` | `speak(..., { moment: 'greet-…' })` | greeting bank |
| `playPokeBurst()` → `pokeReactionLine()` | `moment: 'poke-<phase>-<personality>-<zone>'` | poke banks |
| `idleTalk` / `STAY_TOPIC_LINES` | `moment: 'comfort-stay-<n>'` | comfort |
| a new farewell action using `moves.ts` / `FAREWELL_RE` | `moment: 'farewell-goodnight-<n>'` | goodnight |
| an explicit apology action | `moment: 'apology-repair-<n>'` | apology |
| an explicit "what do you think of me" chip | `moment: 'praise-warm-<n>'` | praise |
| `HAND_HOLD_SHY` path | exact text match | hand-hold |

If a caller passes no moment, exact-text matching still works for the fixed
banks; arbitrary LLM text never matches, so it falls through to the live chain.

### 4.5 Emotion → clip id

The runtime emotion vocabulary is the 19 `EmotionId`s (`joy`, `sadness`,
`anger`, `fear`, `disgust`, `surprise`, `neutral`, `love`, `embarrassment`,
`pride`, `shame`, `excitement`, `contentment`, `boredom`, `confusion`,
`jealousy`, `guilt`, `relief`, `contempt`). The manifest maps each **moment** to
its allowed emotions; `momentClipFor()` may choose among takes for the same
moment by emotion, but it never maps an emotion to an arbitrary sentence. That
keeps the words and the feeling coupled.

### 4.6 The `stripStageDirections()` trap

`cleanForSpeech()` → `stripStageDirections()` **deletes** `[sad]`, `[laughs]`,
`(softly)`, `*sighs*` before any TTS tier sees the text. That is correct for the
live chain and irrelevant for the bake, because tags exist only in the offline
generation script — the runtime only plays the finished MP3. Do **not** try to
send ElevenLabs tags through `speak()`; they would be silently removed. If a
live ElevenLabs tier is ever added, it needs a tag-preserving cleaner that runs
*before* `stripStageDirections()` and keeps only a whitelist; that is out of
scope here.

---

## 5. Cantonese quality risk — hard audition gate

**Unverified:** ElevenLabs documents `language_code: "yue"` for v3/v4, but we
have not measured Cantonese naturalness. The tag vocabulary is also
model-dependent (v4 vs v3). Do not generate 222 lines before the owner has
heard a sample.

Generate **only these 10 lines** first, in both female and male voices, on
`eleven_v3` and `eleven_v4`, then stop:

| # | Audition line | Tag | What it tests |
|---|---------------|-----|---------------|
| 1 | 「好開心認識你。」 | `[warm]` | basic Hong Kong vowels, no Mandarin shift |
| 2 | 「哈哈，個頭呀？你想再嚟？」 | `[playful]` | short poke rhythm, final particles |
| 3 | 「你頭先嗰句我聽到喇——我仲喺度陪住。」 | `[soft]` | long sentence, dash pause, warmth |
| 4 | 「早啲唞，聽日再傾。」 | `[gentle]` | goodnight softness, no sing-song |
| 5 | 「對唔住，頭先我講錯咗。」 | `[sad]` | apology sincerity, not theatrical |
| 6 | 「我覺得你好努力，真係。」 | `[warm]` | praise that does not sound patronising |
| 7 | 「你點解攞住我隻手㗎……我有少少怕醜。」 | `[shy]` | whisper/hesitation, ellipsis |
| 8 | 「嘻，咁都俾你捉到。」 | `[laughs]` | does the laugh tag work in `yue` at all? |
| 9 | 「嗯……等我諗下先。」 | `[thoughtful]` | fillers and pause, no robot cadence |
| 10 | 「唔好唔開心，我喺度。」 | `[soft]` `[sighs]` | the comfort line the owner cares about |

Pass criteria (owner signs a dated row in
`docs/voice-auditions/2026-11-28-elevenlabs-yue.md`):

- Sounds like a **Hong Kong Cantonese** speaker, not Mandarin-accented.
- Final consonants `-p / -t / -k` and the six tones are audible and correct.
- The emotion is in the **voice**, not just slower/faster playback.
- No random English, no reading punctuation aloud, no clipping, no warble.
- The male voice reads male; the female voice is not child-like unless intended.
- Tags are either honoured or harmlessly ignored — if `[laughs]` produces a
  weird noise, drop that tag and keep the recorded laugh SFX.

**Gate:** owner must write `AUDITION: PASS <model> <voice-id>` before any full
batch. If it fails, the fallback is Doc 2 (Chirp) or no change; do not spend the
$22.

---

## 6. Licence / ToS checkpoints

- **Commercial use:** the free plan does **not** include a commercial licence;
  Starter and above do. Because this ships in the live app, use one paid month
  (Creator, $22) rather than the free allowance.
- **Voice choice:** use a stock Voice Library voice or a designed voice. Do not
  clone Pixel, a cast member, or any real person. Record the `voice_id` and the
  model id in `manifest.json` so the batch is reproducible.
- **Attribution:** ElevenLabs does not require on-screen attribution on paid
  plans, but keep the generation record (date, plan, model, voice id) in the
  repo. If a Voice Library community voice is used, its own licence terms apply
  — prefer a stock voice to avoid that dependency.
- **Redistribution:** the generated MP3s are the app's assets, not a
  redistribution of the model. Do not commit the API key, prompts containing
  private user text, or the account credentials.
- **Free-tier restriction:** if the owner insists on $0, the audio is
  non-commercial and cannot ship. Say so explicitly rather than quietly using
  it.

---

## 7. Exact verification

### Unit tests (Vitest, `apps/web/tests/`)

1. `voice-moments.test.ts`
   - Every `manifest.json` `file` exists under `public/voice-clips/moments/`.
   - Every id is unique; every `emotion` is one of the 19 `EmotionId`s.
   - `momentClipFor()` returns `null` for a missing moment/gender, never a
     path to a non-existent file.
   - `listClipLibrary()` id count and order are **unchanged** (proves the bake
     did not touch `CLIP_LIBRARY`).
2. `voice-moment-fallback.test.ts` (mock `playVoiceClip`)
   - Baked file resolves → `speakGtts`/`speakEdge` are never called.
   - Baked file rejects → the next hop in `freeVoiceHops()` runs.
   - `mustBeHeard` + active music bed → bed ends before the clip plays.
   - Non-`yue` locale never looks up a moment.
3. `yue-three-voice.test.ts` (existing) must stay green — the bake adds no
   fourth Edge voice and no catalog row.

### Manual / phone smoke

Add to `docs/PHONE_SMOKE.md` under a new heading, and report on a real phone:

```
ROW: voice-bake DEVICE: <model>
- greet / poke / comfort: does the voice sound warmer than the gTTS line?
- any line spoken twice (baked + live chain)?
- delete one MP3 from the deployed build: does the same line still speak (fallback)?
- male companion: baked male file, never the female gTTS speaker?
- music bed: does a baked poke still stop the song before speaking?
```

### Cost verification

- Count characters in the final manifest: `sum(len(text))`.
- Assert it is ≤ 3,300; if it is higher, regenerate the estimate before paying.
- Keep the ElevenLabs invoice/receipt with the batch date in the PR description
  (or an internal note), not in the repo.

---

## 8. Build order

1. Owner runs the 10-line audition → writes `AUDITION: PASS`.
2. Generate the full batch into `public/voice-clips/moments/yue/…`; commit the
   MP3s + `manifest.json` + the offline script (not the key).
3. Add `voice-moments.ts` and the `moment` plumbing in `voice.ts`.
4. Add tests; run `cd apps/web; npm test -- --run`.
5. Bump `APP_REVISION`, `public/sw.js` `CACHE`, `public/revision.txt` when the
   assets ship (per `AGENTS.md`).
6. Phone smoke row; only then mark done.

## Open questions (unverified)

- ElevenLabs Cantonese naturalness and whether audio tags work in `yue`
  (audition decides).
- Whether the owner wants the new goodnight / apology / praise banks at all;
  they are product copy, not just audio.
- Whether baking a *male* companion is worth it: male poke lines are shorter
  and the Edge WanLung path is already male, but gTTS still wins by default.
- Exact studio voice for each of the 3 personas; the bake should use **one**
  ElevenLabs voice per gender (a fourth persona would violate the 3-voice
  decision). Per-character identity stays on rate/pitch offsets, as it does for
  Edge today.
