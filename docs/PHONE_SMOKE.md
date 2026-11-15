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

## Pitch / voice (R10 — after #406 + voice v2)

- [ ] deep / mid / bright buttons are **obviously** different (same lang)
- [ ] Male button sounds male (not female pitched down slightly)
- [ ] Non-Yue (en / zh / ja) plays on **same speakers** as gate sample
- [ ] Female Cantonese still works after male / other-lang tries

## Idle / poke / lighting (R11–R13 — after #407–#409)

- [ ] Idle looks upright planted calm (not Sassy / sky-look / arms-into-torso)
- [ ] Poke left side of body → character tips **screen-left** (same side)
- [ ] Poke right → tips screen-right
- [ ] All cast members look like the **same lighting / shader style**

## Agent pre-checks (2026-11-14)

| Check | Result |
| --- | --- |
| Routes `/` `/setup` `/gate/audio` `/chat` `/select` | HTTP 200 |
| Live markers: location Allow, `amoji.geo.primed`, `aiNews`, `library-clip`, `preservesPitch` | present |
| Vitest dance/music/gate/card/pitch | 46 pass |
| Hold polish #240 / #154 | superseded by main — closed |
