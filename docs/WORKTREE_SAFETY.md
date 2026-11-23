# Worktree safety (amoji-app)

**Why this file exists:** on 2026-11-23 the primary checkout was found with 29 tracked files
deleted from disk: everything under `packages/emotion-core/` (19) and `packages/vrm-renderer/`
(10). The cause was not a bad `git checkout` and not (mostly) `pnpm`. It was a
`git worktree remove` that followed a junctioned `node_modules` out of the worktree being
deleted and into the primary checkout.

Rule of thumb: **a `node_modules` directory in this repo is never safe to share between
worktrees.** Sharing it is what made one teardown command destroy another checkout.

---

## 1. The mechanism (verified, not guessed)

pnpm links workspace packages with **junctions** on Windows, not copies and not plain
symlinks. In the primary, these links existed:

```
apps/web/node_modules/@amoji/emotion-core  -> packages/emotion-core
apps/web/node_modules/@amoji/vrm-renderer  -> packages/vrm-renderer
```

A worktree that "shares" the primary install has one more junction:

```
<worktree>/apps/web/node_modules  ->  <primary>/apps/web/node_modules
```

Windows recursive deletes follow junctions. So `git worktree remove <worktree>` walked:

```
<worktree>/apps/web/node_modules           (junction)
  -> <primary>/apps/web/node_modules       (real directory: contents deleted)
     -> @amoji/emotion-core                (junction)
        -> packages/emotion-core           (tracked sources DELETED)
     -> @amoji/vrm-renderer                (junction)
        -> packages/vrm-renderer           (tracked sources DELETED)
```

Nothing under `packages/engine` or `packages/robot-face` was touched, because `apps/web`
depends only on the other two packages. That exact boundary is the fingerprint.

### Evidence from the incident

| Time (HKT, 2026-11-23) | Evidence |
|---|---|
| 08:52:37 | `git worktree remove "D:\AI app development\amoji-app-merge-wt"` was run from the primary. It failed with `error: failed to delete ...: Directory not empty`. |
| 08:52:37 | The same command then ran `git checkout main`, which reported the carried-over `D` lines for `packages/vrm-renderer/...`. The deletions already existed by the time checkout printed. |
| after | `amoji-app-merge-wt` still exists on disk with only `packages/`, `scripts/`, `server/`, `tools/`, a few root files, and one surviving `node_modules` junction. `apps/` is gone, and `apps/web/node_modules` is exactly the directory git walked first. Deletion stopped when it hit the root `node_modules` junction. |
| after | Primary `apps/web/node_modules` contained a single entry, `.vite` (everything else deleted through the junction). Primary root `node_modules` lost `typescript` and every top-level link except the `eslint*` group; `.pnpm` survived with 590 entries. |
| after | `packages/emotion-core/node_modules` and `packages/vrm-renderer/node_modules` were gone, while `packages/engine/node_modules` and `packages/robot-face/node_modules` survived: consistent with the two `@amoji` link targets being emptied. |

**Later repair note (2026-11-23):** the table above records what was visible when
the remove first failed, but the damage was wider. When the primary was repaired,
`apps/web/node_modules` was still empty and the root `.pnpm` package directories
had also been emptied through the same junction chain. Both were reinstalled
from the local pnpm store, and the 29 tracked files under
`packages/emotion-core/` and `packages/vrm-renderer/` were restored.

### Reproduction (done in `%TEMP%`, never against the repo)

Scratch repo: `packages/foo/src/a.ts` tracked, `apps/web/node_modules/@amoji/foo` junction to
`packages/foo`, a worktree with `apps/web/node_modules` junctioned to the primary's. Then
`git worktree remove <worktree>` (no `--force`, worktree is clean because `node_modules` is
gitignored):

```
A BEFORE a.ts tracked source exists: True
A AFTER  a.ts tracked source exists: False
A AFTER  packages\foo exists: True          <- directory left behind, files gone
A git status:  D packages/foo/src/a.ts
```

By contrast, PowerShell `Remove-Item -Recurse -Force` on the same worktree did **not** delete
`a.ts` in that test. Do not rely on that: treat every recursive delete as unsafe.

---

## 2. Was the pnpm theory right?

Partly, and it is a separate real hazard, but it is not what deleted the 29 files.

Reproduced in `%TEMP%` with two tiny pnpm workspaces (`A` = "primary", `B` = "worktree"
whose `apps/web/node_modules` was junctioned to `A`'s):

```
A before B install:  @amoji/emotion-core -> A\packages\emotion-core
A after  B install:  @amoji/emotion-core -> B\packages\emotion-core
```

So `pnpm install` run from a worktree **does** rewrite the shared tree: links are re-pointed
at the calling worktree. Consequences:

- the primary's `@amoji/*` links silently resolve to another worktree's sources;
- deleting that worktree leaves dangling junctions in the primary;
- when pnpm rewrites a link it replaces the junction, which is why a link can appear
  "absent" afterwards.

It did **not** prune an existing link whose package was dropped from the calling worktree in
this test (pnpm reported `Already up to date`), and it never touches `packages/**` sources.
So: pnpm-through-junction explains a missing or mis-pointed `@amoji` link, not deleted
tracked files.

Note: `apps/web/tsconfig.json` maps `@amoji/emotion-core` to
`../../packages/emotion-core/src/index.ts` and includes those `src` directories, so a missing
`node_modules` link does not break `npm run typecheck` (verified with the link renamed away).
It does break `next build`/`next dev`.

---

## 3. Rules

1. **Never junction `node_modules` between checkouts of this repo.** Its only benefit is a
   faster start, and its cost is this incident.
2. A worktree gets its own install:
   ```
   git worktree add "D:\AI app development\amoji-app-<topic>-wt" -b cursor/<topic>-0340-0eac main
   cd "D:\AI app development\amoji-app-<topic>-wt\apps\web"
   pnpm install --offline --frozen-lockfile
   ```
   The shared pnpm store makes this cheap (about 70 seconds here); `--offline` avoids network
   surprises.
3. If a worktree already has junctioned `node_modules` (older worktrees do), remove **every**
   junction before deleting anything:
   ```
   cd <worktree>
   cmd /c rmdir node_modules
   cmd /c rmdir apps\web\node_modules
   cmd /c rmdir packages\emotion-core\node_modules   # if present
   cmd /c rmdir packages\vrm-renderer\node_modules   # if present
   cmd /c rmdir packages\engine\node_modules         # if present
   cmd /c rmdir packages\robot-face\node_modules     # if present
   cd "D:\AI app development\amoji-app"
   git worktree remove <worktree>
   ```
   `cmd /c rmdir` on a junction removes the link only. It never recurses.
4. Never run `git clean -dfx`, `git worktree remove`, or a recursive directory delete on a
   checkout that contains a junction into another checkout. Re-run the guard below first.
5. Run the guard before a build or test when a checkout looks odd, and always after a
   teardown:
   ```
   node scripts/check-repo-hygiene.mjs           # fail on missing packages/ files, warn on junctions
   node scripts/check-repo-hygiene.mjs --strict  # also fail on junctions and other tracked deletions
   ```
   It is also wired into `apps/web` `predev` and `pretest`, and into CI.

---

## 4. Detecting the topology by hand

```powershell
# link type of the install in one checkout
Get-Item "apps\web\node_modules" -Force | Select-Object LinkType, Target

# every worktree's apps/web install, one line each
git worktree list --porcelain | Select-String "^worktree " | ForEach-Object {
  $p = ($_ -split ' ', 2)[1] + "\apps\web\node_modules"
  if (Test-Path $p) { $i = Get-Item $p -Force; "{0} | {1} | {2}" -f $p, $i.LinkType, ($i.Target -join ',') }
}
```

Topology as of 2026-11-23 11:30 HKT (10 of 15 worktrees shared the primary's install):

| worktree | `apps/web/node_modules` | notes |
|---|---|---|
| `amoji-app` (primary) | real directory | gutted by the incident until reinstalled |
| `amoji-app-cards-poke-wt` | junction to primary | in use by cards/poke lane |
| `amoji-app-voice-alllangs-wt` | junction to primary | in use by voice lane |
| `amoji-app-sing-wt` | junction to primary | in use by sing/dance lane |
| `amoji-app-merge2-wt` | junction to primary | in use by merge train |
| `amoji-app-lighting-wt` | junction to primary | idle lane |
| `amoji-app-wt-en-sidecars` | junction to primary | idle lane |
| `amoji-app-wt-sfx-polish` | junction to primary | idle lane |
| `amoji-idle-fix` | junction to primary | idle lane |
| `amoji-llm-tts-wt` | junction to primary | idle lane |
| `amoji-offtopic-wt` | junction to primary | idle lane |
| `amoji-app-hipstest-wt` | real directory | own offline install |
| `_wt-byok` | real directory | own install |
| `amoji-app-cleanup-wt` | none | finished, node_modules removed |
| `amoji-app-greet-wt` | none | finished, node_modules removed |

A junctioned worktree is not itself broken; it becomes a weapon only when something
recursively deletes it, or when `pnpm install` runs inside it. Break junctions only when the
worktree is idle, and break them with `cmd /c rmdir`, never by deleting the directory.

---

## 5. Still dangerous about this setup

- **Ten worktrees physically share one install with the primary.** Any `pnpm install` in one
  of them rewrites the primary's links; any recursive delete of one of them deletes the
  primary's files. Until they are converted to own installs, they are all one command away
  from the same damage.
- **The primary's install is currently gutted** (`apps/web/node_modules` has only `.vite`,
  root `node_modules` lost `typescript`). Reinstalling it in place repairs it for the primary
  but also rewrites the ten shared trees, so it must be sequenced with the agents using them.
- **`git worktree remove` is not the only risk.** `git clean -dfx` and IDE "delete folder"
  actions recurse the same way. The guard catches the damage, not the cause.
- **A worktree checked out on a branch does not protect its `packages/` sources**, because the
  junction chain points at whichever checkout owns the install, not at the branch being
  worked on.
- **`amoji-app-merge-wt` is a ghost.** It was dropped from `git worktree list` by the failed
  remove but still exists on disk with its root `node_modules` junction intact. Deleting that
  directory recursively would repeat the damage: `cmd /c rmdir` its junction first.
