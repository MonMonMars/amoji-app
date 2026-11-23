# Docs in this repository

Technical notes for assets, models, robot face, chat UX, audio, and merge process live here.

**Project status board (done vs outstanding + docs audit):**

- Browser board: [GitHub Pages](https://monmonmars.github.io/amoji-app/docs/project-status.html) · repo [`project-status.html`](./project-status.html)
- Markdown twin: [`PROJECT_STATUS.md`](./PROJECT_STATUS.md)
- Owner picker (Pages): https://monmonmars.github.io/amoji-app/docs/owner-resources.html — copied from repo `docs/` on each Pages deploy (`store-bundle.mjs` postbuild)

**Handoff packs (state + binding constraints — read the newest):**

- [`HANDOFF_2026-11-21/`](./HANDOFF_2026-11-21/README.md) — historical snapshot (`r2026-11-19.280` / `99896449`) · [`STATE.md`](./HANDOFF_2026-11-21/STATE.md) · [`PROVENANCE.md`](./HANDOFF_2026-11-21/PROVENANCE.md)
- [`HANDOFF_2026-11-19/README_HANDOFF.md`](./HANDOFF_2026-11-19/README_HANDOFF.md) — **frozen historical snapshot**

**Owner product bible (rules + done/outstanding — update same day):**

- [`USER_PRODUCT_BIBLE.md`](./USER_PRODUCT_BIBLE.md)

**Owner free-resource library (consult before swapping idle/SFX/voice/music defaults):**

- [`OWNER_RESOURCE_LIBRARY.md`](./OWNER_RESOURCE_LIBRARY.md) · `apps/web/lib/owner-resource-manifest.ts` · JSON [`owner-resource-manifest.json`](./owner-resource-manifest.json)
- [`MISTAKE_LIBRARY.md`](./MISTAKE_LIBRARY.md) · [`DATA_ORGANIZATION.md`](./DATA_ORGANIZATION.md)
- [`../OWNER_REQUEST_LOG.md`](../OWNER_REQUEST_LOG.md) — standing rules (full log in agent store)

**Product / contributor notes:**

| Doc | Topic |
| --- | --- |
| [`ASSETS.md`](./ASSETS.md) | Asset / license pipeline |
| [`OSS_SCOUT.md`](./OSS_SCOUT.md) | Open-source candidates — WANT / WATCH / SKIP with licences (research only) |
| [`MODELS.md`](./MODELS.md) | Model shortlist |
| [`ROBOT-FACE.md`](./ROBOT-FACE.md) | Robot face integration |
| [`PRIVACY_MEMORY.md`](./PRIVACY_MEMORY.md) | Memory UX + recall rules |
| [`CHAT_ENTRY_FLOW.md`](./CHAT_ENTRY_FLOW.md) | Enter-chat talking order |
| [`TTS_PIPELINE.md`](./TTS_PIPELINE.md) | Voice / TTS chain |
| [`VOICE_CHAT_LIFECYCLE.md`](./VOICE_CHAT_LIFECYCLE.md) | Interrupt, overlap, new-topic plan |
| [`CAST_LIGHTING.md`](./CAST_LIGHTING.md) | Per-character lighting allowlist |
| [`SETUP_ONBOARDING.md`](./SETUP_ONBOARDING.md) | Setup → gate → select → chat |
| [`MERGE_CHECKLIST.md`](./MERGE_CHECKLIST.md) | Recommended PR merge order |
| [`MUSIC_STREAMING.md`](./MUSIC_STREAMING.md) | Legal streaming stub policy |
| [`SYSTEMS.md`](./SYSTEMS.md) | Settings, payments, email, security, free hosts, storage, legal map |

Root [`AMOJI_JOB_CHECKLIST.md`](../AMOJI_JOB_CHECKLIST.md) tracks voice/job verification.

Product strategy, competitive analysis, monetization, and investor-facing material are maintained **off-repo** on private local storage only—not in this public GitHub repository. Do not add `docs/strategy/` or similar business documents to git.
