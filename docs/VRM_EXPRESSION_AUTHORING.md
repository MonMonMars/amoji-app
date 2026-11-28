# VRM expression authoring — the eight face channels that make emotions read

**Who this is for:** the owner, authoring custom expressions in **VRoid Studio** and
exporting new `.vrm` files into `apps/web/public/models/cast/`.

**What it changes:** nothing on the code side. The renderer already knows how to drive
eight independent face channels (`packages/vrm-renderer/src/frame-mapper.ts`,
`EXTRA_FACE_CHANNELS`); on every rig we ship today that path is dormant because no rig
has the morphs. This guide is the work order that switches it on, one rig at a time.

**Read this first if you only read one section:** §4 (naming). A correctly built
expression with a slightly wrong name is silently ignored — or, in one case, makes the
face *worse* than today.

---

## 1. Why this is needed

Right now every character has the same small box of face pieces: smile, frown, angry,
surprised, blink, and five mouth shapes. That is enough to look happy or upset, but not
enough to look *specific*. She cannot lift only the inner ends of her eyebrows, press her
lips thin, wrinkle her nose, or push her cheeks up without also smiling. Those are exactly
the pieces that separate 疑惑 from 專注, or 忍笑 from a real laugh — today those four looks
are all built from the same four presets, so they come out looking like the same face at
different volumes.

The app has nineteen emotions in `packages/emotion-core/src/catalog.ts` and a channel to
drive each of these pieces — it is only waiting for a rig that has them. Eight extra pieces
across two tiers is enough to make those nineteen faces read as different faces. Six of them
are the 80% (§2).

---

## 2. The exact list to author

Type the **Name** column exactly. The casing does not matter to the code; spaces,
underscores and hyphens do (see §4).

| Priority | Type this name | What it does on the face | Emotions it improves (catalog weight) | Authorable in VRoid? |
|---|---|---|---|---|
| **P0** | `BrowInnerUp` | Lifts the inner ends of both brows — the "worried / pleading" brow | sadness 0.8, fear 0.9, shame 0.7, guilt 0.7, confusion 0.6, surprise 0.6, embarrassment 0.5, anger 0.4, love 0.3, relief 0.2 | Yes (Sorrow donor) |
| **P0** | `BrowDown` | Pulls both brows down and together — 專注 / 思考 / 不滿 | anger 0.9, jealousy 0.6, disgust 0.5, contempt 0.4, confusion 0.3 | Yes (Angry donor) |
| **P0** | `BrowOuterUp` | Lifts the outer ends of both brows — the "oh!" brow | surprise 0.9, excitement 0.6, fear 0.5, joy 0.3, pride 0.3, embarrassment 0.3, sadness 0.2, relief 0.2 | Yes (Surprised donor) |
| **P0** | `MouthPress` | Presses the lips thin and flat — the lip that separates 生氣 from 難過 | anger 0.7, disgust 0.4 | Yes (Angry donor) |
| **P0** | `CheekSquint` | Pushes the lower lids up and rounds the cheeks — 忍笑 / genuine smile | joy 0.7, love 0.6, embarrassment 0.5, pride 0.4, contentment 0.3 | Yes (Joy / Fun donor) |
| **P0** | `NoseSneer` | Wrinkles the nose and lifts the upper lip — 厭惡 | disgust 0.9, anger 0.4, jealousy 0.2, contempt 0.2 | **No — Blender only** (§3.4) |
| **P1** | `MouthStretch` | Pulls the mouth corners sideways — the stretched mouth of fear | fear 0.5, embarrassment 0.4, contempt 0.3, boredom 0.2 | Probably (Fun donor) — unverified |
| **P1** | `MouthPucker` | Purses the lips forward — 思考 lips | guilt 0.3, love 0.2, shame 0.2 | Discouraged (§3.4) |

**Why these and not a longer list.** These eight are the complete set the renderer can
drive; there is no ninth. Within them:

- **The brow trio (`BrowInnerUp` + `BrowDown` + `BrowOuterUp`) is the whole ballgame.**
  Brows are the only way 疑惑 (`browInnerUp` + `browDown` pulling opposite ways), 思考
  (`browDown`), and 專注 (`browDown`) become possible at all. Three morphs unlock four
  named gaps.
- **`MouthPress`** is the single cheapest discriminator: at 0.7 on anger and 0 on
  sadness, it is the difference between a pressed mouth and a hanging one, with the same
  brow. It separates 生氣 from 難過 more than any other single channel.
- **`CheekSquint`** is 忍笑. Pressed lips + raised cheeks + squinted lids is a held-back
  laugh; without it the only laugh we have is a full open smile.
- **`NoseSneer`** is the only thing that gives 厭惡 (disgust) any face at all. Today
  disgust drives `noseWrinkle 0.9` into a preset that has nowhere to put it — the face
  falls back to a mild frown. It is P0 by value, but it is **not composable in VRoid**
  (see §3.4), so treat it as an optional Blender job.
- **`MouthStretch`** (P1) is the cheapest win of all: it is the *only* channel the preset
  fold never touched, so authoring it cannot weaken any existing expression. It is also
  the only thing that gives `fear` a mouth — fear today is wide eyes on a neutral mouth.
  Do it right after P0 if you have the energy.
- **`MouthPucker`** (P1) is low value and its only donor is a viseme, so it slightly
  fights lip-sync. Skip it unless you are already in Blender.

---

## 3. How to build each one in VRoid Studio

### 3.0 The one rule: a donor at the weight the preset used to carry

VRoid Studio custom expressions are **combinations of the expressions your model already
has** (Joy, Angry, Sorrow, Fun, Surprised, the visemes, …) with weight sliders. You cannot
sculpt a new deformation in VRoid. So each channel is built as a *donor* group at a chosen
percentage.

That is not a hack — it lines up with how the renderer works. Each channel currently
contributes a fixed share to one preset. The moment the rig has the channel, the renderer
**stops adding that share** and drives your morph instead. So if you set the donor weight
to that same share, the face at full emotion looks exactly as it does today, while the
channel becomes independently drivable for other emotions.

| Channel | Donor expression | Weight | Old share it replaces |
|---|---|---|---|
| `BrowInnerUp` | `Sorrow` | **30** | `browInnerUp × 0.3` into Sorrow |
| `BrowOuterUp` | `Surprised` | **25** | `browOuterUp × 0.25` into Surprised |
| `BrowDown` | `Angry` | **70** (range 50–70) | `browDown × 0.7` into Angry |
| `MouthPress` | `Angry` | **20** | `lipPress × 0.2` into Angry |
| `CheekSquint` | `Joy` + `Fun` | **30** / **30** | `cheekRaise × 0.3` into Joy, `× 0.5` into Fun |
| `NoseSneer` | — | — | `noseWrinkle × 0.2` into Angry |
| `MouthStretch` | `Fun` | **25** (range 20–35) | none — pure addition |
| `MouthPucker` | `O` viseme | 25 | `mouthPucker × 0.3` into relaxed |

Rigs without a `Fun` expression (cyrus, hina, kael — see §7) build `CheekSquint` from
`Joy 30` alone. `Fun 30` rather than the exact-matching `Fun 50` is deliberate: `Fun` opens
the jaw, and at 50 it pops the mouth open on every laugh.

### 3.1 The UI path

1. Open the character's **`.vroid` project** in VRoid Studio — not the exported `.vrm`.
   An exported file cannot be edited.
2. **Save a copy first:** File → Save As → `<character>-before-expressions.vroid`. The
   custom expressions are part of the project, so you need this file if you ever re-export.
3. Open the **Expression** tab (表情) — the tab whose panel is a row of face thumbnails
   (Joy, Angry, Sorrow, Fun, Surprised, Blink, Blink_L, Blink_R).
4. Press the **＋ / New expression** button at the end of the thumbnail row.
5. In the name field, type the name from the table **exactly** — e.g. `BrowInnerUp`.
6. In the list of expressions to the left, find the donor (`Sorrow`) and drag its slider to
   `30`. Every other slider stays at `0`. If VRoid pre-filled the new expression by copying
   an existing one, zero everything first.
7. Check the preview (§3.3), then save the expression.
8. Repeat for each row. Do not rename or delete anything that already exists.
9. Export → VRM → overwrite `apps/web/public/models/cast/<character>.vrm`.
10. Run the dump in §5 and confirm every name you typed is in the list.

> **Unverified:** exact button labels and whether your VRoid Studio version allows an
> unlimited number of custom expressions. The Expression tab and the plus button are
> present in the versions used for this cast, but the wording moves between releases and
> languages. If your build has no way to add a custom expression, stop and report it — do
> not work around it by editing the base expressions.

### 3.2 Recipes, one at a time

#### P0 · `BrowInnerUp` — inner brow lift
- **Donor:** `Sorrow` at **30**.
- **Check:** both inner brow ends lift; the outer ends stay put; the mouth frowns only
  faintly at max (sadness pushes this channel to 0.8, so the mouth gets ~0.24 of a frown).
- **Mistakes:** 60+ doubles the frown *and* droops the lids (Sorrow closes the eyes) — the
  face reads sleepy, and the brow clips into the bangs. Watch the hairline at full weight.

#### P0 · `BrowDown` — brow lower
- **Donor:** `Angry` at **70** (back off to 50 if jealousy looks too furious).
- **Check:** brows drop and converge; at `browDown 0.9` (anger) the mouth should look angry
  but not like a snarl; at 0.3 (confusion) only the brows should read.
- **Mistakes:** `Angry` carries the angry *mouth* and *eyes* with it, so 70 is a lot of
  mouth. Look at **jealousy** (0.6) and **confusion** (0.3) as well as anger — those are
  the two where an over-driven donor is obvious.

#### P0 · `BrowOuterUp` — outer brow lift
- **Donor:** `Surprised` at **25**.
- **Check:** outer brow ends lift; the eyes widen a touch (that is `Surprised`'s own
  eye-wide). At `surprise 0.9` you get ~0.22 of Surprised, so the jaw parts very slightly —
  correct for a surprised face.
- **Mistakes:** 40+ makes every excitement look like a jump-scare. Also see the blink note
  in §6.3 — after this channel exists, the surprise preset's own weight drops from 1.0 to
  0.75, which is still above the 0.55 blink gate but with less margin.

#### P0 · `MouthPress` — pressed lips
- **Donor:** `Angry` at **20**.
- **Check:** lips thin and flatten; the brows move only a hair (at `lipPress 0.7` that is
  ~0.14 of Angry). That small brow drift is expected and is fine, because the channel is
  driven at the same time anger drives `BrowDown`.
- **Mistakes:** 40+ re-adds the brow work you just separated, so 生氣 and 專注 start to look
  alike again.

#### P0 · `CheekSquint` — cheek / lower-lid raise
- **Donor:** `Joy` at **30**, plus `Fun` at **30** if the rig has a `Fun` expression.
- **Check:** lower lids push up, cheeks round, and the mouth does **not** open at
  `cheekRaise 0.7` (joy). At `contentment 0.3` the cheeks should barely round.
- **Mistakes:** `Fun` at 50+ (the mathematically exact replacement) pops the jaw open; `Fun`
  at 0 leaves the laugh flat. Split the difference at 30. If the eyes start to look
  swallowed, the `Joy` share is too high — 20 is still useful.

#### P0 · `NoseSneer` — nose wrinkle
- **Donor:** none available. See §3.4.

#### P1 · `MouthStretch` — stretched mouth
- **Donor:** `Fun` at **25** (or `Surprised` at 20 on a rig without `Fun`).
- **Check:** corners pull wide without the jaw dropping and without teeth or gums showing.
  Look at `fear` (0.5) and `contempt` (0.3) — those are its two jobs.
- **Mistakes:** this channel **adds on top** of whatever the preset mouth is doing (it was
  never part of the fold). At 35+ on top of a Sorrow frown the mouth tears. **Unverified:**
  whether VRoid's `Fun` stretches sideways enough to read as *stretch* rather than as a
  grin — check it at 100% before committing.

#### P1 · `MouthPucker` — pursed lips
- **Donor:** `O` viseme at **25**. Discouraged — see §3.4.

### 3.3 What to check on every expression before you export

- **Weight 100% on the new expression**, then **weight 100% on the donor it came from**.
  They should look the same (that is the "same share" rule in §3.0). If yours looks
  stronger, the donor weight is too high.
- **Symmetry:** both halves of the face move together. A lopsided brow means you are
  looking at the donor's own asymmetry, not at your slider.
- **No mesh tearing:** brows must not clip through bangs, lips must not intersect at the
  centre seam, jaw must not separate from the neck.
- **At the max weight the catalog will push:** browInnerUp 0.9 (fear), browDown 0.9
  (anger), cheekRaise 0.7 (joy), lipPress 0.7 (anger), noseWrinkle 0.9 (disgust),
  mouthStretch 0.5 (fear). Check those, not 100%.

### 3.4 When VRoid cannot do it

**VRoid custom expressions are bounded by the expressions the model already has.** VRoid
does not let you sculpt a new deformation, so a channel is only buildable if some existing
expression already moves that part of the face.

- **`NoseSneer` cannot be composed.** No VRoid base expression moves the nose. Verify with
  a scrub test: set `Angry`, `Sorrow`, `Fun` and `Surprised` to 100% one at a time and
  watch the nose. If nothing moves, the morph does not exist and no slider combination will
  create it. **Fallbacks, in order of effort:**
  1. **Skip it.** Disgust keeps reading as `BrowDown` + a frown. Safe, no regression.
  2. **Blender.** Open the exported VRM with the [VRM Add-on for
     Blender](https://vrm-addon-for-blender.info/), duplicate the face mesh's existing
     `Angry` (or equivalent) shape key, and edit the brow/nose region only so the new key
     is *just* the nose wrinkle. Name the shape key `NoseSneer` and add it as a custom
     expression in the add-on's Expression panel. Roughly 20–40 minutes per morph, and it
     is a mesh job rather than a slider job — if you get here, hand me the `.blend` and I
     will do the vertex work.
  3. **Re-rig** the character on a base model that ships the morph. Largest effort; only
     worth it for a hero character.
- **`MouthPucker` is possible but discouraged.** Its only donor is the `O` viseme, which
  the app also drives for the "oh" sound during speech. The two add together, so the mouth
  over-rounds on "oh". At the weights love/shame/guilt use (0.2–0.3) the error is about
  0.05 and invisible, but the payoff is just as small.
- **`MouthStretch` is probably possible** via `Fun`, but this one is **unverified** — the
  question is whether `Fun`'s wide-mouth motion reads as a sideways stretch or as a grin.
  Try it, look at it at 100%, and keep it only if fear's face improves.

---

## 4. Naming rules that will silently break things

The renderer builds a map of the rig's **real** expression names at mount
(`apps/web/lib/vrm/expression-names.ts` → `buildExpressionNameMap`) and resolves every
channel through it. Matching is **case-insensitive**; nothing else is normalised.

### 4.1 Hard rules

1. **No spaces, underscores, hyphens or dots.** `BrowInnerUp` ✓, `browinnerup` ✓,
   `Brow_Inner_Up` ✗, `Brow Inner Up` ✗, `brow-inner-up` ✗.
2. **Casing is free** — but type the canonical form anyway, so a human reading the dump
   can tell what it is.
3. **One name, once.** Two expressions whose names differ only by case collapse to one
   entry and the first one wins. Never author `BrowDown` twice.
4. **Never name an expression `Relaxed`.** On VRoid's VRM 0.x export the code maps
   `relaxed` to *nothing* (there is no VRoid "relaxed" face), so a group with that name is
   never driven. Same for `Happy`, `Sad` — the presets already resolve those to
   `Joy`/`Sorrow`.
5. **Never rename or repurpose `A`, `I`, `U`, `E`, `O`.** These five are the lip-sync
   visemes. They are written every speaking frame from the voice analyser. Renaming them
   silences the mouth; adding brow movement into one of them makes the brows twitch with
   every syllable.
6. **Never rename `Joy`, `Angry`, `Sorrow`, `Fun`, `Surprised`, `Neutral`, `Blink`,
   `Blink_L`, `Blink_R`.** Delete one and that emotion loses its face.

### 4.2 The three names with two accepted spellings — read this twice

For three channels the resolver accepts an ARKit-style alias as well as the channel name:

| Channel | Accepted spellings |
|---|---|
| `noseWrinkle` | `NoseWrinkle`, `NoseSneer` |
| `lipPress` | `LipPress`, `MouthPress` |
| `cheekRaise` | `CheekRaise`, `CheekSquint` |

**On a VRoid Studio export (VRM 0.x) you must use the second column — `NoseSneer`,
`MouthPress`, `CheekSquint`.** The VRM 0.x write path
(`apps/web/lib/vrm/avatar.ts`, `GenericAvatar.setExpression`) rewrites those three channel
names to the ARKit spelling *before* looking them up, and does not try the original:

```
EXPRESSION_ALIAS['lippress']  === 'mouthpress'
EXPRESSION_ALIAS['cheekraise'] === 'cheeksquint'
EXPRESSION_ALIAS['nosewrinkle'] === 'nosesneer'
```

The consequence is the one genuinely dangerous failure mode in this whole job:

| What you typed (VRM 0.x) | Detected as a channel? | Actually driven? | Result |
|---|---|---|---|
| `MouthPress` | yes | yes | works |
| `LipPress` | **yes** | **no** | **the preset loses its 0.2 share and nothing replaces it — the angry face gets weaker** |
| `CheekSquint` | yes | yes | works |
| `CheekRaise` | **yes** | **no** | joy/laugh lose their 0.3 / 0.5 cheek share |
| `NoseSneer` | yes | yes | works |
| `NoseWrinkle` | **yes** | **no** | angry loses its 0.2 nose share |

Every other channel (`BrowInnerUp`, `BrowOuterUp`, `BrowDown`, `MouthStretch`,
`MouthPucker`) has the same name either way and is safe.

If you later export **VRM 1.0** (Blender add-on), both spellings work — the VRM 1.0 path
tries the exact name first.

### 4.3 The failure modes, ranked

1. **Typo / separator** → channel not detected → the preset keeps its old share → the face
   looks exactly as today. Safe, no improvement.
2. **Wrong variant of the three aliased names on VRM 0.x** → detected but not driven → the
   preset loses its share → the face looks *weaker* than today. This is the only regression
   mode. Verify it in the dump (§5) and by eye.
3. **Duplicate name** → first wins, second is dead weight.

---

## 5. Verification

### 5.1 Does the file contain the names?

This is the same list the app builds its lookup from, so if the name is in the output, the
channel is live. Copy-paste in PowerShell 5.1 from the repo root:

```powershell
cd "d:\AI app development\amoji-app"
node -e "const fs=require('fs');const b=fs.readFileSync(process.argv[1]);const n=b.readUInt32LE(12);const j=JSON.parse(b.toString('utf8',20,20+n));const v0=j.extensions&&j.extensions.VRM;const v1=j.extensions&&j.extensions.VRMC_vrm;const out={};if(v0)out.groups=(v0.blendShapeMaster&&v0.blendShapeMaster.blendShapeGroups||[]).map(g=>g.name);if(v1)out.expressions=[].concat(Object.keys((v1.expressions&&v1.expressions.preset)||{}),Object.keys((v1.expressions&&v1.expressions.custom)||{}));console.log(JSON.stringify(out,null,2));" "apps/web/public/models/cast/hina.vrm"
```

Change the last argument per character. A working result looks like:

```
{
  "groups": [
    "A", "I", "U", "E", "O", "Blink", "Joy", "Angry", "Sorrow", "Surprised",
    "BrowInnerUp", "BrowDown", "BrowOuterUp", "MouthPress", "CheekSquint"
  ]
}
```

Note the existing spellings in this repo's rigs: `Joy` and `Angry` are title-case on some
rigs; `Surprised` is `unknown`-preset on some. That is all handled — do not "normalise"
them.

`node scripts/check-vrm.mjs "apps/web/public/models/cast/hina.vrm"` also works and prints
the group list, but it only validates the required presets, so the one-liner above is the
one to use.

### 5.2 Do the code paths still agree?

```powershell
pnpm --filter @amoji/vrm-renderer exec vitest run tests/extra-channels.test.ts
cd apps\web; npm test -- --run tests/expression-channels.test.ts
```

Expected: **5 passed** and **4 passed**. These prove (a) a rig with a channel drives it as
its own target and drops it from the preset fold, (b) a rig without it keeps the old fold,
and (c) the alias spellings resolve. They do not read your file — §5.1 does that.

### 5.3 Does it look right in the app?

The live site caches models, so a new `.vrm` needs the normal revision bump (APP_REVISION +
`public/sw.js` cache + `public/revision.txt`) before the phone shows it. On a desktop local
build, a hard reload is enough.

What to expect, and what not to file as a bug:

- **Brows stay at ~90% while she is talking.** The speech duck is 10%, not the old flatten
  to 64%. Brows and pressed lips hold through a line.
- **Extra channels do not get the onset punch.** The 1.2× "landing beat" is applied to the
  five presets only (`apps/web/lib/emotion-presentation.ts`). Your channels hold at the
  engine weight. Do not add a punch inside the morph.
- **Presets get slightly lighter where the channel took over** — that is the point. Judge
  the *whole face* at anger / sadness / joy / surprise, not the preset alone.
- **A surprised beat must still hold the lids open.** Blink is suppressed at surprise ≥
  0.55. See §6.3.

### 5.4 Report back

```
Report: CHAR: <character> | NEW: <names authored> | DUMP: <paste the names array> |
FACE: <what changed on 生氣 / 難過 / 開心 / 驚訝>
```

---

## 6. What NOT to do

### 6.1 Never remove or rename what is already there
- Do not rename `Joy`, `Angry`, `Sorrow`, `Fun`, `Surprised`, `Neutral`.
- Do not delete `Blink`, `Blink_L` or `Blink_R`. **The rigs differ:** cyrus ships only
  `Blink_L`/`Blink_R` and blinks *through* them (the code has a split-lid fallback). Remove
  one and that character stops blinking or keeps one eye shut.
- Do not touch the five visemes `A/I/U/E/O` in any way — no renaming, no repurposing, no
  extra brow movement inside them.
- Do not "tidy" the naming to one casing convention across rigs. Each file keeps its own
  spellings and the resolver handles them.

### 6.2 Never restructure the model to make room
- Do not flatten or simplify the face — do not zero out the base expressions, do not merge
  a new expression into an existing preset, do not replace `Sorrow` with your new brow.
- Do not use the **Face** tab's brow/eye/mouth *shape* sliders while doing this job. Those
  regenerate the face mesh and every existing expression with it. Save a copy of the
  `.vroid` first (§3.1 step 2) and leave the shape sliders alone.

### 6.3 Two behaviours that are already correct — do not "fix" them
- **`Surprised` is already in use** and its name differs by rig (`Surprised` with preset
  `unknown` on fumiriya, plain `Surprised` elsewhere). Leave it exactly as it is.
- **Surprise suppresses blink at strength ≥ 0.55** (`CompanionCanvas.tsx`). Authoring
  `BrowOuterUp` moves the brow out of the surprise preset, so surprise's maximum weight
  drops from 1.0 to 0.75 (eyes only). That is still above the gate — but it is closer.
  After authoring it, check one surprised beat and confirm the lids stay open instead of
  blinking shut mid-shock. If they do blink, report it rather than raising the gate
  yourself.

---

## 7. Accepted-names reference

What the code asks for → what it accepts in the file → what happens if it is absent.
VRM 0.x is what VRoid Studio exports; VRM 1.0 is what the Blender add-on exports.

| Code channel | VRM 0.x — use this | VRM 1.0 — also accepts | If absent |
|---|---|---|---|
| `browInnerUp` | `BrowInnerUp` | `BrowInnerUp` | stays folded into `Sorrow` (0.3) — no change |
| `browOuterUp` | `BrowOuterUp` | `BrowOuterUp` | stays folded into `Surprised` (0.25) |
| `browDown` | `BrowDown` | `BrowDown` | stays folded into `Angry` (0.7) |
| `lipPress` | **`MouthPress`** | `MouthPress`, `LipPress` | stays folded into `Angry` (0.2) |
| `cheekRaise` | **`CheekSquint`** | `CheekSquint`, `CheekRaise` | stays folded into `Joy` (0.3) + `Fun` (0.5) |
| `noseWrinkle` | **`NoseSneer`** | `NoseSneer`, `NoseWrinkle` | stays folded into `Angry` (0.2) |
| `mouthStretch` | `MouthStretch` | `MouthStretch` | no effect — it was never in a preset |
| `mouthPucker` | `MouthPucker` | `MouthPucker` | stays folded into `relaxed` (0.3) — but `relaxed` is inert on a 0.x rig (§4.1 rule 4) |
| preset `joy` | `Joy` | `happy` / `joy` | smile gone |
| preset `sorrow` | `Sorrow` | `sad` / `sorrow` | frown gone |
| preset `angry` | `Angry` | `angry` | anger gone |
| preset `surprise` | `Surprised` | `surprised` | **the surprise beat flattens the face** (this is the bug the map exists for) |
| visemes | `A I U E O` | `aa ih ou ee oh` | mouth stops tracking the voice |
| eyelids | `Blink`, `Blink_L`, `Blink_R` | `blink`, `blinkLeft`, `blinkRight` | eyes stay open, or one eye stuck |

### What each rig already has (verified against the GLB JSON, 2026-11-28)

Every one of the 14 cast rigs has `A I U E O Joy Angry Sorrow Surprised`. Beyond that:

| Rig | Extra groups already present |
|---|---|
| `luna` | `Neutral`, `Fun`, `Blink`, `Blink_L`, `Blink_R`, `LookUp`, `LookDown`, `LookLeft`, `LookRight` |
| `fumiriya` | `Neutral`, `Fun`, `Blink`, `Blink_L`, `Blink_R` |
| `juno` | `Blink`, `Blink_L`, `LookLeft` |
| `cyrus` | `Blink_L`, `Blink_R` only — **no plain `Blink`, no `Fun`** |
| `hina`, `kael` | `Blink` only — no `Fun` |
| `lydia`, `mikel`, `mimi`, `mio`, `olivia`, `rin`, `sumire`, `yuki` | `Blink` only |

Two things to take from this:

- **Do not author `LookUp`/`LookDown`/`LookLeft`/`LookRight`.** luna and juno already have
  some, and the code deliberately pins those four to zero — gaze is driven in code, not by
  morphs. They are not expression channels and adding more does nothing.
- **Rigs without `Fun` build `CheekSquint` from `Joy` alone** (§3.2). Those are cyrus,
  hina and kael.

### Definition of done, per character

- [ ] A copy of the `.vroid` project is saved before any expression work.
- [ ] Only the P0 rows (plus P1 if you chose to) were added; nothing existing was renamed
      or deleted.
- [ ] The dump in §5.1 lists every name you typed, under the VRM 0.x spelling for the
      three aliased channels.
- [ ] At 100% each new expression looks the same as its donor at the donor weight.
- [ ] No brow clips the bangs, no lip seam intersects, no jaw separates.
- [ ] Anger, sadness, joy and surprise each still read as themselves.
- [ ] One surprised beat still holds the lids open.
- [ ] The `.vrm` is dropped in `apps/web/public/models/cast/`, and the revision bump /
      phone check follow the normal shipping path (`docs/PHONE_SMOKE.md`).
