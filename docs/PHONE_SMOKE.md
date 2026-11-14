# Phone smoke (live Pages)

**Live:** https://monmonmars.github.io/amoji-app/  
**Purpose:** Human-only checks left after the Nov 13–14 merge wave. Agent bundle smoke already green.

Tick on a real phone (prefer iPhone Safari).

## Gate (`/gate/audio`)

- [ ] Sound test is loud and long
- [ ] Mic Allow works (or denied still continues)
- [ ] **Location Allow** appears on this same page
- [ ] Browser geo popup appears at most **once** here (not again at Start / chat enter)

## Select → chat

- [ ] Character / voice card tap speaks **one** voice (no dual overlap)
- [ ] Demo-phase chips include AI news / personal / secret / joke / poem / tip
- [ ] Tapping the **same** phase chip twice rotates content

## Dance / music

- [ ] Ask to dance / play music — body dance starts only **after** music is audible
- [ ] “Play music” without picking a song → random bed plays
- [ ] Ask to **choose** / select a song → selection chips appear

## Pitch / voice

- [ ] Different characters feel bright / mid / deep (not all same pitch)

## Agent pre-checks (2026-11-14)

| Check | Result |
| --- | --- |
| Routes `/` `/setup` `/gate/audio` `/chat` `/select` | HTTP 200 |
| Live markers: location Allow, `amoji.geo.primed`, `aiNews`, `library-clip`, `preservesPitch` | present |
| Vitest dance/music/gate/card/pitch | 46 pass |
| Hold polish #240 / #154 | superseded by main — closed |
