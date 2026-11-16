# Cloud / Cursor agents (amoji-app)

**Live:** https://monmonmars.github.io/amoji-app/  
**Owner rule:** **Merged ≠ Done** until `docs/PHONE_SMOKE.md` on a real phone.

## Before coding

1. Read `docs/USER_PRODUCT_BIBLE.md` and `docs/OWNER_RESOURCE_LIBRARY.md`.
2. Run `cd apps/web && npm run verify:live` — must match `APP_REVISION`.
3. Read `docs/AGENT_SMOKE.md` — delivery layer **#458–#462** is complete; **do not** re-ship SW/voice churn without owner failure rows.

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