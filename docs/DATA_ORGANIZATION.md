# Data organization (prefs, storage, revisions, artifacts)

**Purpose:** Where owner-facing prefs and agent artifacts live so parallel agents do not fork keys or wipe owner picks.

**Related:** [`OWNER_RESOURCE_LIBRARY.md`](./OWNER_RESOURCE_LIBRARY.md) · [`../OWNER_REQUEST_LOG.md`](../OWNER_REQUEST_LOG.md) · `apps/web/lib/client-storage.ts`

---

## Product prefs (server-less)

| Area | Module | Notes |
|------|--------|-------|
| Language, scene, companion, volumes | `apps/web/lib/prefs.ts` | Writes `amoji.prefs.v1` |
| Want cast roster | `characters-want.ts` ← `want-roster.json` | Release `free-library-want-2026-10-12` |
| Idle rail SoT | `idle-curated-rail.ts` | 39 curated buttons → `clipId` |
| Idle full library | `idle-library.ts` | Numbered gallery + playable flags |
| CMA poke Want map | `cma-reaction-gallery.ts` | Must match [`SFX_WANT_LIST.md`](./SFX_WANT_LIST.md) |
| Voice / TTS UI | `voice-catalog.ts`, `voice-capability.ts` | Shipping speakers only |

---

## localStorage / sessionStorage (v6 idle — do not bump without owner OK)

SoT: `CLIENT_STORAGE_KEYS` in `apps/web/lib/client-storage.ts` (also `docs/SYSTEMS.md`).

| Key | Purpose |
|-----|---------|
| `amoji.prefs.v1` | Core product prefs |
| `amoji.idleEnabled.v6` | Curated rail enable set (migrates owner picks) |
| `amoji.idlePick.v6` | Per-character idle clip override |
| `amoji.cmaReactionSfx.picks.v1` | CMA gallery Want/Skip (seeded from Want codes) |
| `amoji.ownerPerfPicks.v1` | Listen MV codes + sing audio clip ids (repo ship-set in `apps/web/data/owner-perf-selection.json`) |
| `amoji.voice.v1` / `amoji.neural.v1` / `amoji.mute.v1` | Voice mute + neural preference |
| `amoji.history.v1` | Chat transcript |
| `amoji.memory.v2` | Long-term memory |
| `amoji.entryGate.v1` | Gate progress |

**Rule:** Do not introduce `amoji.idle*.v7` without migration in `idle-owner-migrate.ts` and owner sign-off.

Dynamic prefixes: `amoji.thumb.*`, `amoji.brain.key.*` — see `CLIENT_STORAGE_PREFIXES`.

---

## App revision

| Field | Location |
|-------|----------|
| `APP_REVISION` | `apps/web/lib/revision.ts` |
| Idle v6 freeze | Tests `owner-picks-win.test.ts`, `idle-pick.test.ts` |

---

## Machine-readable resource index

| Artifact | Path |
|----------|------|
| TypeScript SoT | `apps/web/lib/owner-resource-manifest.ts` |
| JSON export | `docs/owner-resource-manifest.json` |
| Regenerate | `node scripts/generate-owner-resource-manifest.mjs` |

---

## Agent artifacts (not in git)

| Path | Content |
|------|---------|
| `/opt/cursor/artifacts/` | Walkthrough screenshots, PR payloads, mirrored library docs |
| `/cursor/stores/self/OWNER_REQUEST_LOG.md` | Full owner ask history |
| Mirrors | `owner-resource-library.md`, `mistake-library.md`, `data-organization.md` |

---

## Consult before changing defaults

1. [`OWNER_RESOURCE_LIBRARY.md`](./OWNER_RESOURCE_LIBRARY.md)
2. [`docs/owner-resource-manifest.json`](./owner-resource-manifest.json)
3. [`SFX_WANT_LIST.md`](./SFX_WANT_LIST.md)
4. [`MISTAKE_LIBRARY.md`](./MISTAKE_LIBRARY.md)