# CMA Reaction SFX gallery (wired)

- **URL (after Pages deploy):** /sfx-gallery
- **Range:** CMA00304–CMA00362 (**19** ship clips)
- **Original EmotionClipRow keepers (female-view #):**
  - `#12` `CMA00320` female giggle
  - `#18` `CMA00335` female poke ouch (painful, fast)
  - `#23` `CMA00318` male hard-breath / effort (full take; poke uses crop `CMA00357`)
  - `#27` `CMA00327` male gasp (poke)
  - `#30` `CMA00330` male yawn (stretching)
  - `#36` `CMA00339` male ouch / heavy-sword swing
- **Deleted:** every other CMA00304–349 code (`CMA_REACTION_DROPPED_CODES`, 40 entries)
- **New poke pack:** `CMA00350`–`CMA00362` (short ouch/gasp/effort wired into `RECORDED_POKE_ZONE`)
- **Assets:** `public/voice-clips/cma-reaction/`
- **Catalog + picks:** `lib/cma-reaction-gallery.ts`
- **localStorage key:** `amoji.cmaReactionSfx.picks.v1`
- **Play wire:** Wanted codes feed `recordedLaughClip` / `recordedPokeClip` for **all chat languages**. Skip and undecided never enter the pool. Empty Wanted falls back to the CMA zone poke table (no legacy universal CLIP_LIBRARY poke paths).
- **Untouched:** Edge TTS, Yue/ja speech, EN+Cantonese combine. Gallery Want/Skip UI still at /sfx-gallery.
