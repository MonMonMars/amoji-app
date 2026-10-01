# Amoji Asset Manifest

Every binary in this directory must have an entry. CI fails on unmanifested files.

| File | License | Source | Notes |
|---|---|---|---|
| juno.vrm | Kizuna AI "Kamatte" official VRM sample (Kizuna AI Inc. developer distribution; review usage guidelines before public/App Store release) | Copied from prior repo's curated legal roster: `_incoming/agent3/prototypes/assets/companion-kizuna.vrm` (md5 `bfc42acdf7f29752359e1c6edbed25b8`, byte-identical to `kizuna-kamatte.vrm`) | Default companion avatar "Juno". VRM 1.0, full emotional preset set (happy/angry/sad/surprised/relaxed). Replaces the initially selected "Mister" community model, which had no emotional blend shapes and was VRM 0.x (unsupported by @pixiv/three-vrm v3). |

## Superseded candidates (not shipped)

| File | Why rejected |
|---|---|
| companion-juno.vrm ("Mister", arweave `elvlpN6jefoDXqqCWMxCBVZnl6Z2lLD7-wC8N5z1bVk`) | Only lip-sync/blink blend shapes — no emotional expression; VRM 0.x (unsupported by three-vrm v3). md5 `c3eaaa37f869df12e79a3ab923db900f`. |
