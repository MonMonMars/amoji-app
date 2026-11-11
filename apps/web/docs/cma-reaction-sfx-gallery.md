# CMA Reaction SFX gallery (wired)

- **URL (after Pages deploy):** /sfx-gallery
- **Range:** CMA00304–CMA00366 (**23** ship clips)
- **Original EmotionClipRow keepers (female-view #):**
  - `#12` `CMA00320` female giggle
  - `#18` `CMA00335` female poke ouch (painful, fast)
  - `#23` `CMA00318` male hard-breath / effort (full take; poke uses crop `CMA00357`)
  - `#27` `CMA00327` male gasp (poke)
  - `#30` `CMA00330` male yawn (stretching)
  - `#36` `CMA00339` male ouch / heavy-sword swing
- **Deleted:** every other CMA00304–349 code (`CMA_REACTION_DROPPED_CODES`, 40 entries)
- **New poke pack:** `CMA00350`–`CMA00362` (short ouch/gasp/effort wired into `RECORDED_POKE_ZONE`)
- **Legacy main poke CLIP rows:** `CMA00363`–`CMA00366` (um / giggle / ha / wow — were played on main but missing from the selectable list)
- **Assets:** `public/voice-clips/cma-reaction/`
- **Catalog + picks:** `lib/cma-reaction-gallery.ts`
- **localStorage key:** `amoji.cmaReactionSfx.picks.v1`
- **Select UI:** EmotionClipRow tap cycles Want → Skip → clear (same picks as /sfx-gallery).
- **Play wire:** Wanted poke codes feed `recordedPokeClip` (zone clip preferred when still Wanted/enabled). Empty Want → full poke-role list minus Skip (default = full updated list). Skip never enters the pool. Zone-table paths are always CMA gallery members.
- **Untouched:** Edge TTS, Yue/ja speech, EN+Cantonese combine. Gallery Want/Skip UI still at /sfx-gallery.
