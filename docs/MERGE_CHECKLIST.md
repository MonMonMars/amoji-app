# Contributor merge checklist

For Pixel / maintainers. Agents cannot merge without GitHub write auth.

> **Note (2026-11-11 18:06 HKT):** Mass merge landed on `main` tip `2fec7d3`. Product slices #336–#360 (systems / SEO / long-talk / talk-sense / motion / poke / chat UX) are **Done**. Remaining open product work is docs #353. Prefer [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) for the live board.

## Remaining merge

1. **#353** — status docs refresh (post-mass-merge board) → merge when CI green.
2. **Pages eyeball** after deploy — https://monmonmars.github.io/amoji-app/setup
3. **Hold / stale** — do not touch #1 / #20 / #154 / #240 unless Pixel asks.

### Historical mass merge (already on `main` — archaeology)

1. **Fonts / systems finish** — `#336` · `#354` payment · `#355` support email · `#356` security/legal/storage  
2. **SEO / long-talk / talk-sense** — `#357` · `#359` · `#360`  
3. **Chat UX** — `#338` → `#339` news · `#340` card greets  
4. **Music / dance / motion** — `#342` Silent Night · `#343` dance legs → `#344` content-motion  
5. **Poke** — `#345` lean → `#348` CMA SFX → `#358` Want/Skip select  
6. **Leftover splits** — `#350` LangChips · `#351` arm ROM · `#352` longer gate  
7. **Mega / leftover cleanup** — `#337` and `#347` closed (superseded by slices)

### Earlier historical stack (already merged)

- #285 setup · #292 audio gate · #291 history · #301/#302 entry · #297–#300 polish · #320 crisis/rules · #327 lighting · #329–#335 Pixel NEW / systems v1

## Before each merge

- [ ] PR `mergeable_state` is `clean` (not behind `main`)
- [ ] `build` check-run conclusion is `success`
- [ ] No accidental cross-PR leakage

## After merges land

1. Confirm Pages deploy on `main` (`pages.yml`).
2. Live verify: https://monmonmars.github.io/amoji-app/setup → select → gate → chat (no auto weather / no history-resume ask).
3. Spot-check poke lean + SFX Want/Skip, news without fishing asks, story/science longer replies, Settings systems/payment when env present.
4. Refresh [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) + `project-status.html` timestamps (Asia/Hong_Kong).

## Do not

- Scrape commercial streaming platforms for music — see [`MUSIC_STREAMING.md`](./MUSIC_STREAMING.md).
- Commit product strategy / investor docs (see `docs/README.md`).
- Touch Hold PRs #1 / #20 / #154 / #240 unless Pixel asks.
- Invent new product scope when Outstanding code is empty.
