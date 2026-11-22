# Amoji handoff — 2026-11-21 (folded into repo)

> **This is a repo copy, not the only copy.** Source: `D:\GrokBot_Files\AGENT_HANDOFF_2026-11-21\amoji\` (pack written 2026-11-21 ~15:15 HKT by GrokBot for the Momoto token-save handoff). Provenance and the `copies/` policy: [`PROVENANCE.md`](./PROVENANCE.md). State detail: [`STATE.md`](./STATE.md).
>
> The pack's `copies/` were snapshots of `origin/main` at `99896449` and are already in-tree; only `README.md` + `STATE.md` are mirrored here (`convert-summary.json` lives outside git under `D:\Blender\...\c14-18-planted\`).

## Binding constraints (2026-11-21 pack, re-recorded 2026-11-22 HKT)

- **Do not merge:** #536, #537, #533, #524. #544 is closed unmerged (superseded by #549–#551).
- **HOLDs:** NanoBanana, PSX, BreathCalm, CMA00350–431 Want/Skip, head/body swap. Kokoro / Piper / Cosy remain **not bundled** — Cosy / JyutVoice are listing-only, skip NC. No Higgsfield unless Mon says go.
- **No Cursor Flash / pool Flash / Cloud** without explicit go. Path B = desktop DeepSeek Flash via OpenRouter.
- **CMA range:** repo truth is `docs/owner-resource-manifest.json` → `cmaWant` = 10 ids (350, 351, 354, 359, 360, 363, 364, 365, 366, 318). The “–431” upper bound in the pack is GrokBot's **external gallery range**, not repo truth.
- **Open question for Pixel:** on the first screen after an **r280** hard refresh, do C14 / C15 / C16 / C18 look **planted or floating**? Fallback is Rocketbox (`D:\Blender\...\animations\idle\rocketbox\`, 25 FBX) but it needs a real Cxx ↔ filename map first — files are `f_/m_idle_{breathe,neutral}_0N.max.fbx`. Next stamp would be `r2026-11-19.281`. **Never ship C186 / C187 / C188 / C191.**

---

# Amoji final snapshot — 2026-11-21 ~15:15 HKT

Written by Amoji for the Momoto token-save handoff. This is a state pack, not a full repo clone.

## What’s in this pack

- `README.md` — this inventory and what’s still outstanding
- `STATE.md` — live revision, main SHA, landed train, HOLDs, open PRs, paths
- `copies/` — key docs taken from `origin/main` at the live SHA (revision, owner 採用, idle maps, asset manifest, plant convert-summary if present)

## Sources of truth (do not replace these)

- GitHub: https://github.com/MonMonMars/amoji-app
- `origin/main`: `9989644984de77acf1a0c4c71c0a13bcbb4df9b6` — `feat(idle): plant Mixamo C14/C15/C16/C18 VRMAs (r280) (#556)`
- Local checkout: `D:\AI app development\amoji-app` (library dump `D:\AI app development\Amoji` is not the git repo)
- Live app: https://monmonmars.github.io/amoji-app/
- Live revision: https://monmonmars.github.io/amoji-app/revision.txt — **r2026-11-19.280**
- Pages last-modified: Sat, 21 Nov 2026 06:34:02 GMT / **14:34 HKT**; `sw.js` CACHE `amoji-r2026-11-19.280`
- Library hub: `D:\GrokBot_Files\libraries\index.html`
- Mixamo planted VRMAs: `D:\Blender\projects\mon-character\free-library\vrma-out\c14-18-planted\`
- Rocketbox backups (not shipped): `D:\Blender\projects\mon-character\free-library\animations\idle\rocketbox\`

## Outstanding

1. **Waiting on Pixel** after a first-screen hard-refresh of r280: are Mixamo C14/C15/C16/C18 feet planted or still floating on the character? If they still float, fall back to Rocketbox (C170–C177 first, then C178–C185, C189, C190, C192, C193). Do not ship C186/C187/C188/C191 as keepers. Do not wire other Mixamo float-feet (C10, C17, C19–C24, C26–C35). Next stamp would be r2026-11-19.281. Do not tell Pixel to refresh again until a new revision is actually live.
2. **Pack copies still pending:** `/workspace/_xfer/amoji-music-sing.tar.gz` (70M) and `/workspace/_xfer/amoji-music-songbed-1.tar.gz` (76M). CopyFromBox to D: has been failing. Already landed: leftovers zip+INDEX on `D:\Download`; dance, song-bed part 2, docs shortlists, OSS round2 under `D:\GrokBot_Files`.
3. **CMA00350–431** still wait Mon Want/Skip.
4. **Char 17 portrait remake** — do not start until Mon says. Reminder routine remains enabled (last ran 2026-11-20 09:55 HKT).
5. **Do not merge** #536, #537, #533, #524 unless still needed. #544 already closed unmerged (superseded by #549–#551).
6. Runtime / bundling **HOLDs** unchanged: NanoBanana, PSX, BreathCalm, CMA00350–431 Want/Skip, head/body swap. Kokoro / Piper / Cosy remain not bundled (Cosy / JyutVoice listing-only, skip NC). No Higgsfield unless Mon says go. No Cursor Flash / pool Flash / Cloud without explicit go. Path B = desktop DeepSeek Flash via OpenRouter (`OPENROUTER_API_KEY`); Pro only seldom for debug.

## Token lock (Mon 2026-11-21 ~11:45–11:49 HKT)

Save tokens. Minimize Grok Bot weekly usage and wakes. Prefer DeepSeek / Cursor DESKTOP Path B.
