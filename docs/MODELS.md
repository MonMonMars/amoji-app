# Character Model Shortlist — license-safe VRM picks

Concrete, checked candidates for giving each Amoji character a real 3D body.
Complements `ASSETS.md` (the rules). Status of every entry was verified
October 2026 against the source pages listed.

**Why not the rigmodels.com list:** those are user-uploaded rips of
copyrighted game characters (FF7, DOA, Resident Evil). Shipping them would
kill the App Store build and void B2B deals. CI already bans them by name.
Everything below is cleared for real redistribution.

## Tier 1 — safe to bundle in the public repo AND App Store builds

| Model | License | Style / slot fit | Source |
|---|---|---|---|
| **AvatarSample_F ("Vita")** | CC0 (pixiv waived all rights) | Anime girl, VRM 1.0, full expressions + spring bones. Best default female companion. | VRoid Hub (pixiv login) — sample model bundled with VRoid Studio; CC0 copies circulate in open repos (e.g. HuggingFace `akamotaco/ppaso-tts-v1` example) |
| **AvatarSample_A / B / C** | VRoid all-permissions (redistribution allow, commercial allow, credit not required) | Three anime girls, distinct looks. Female cast variety. | VRoid Hub — official VRoid Project samples |
| **Seed-san** | VRM Public License 1.0 (redistribute with attribution: "© VirtualCast, Inc.") | Anime girl, PBR+MToon, expressions, look-at, spring bones. Already the repo fallback. | Direct: `https://cdn.jsdelivr.net/gh/vrm-c/vrm-specification@master/samples/Seed-san/vrm/Seed-san.vrm` |
| **100Avatars R1–R3 (Polygonal Mind)** | CC0, no login, permanent Arweave hosting | Stylized low-poly cast (300 total). Great for kid mode + fun characters. Human-ish picks: Olivia, Lydia, Erika, Rose (female); Robert, Mikel, Chad (male). | Registry JSON: `https://raw.githubusercontent.com/ToxSam/open-source-avatars/main/data/avatars/100avatars-r1.json` (also r2, r3) — each entry has `model_file_url` + `thumbnail_url` |
| **Numinia avatars** | CC0, direct raw.githubusercontent download | Small CC0 VRM set (e.g. "Avatar Lyra", starter avatars). | `https://raw.githubusercontent.com/PabloFMM/numinia-digital-goods-data/main/content/avatars/` |

## Tier 2 — personal/local builds OK, NOT for the public repo

| Model | Why tier 2 |
|---|---|
| Alicia Solid (Niconi Solid-chan) | Revocable creator-discretion clause — owner can pull the license if they dislike the project. Fine on a desktop, radioactive in a shipped product. |
| VRoid Hub free models (e.g. Shoujo A / 少女A, CC0) | License itself is CC0, but VRoid Hub ToS governs the download and redistribution is commonly disallowed. Use locally; don't commit. |
| Fred (swampazzo) | "Do whatever" author terms, but Hub download is disabled; BOOTH distribution only. Verify the BOOTH page terms before use. |
| Booth / Gumroad originals | Per-product terms; usually fine in closed builds with receipt kept. Check redistribution before shipping. |

## Tier 3 — build our own (recommended for B2B)

- **VRoid Studio** (free): design original Amoji characters, export VRM, set
  our own license flags. We own the IP, name and face — the cleanest answer
  for robot-vendor licensing. ~An afternoon per character.
- **M3-org/CharacterStudio** (MIT): open web-based character generator if we
  want a pipeline inside our own tooling later.

## Suggested starting cast (6 slots)

| Amoji slot | Pick |
|---|---|
| Default female companion | AvatarSample_F (Vita) |
| Female variant 2 (cheerful) | AvatarSample_B |
| Female variant 3 (cool) | AvatarSample_C |
| Male companion | best-looking male from 100Avatars R2/R3 (CC0) — shortlist at wiring time |
| Kid-mode friend | 100Avatars pick (e.g. DinoKid-style) |
| Fallback / test | Seed-san (already in repo) |

## What happens next (needs Simon at the PC, or his pick)

1. Download the chosen `.vrm` files (VRoid Hub needs a pixiv login —
   that's the one login only Simon can do; Arweave/GitHub links need none).
2. Drop them in `apps/web/public/models/` + manifest row (CI enforces).
3. I wire each into `CharacterDef.model` / `MODEL_CANDIDATES`, per-language
   voices stay as-is.
4. Note: don't commit VRMs to git history long-term if they are large —
   10–30 MB each; GitHub Releases or CDN hosting + URL loading is the
   scalable path.
