# Cloud / Cursor agents (amoji-app)

**Live:** https://monmonmars.github.io/amoji-app/  
**Owner rule:** **Merged ≠ Done** until `docs/PHONE_SMOKE.md` on a real phone.

## Before coding

1. Read `docs/USER_PRODUCT_BIBLE.md` and `docs/OWNER_RESOURCE_LIBRARY.md`.
2. Run `cd apps/web && npm run verify:live` — must match `APP_REVISION`.
3. Read `docs/AGENT_SMOKE.md` — delivery layer **#458–#462** is complete; **do not** re-ship SW/voice churn without owner failure rows. Before claiming a Pixel repeat is fixed, run the **Pixel no-repeat checklist** in `docs/AGENT_SMOKE.md` (`pixel-no-repeat.test.ts`).

## When owner says “nothing fixed” / “continue”

1. Confirm live revision (`verify:live`) and ask if they see amber **Refresh** (stale bundle).
2. **Freeze** broad product changes until they report `ROW: … DEVICE: …` from `PHONE_SMOKE.md`.
3. One surgical fix per reported row — see `docs/PHASE_B_MAP.md`.

## Tests

```bash
cd apps/web && npm test -- --run
```

## Branches

Use `cursor/<topic>-0340-0eac`. Bump `APP_REVISION` + `public/sw.js` `CACHE` + `public/revision.txt` when shipping user-facing web fixes.

## Worktrees (read before creating, using, or deleting one)

- **Never junction `node_modules` between checkouts of this repo.** On 2026-11-23 a `git worktree remove` followed a junctioned `apps/web/node_modules` into the primary and deleted all 29 tracked files of `packages/emotion-core` + `packages/vrm-renderer`. Mechanism and evidence: [`docs/WORKTREE_SAFETY.md`](docs/WORKTREE_SAFETY.md).
- Each worktree gets its own install (`pnpm install --offline --frozen-lockfile` in `apps/web`; the shared store makes it cheap). If a worktree already has a junction, `cmd /c rmdir` every junction **before** `git worktree remove`, `git clean`, or any recursive delete.
- Guard: `node scripts/check-repo-hygiene.mjs` fails when tracked `packages/` files are missing and warns about junctioned `node_modules`. It also runs in `apps/web` `predev`/`pretest` and in CI. Use `--strict` for a hard junction check.