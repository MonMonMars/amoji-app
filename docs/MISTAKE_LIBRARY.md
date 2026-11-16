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

---

## Change log

| Date (UTC) | Change |
|------------|--------|
| 2026-11-16 | Initial mistake library |