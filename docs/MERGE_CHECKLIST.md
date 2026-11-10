# Contributor merge checklist

For Pixel / maintainers merging the current Amoji stack into `main`. Agents cannot merge without GitHub write auth.

> **Note (2026-11-10):** The historical #285→#302 / #297–#300 stack and Pixel NEW #329–#335 are **already on `main`**. Prefer the open-slice list in [`PROJECT_STATUS.md`](./PROJECT_STATUS.md).

## Recommended order for current open slices (CI green → merge)

1. **#336** fonts (independent) · **#342** Silent Night (independent) · **#343** dance legs (independent)
2. **#338** chat-ux scrub → then **#339** news / **#340** card-greet (both stack on #338)
3. Open + merge **content-motion-wire** stacked on #343
4. Open + merge **poke-body-lean** (base `main`) → then **cma-poke-sfx-pack** stacked on it
5. Leftover Pixel fixes (`cursor/leftover-pixel-fixes-0340-0eac`) after or beside poke/card-greet
6. Close or supersede mega **#337** once slices land

### Historical stack (already merged — keep for archaeology)

1. **#285** — one-page setup / legal scroll / single START  
2. **#292** — pre-chat audio gate  
3. **#291** — selectable chat history  
4. **#301** — reply quality + privacy (**must** before #302)  
5. **#302** — chat entry flow

### Polish (historical; mostly landed)

- #297 hide poke · #298 HelloWave bye-only · #299 lighting · #300 mood orb · #283 select back

## Before each merge

- [ ] PR `mergeable_state` is `clean` (not behind `main`)
- [ ] `build` check-run conclusion is `success`
- [ ] No accidental cross-PR leakage (e.g. selectable-history files on an idle PR)
- [ ] If the PR touches `memory.ts` / `ChatPanel` open phase, skim #301 vs #302 for double greets or privacy flags

## After the stack lands

1. Confirm Pages deploy on `main` (`pages.yml`).
2. Live verify: https://monmonmars.github.io/amoji-app/setup → select → gate → chat open line (no auto weather).
3. Spot-check poke (no history if #297 merged), farewell wave (#298), lighting on cast #1–3 / #13 (#299).
4. Refresh [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) + `project-status.html` timestamps (Asia/Hong_Kong).

## Do not

- Merge #302 before #301.
- Scrape commercial streaming platforms for music — see [`MUSIC_STREAMING.md`](./MUSIC_STREAMING.md).
- Commit product strategy / investor docs (see `docs/README.md`).
