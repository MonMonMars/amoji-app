# Amoji Asset Manifest

Every binary in this directory must have an entry. CI fails on unmanifested files.

| File | License | Source | Notes |
|---|---|---|---|
| juno.vrm | Kizuna AI "Kamatte" official VRM sample (Kizuna AI Inc. developer distribution; review usage guidelines before public/App Store release) | Copied from prior repo's curated legal roster: `_incoming/agent3/prototypes/assets/companion-kizuna.vrm` (md5 `bfc42acdf7f29752359e1c6edbed25b8`, byte-identical to `kizuna-kamatte.vrm`) | Default companion avatar "Juno". VRM 1.0, full emotional preset set (happy/angry/sad/surprised/relaxed). Replaces the initially selected "Mister" community model, which had no emotional blend shapes and was VRM 0.x (unsupported by @pixiv/three-vrm v3). Ships in closed/local builds only — NOT committed to the public repo; public builds load seed-san.vrm instead. |
| seed-san.vrm | VRM Public License 1.0 (https://vrm.dev/en/licenses/1.0/index) — "Seed-san" model by VirtualCast, Inc.; credit notation required | Official VRM 1.0 conformance sample: https://github.com/vrm-c/vrm-specification/tree/master/samples/Seed-san | Licensed fallback avatar for open-source and GitHub Pages builds. VRM 1.0 with full emotional + viseme preset set. Credit: Seed-san model by VirtualCast, Inc. |

## Superseded candidates (not shipped)

| File | Why rejected |
|---|---|
| companion-juno.vrm ("Mister", arweave `elvlpN6jefoDXqqCWMxCBVZnl6Z2lLD7-wC8N5z1bVk`) | Only lip-sync/blink blend shapes — no emotional expression; VRM 0.x (unsupported by three-vrm v3). md5 `c3eaaa37f869df12e79a3ab923db900f`. |

## Companion art (r2026-10-03.01) — outside this directory, not covered by the CI manifest check

| Directory | License | Source | Notes |
|---|---|---|---|
| `apps/web/public/portraits/*.jpg` (15 files) | AI-generated original artwork (Amoji project) | Generated in-project via the image-generation gateway; character designs are original anime archetypes, not official game/anime IP | Selection-thumbnail + status-plate portraits for the 15-character cast. |
| `apps/web/public/backgrounds/*.jpg` (12 files) | AI-generated original artwork (Amoji project) | Same as above; Shinkai-inspired original scenic paintings | Painted anime backdrops for all 12 scenes; gradient fallbacks remain in `prefs.ts`. |
