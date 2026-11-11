# Contributor merge checklist

For Pixel / maintainers merging the current Amoji stack into `main`. Agents cannot merge without GitHub write auth.

> **Note (2026-11-11):** Historical #285→#302 / #297–#300 and Pixel NEW #320 / #327 / #329–#335 are **already on `main`**. Open work is CI-green slice PRs (#336–#359). Prefer [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) for the live board.

## Pixel merge order (CI green → merge)

1. **Fonts / systems finish** — `#336` fonts **or** fonts via `#356` → `#354` payment → `#355` support email → `#356` security/legal/storage  
2. **SEO / long-talk** — `#357` SEO · `#359` story/science/help (independent)  
3. **Chat UX** — `#338` → `#339` news · `#340` card greets  
4. **Music / dance / motion** — `#342` Silent Night · `#343` dance legs → `#344` content-motion  
5. **Poke** — `#345` lean → `#348` CMA SFX → `#358` Want/Skip select  
6. **Leftover splits** — `#350` LangChips · `#351` arm ROM · `#352` longer gate · `#353` status docs  
7. **Mega cleanup (Pixel only)** — after slices land, Pixel may close `#337` / `#347` — **do not close without explicit ask**. `#347` is superseded by `#350`–`#353`.

### Historical stack (already merged — archaeology)

1. **#285** — one-page setup / legal scroll / single START  
2. **#292** — pre-chat audio gate  
3. **#291** — selectable chat history  
4. **#301** — reply quality + privacy (**must** before #302)  
5. **#302** — chat entry flow  

### Polish (historical; mostly landed)

- #297 hide poke · #298 HelloWave bye-only · #299 lighting · #300 mood orb · #283 select back · #320 crisis/rules · #327 lighting · #329–#335 Pixel NEW / systems v1

## Before each merge

- [ ] PR `mergeable_state` is `clean` (not behind `main`)
- [ ] `build` check-run conclusion is `success`
- [ ] No accidental cross-PR leakage
- [ ] Stacked PRs (#339/#340 on #338; #344 on #343; #348 on #345; #358 on #348) merge bottom-up
- [ ] Prefer slices over mega #337 when both cover the same change

## After merges land

1. Confirm Pages deploy on `main` (`pages.yml`).
2. Live verify: https://monmonmars.github.io/amoji-app/setup → select → gate → chat (no auto weather / no history-resume ask).
3. Spot-check poke lean + SFX Want/Skip, news without fishing asks, story/science longer replies, Settings systems/payment when env present.
4. Refresh [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) + `project-status.html` timestamps (Asia/Hong_Kong).

## Do not

- Scrape commercial streaming platforms for music — see [`MUSIC_STREAMING.md`](./MUSIC_STREAMING.md).
- Commit product strategy / investor docs (see `docs/README.md`).
- Close #337 or #347 without Pixel saying so.
- Treat open green PRs as shipped until they are on `main`.
