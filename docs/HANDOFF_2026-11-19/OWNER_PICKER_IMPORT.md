# Owner-picker notes → selection JSON

**Merged:** PR **#550** (`scripts/import-owner-picker-selection.mjs`).

## Export (browser)

1. Open [owner-resources](https://monmonmars.github.io/amoji-app/owner-resources.html).
2. Mark rows (採用 / 保留 / 刪除) and notes.
3. **Save notes JSON** → file with `"version": "owner-picker-notes-v2"`.

Sample: [`samples/owner-picker-notes-export-sample.json`](./samples/owner-picker-notes-export-sample.json).

## Import (repo)

From repository root:

```bash
node scripts/import-owner-picker-selection.mjs path/to/export.json
# dry-run:
node scripts/import-owner-picker-selection.mjs path/to/export.json --dry-run
```

Default output: `apps/web/data/owner-picker-selection.json` (`owner-picker-selection-v1`).

After **#543** lands, runtime reads ship-set via `owner-picker-ship-set.ts` / `owner-picker-decisions.ts`; until then import only prepares repo JSON for the next train merge.

## Tests

```bash
pnpm --filter @amoji/web test import-owner-picker-selection
```