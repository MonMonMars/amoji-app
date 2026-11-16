# Owner request log (repo index)

**Full chronological log (all asks):** `/cursor/stores/self/OWNER_REQUEST_LOG.md` — agents **must** append there the same turn.

**This file:** standing rules and library pointers in git so contributors and CI see them without the agent store.

**Last updated:** 2026-11-16 (UTC)

---

## Standing rules (from owner — do not regress)

1. **Log every owner message** the same turn in `/cursor/stores/self/OWNER_REQUEST_LOG.md`. Overlapping messages count.
2. Refresh **`docs/USER_PRODUCT_BIBLE.md` Done / Outstanding** the same turn when product rules or ship status change.
3. **Merged ≠ Done** on live Pages until owner phone-smoke OK (see `docs/PHONE_SMOKE.md`).
4. Do **not** mark R10–R13, card voice, or news **Done** without owner hearing/seeing on device.
5. **Consult resource libraries before swapping defaults:**
   - [`docs/OWNER_RESOURCE_LIBRARY.md`](docs/OWNER_RESOURCE_LIBRARY.md)
   - [`docs/owner-resource-manifest.json`](docs/owner-resource-manifest.json) · `apps/web/lib/owner-resource-manifest.ts`
   - [`docs/SFX_WANT_LIST.md`](docs/SFX_WANT_LIST.md) (poke Want #1–23)
   - [`docs/MISTAKE_LIBRARY.md`](docs/MISTAKE_LIBRARY.md) (known regressions / churn)
   - [`docs/DATA_ORGANIZATION.md`](docs/DATA_ORGANIZATION.md) (prefs v6, storage keys)
6. **No insurance robot card clips**; **no OS `speechSynthesis` as primary** for card greet.
7. **No new destructive SFX deletes** without a new owner Want/archive/delete map.
8. **No idle storage key version bump** without owner OK + migration (`amoji.idle*.v6` frozen).
9. Image / pupil loop: prompt → generate → show → one question; no busy tests unless asked.
10. Push + merge when CI green (owner policy); honesty over claiming fixed.

---

## This pack (2026-11-16)

| Ask | Deliverable |
|-----|-------------|
| Organize data + free resource + mistake record | `OWNER_RESOURCE_LIBRARY.md`, `MISTAKE_LIBRARY.md`, `DATA_ORGANIZATION.md`, manifest TS/JSON |
| Fix card voice still silent | Cherry-picked `e7e20f55` → **`main` `07dd76e3`** |
| Coordinate Master free resources library | Extended existing `OWNER_RESOURCE_LIBRARY.md` + manifest (no duplicate catalogs) |

---

## Quick outstanding (see bible + store for full board)

Card greet audible · all langs/genders voice · idle R11 · owner picks · poke lean · news freshness · pitch tiers · lighting · captions — **phone smoke required**.

**`main` tip (after card-voice merge):** `07dd76e3`