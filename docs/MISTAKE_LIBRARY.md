# Mistake library (regressions — honest)

**Purpose:** Owner-reported breakages, root cause, fix PR, churn notes. **Merged ≠ fixed** until phone-smoke OK.

**Living log:** `/cursor/stores/self/OWNER_REQUEST_LOG.md`  
**Artifacts:** `/opt/cursor/artifacts/mistake-library.md`

---

## Active owner pain

| Symptom | Root cause | Fix / PR | Status |
|---------|------------|----------|--------|
| Card greet silent | Edge `onPlaying` halted in-flight gTTS; early `onEdgeFail`; failed `play()` retry | **#440** + **`07dd76e3`** (claim-then-die salvage) | Merged — needs phone |
| Card robot double | Insurance + stacked fallbacks | Remove insurance **#440** | Outstanding |
| Non–Yue-F mute / wrong sink | Split audio policy | **#424–#448** | Outstanding — R10 |
| Idle bad blend | Toxic clips, yaw spin | **#441** v6 Quaternius | Outstanding — R11 |
| Picks wiped on refresh | Idle key churn | **#432 #442** v6 freeze | Outstanding |
| Poke lean wrong | Coord mismatch | **#443** | Outstanding — R13 |
| **Poke front/back inverted (again)** | Axial lean reused the punch direction: a front poke (`fallZ = -1`) produced a backward recoil. Fixed by `AXIAL_TOWARD_POKE` in `lib/poke-hit.ts`; numeric pinned test so it cannot flip silently. This is a **repeat** of R13 — never re-derive the sign from `fallZ` alone. | **r290** | Merged — needs phone |
| **Chat voice intermittent (“sometimes has voice, but mostly no voice”)** | A reply whose TTS tier neither started audio nor rejected kept `LineQueue.playing` latched on the strictly serial speaker, so every later reply queued behind a dead line until reload. Proof of sound was a **timestamp**, so a start callback from the same millisecond made a silent line look audible. Now a 12 s no-start watchdog cuts the line, proven by a monotonic audio-START **counter**; backgrounded `<audio>` resumes on tab show; shared AudioContext resumes before playback. | **r290** | Merged — needs phone |
| News repeat/short | Cache + prompt | **#444 #452** | Outstanding |
| Fixes on main but phone unchanged | Stale SW / old JS bundle | **#458–#462** delivery + `verify:live` | Merged — owner must refresh to **r167** |

---

## Churn (do not repeat)

| Mistake | Correct approach |
|---------|-------------------|
| Insurance robot card greet | gTTS/Edge after gesture; no OS synth primary |
| `haltSynthQueue` on Edge playing | `haltBrowserSynth` + deferred stop (**`07dd76e3`**) |
| Idle v7+ without migration | Stay on `amoji.idle*.v6` |
| Inventing SFX deletes | Only `SFX_WANT_LIST.md` map |
| Done on CI only | `PHONE_SMOKE.md` + owner OK |
| More SW bumps without owner smoke | Delivery done; Phase B per `PHASE_B_MAP.md` |
| Deriving poke lean from `fallZ` alone | Axial lean uses `AXIAL_TOWARD_POKE`; lateral stays `-fallX`. Numeric pinned test in `poke-hit.test.ts` |
| Proving "she spoke" with `Date.now()` | Compare the monotonic audio-START counter (`voiceStartSeq`); equal-millisecond callbacks made a silent line look audible |
| Assuming one utterance proves chat voice | Intermittent silence only shows on the 2nd/3rd line — `voice-sequence-sink.test.ts` drives five replies + tab resume + a dead line |

---

## Change log

| Date (UTC) | Change |
|------------|--------|
| 2026-11-16 | Initial mistake library |
| 2026-11-23 | r290: poke front/back lean flipped back toward the poked side; chat voice serial queue now releases a line with no audio-START (12 s counter watchdog) and resumes backgrounded audio |