# cast/

Retired local anime-cast VRM binaries. Everything here is **CC0 only** —
verified by reading the embedded VRM licence metadata in each file, not from a
README.

The app's live cast is `../want/<id>.vrm` (`apps/web/lib/want-roster.json`).
These files are kept only for the face-lab / local demos.

Purging history (2026-11-08): 16 binaries were deleted for licensing reasons —
`kitagawa` (copyrighted anime character, corporate commercial disallowed,
redistribution disallowed), `kizuna` (Kizuna AI official, non-profit only, no
redistribution), `hana` / `nana` (`licenseName=Redistribution_Prohibited`),
`alicia` (Dwango Alicia Solid, separate terms), `atlas` / `vroid-male` / `zane`
(unprovable provenance, author "jin"), `mei` / `elio` / `avatarsample-a`
(VRoidPreset originals, no licence URL), and `ember` / `kai` / `nova` / `rex` /
`sky` (CC-BY, attribution required and the app has no way to satisfy it for a
retired demo mesh). See `../ASSET_MANIFEST.md` for the per-file licence column.

`.gitignore` now blocks `apps/web/public/models/cast/*.vrm`, so a non-CC0 model
cannot be re-committed here by accident. Removing that line needs a licence
audit first.

Do NOT commit `marin.vrm` under any name or subdirectory (copyright ban,
CI-enforced).
