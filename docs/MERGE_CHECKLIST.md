# Contributor merge checklist

For Pixel / maintainers merging the current Amoji stack into `main`. Agents cannot merge without GitHub write auth.

## Recommended order (CI green → merge)

1. **#285** — one-page setup / legal scroll / single START  
2. **#292** — pre-chat audio gate  
3. **#291** — selectable chat history  
4. **#301** — reply quality + privacy (**must** before #302)  
5. **#302** — chat entry flow (rebase onto main after #301; resolve memory/privacy conflicts)

### Polish (any time after conflicting chat files settle)

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
