// One-shot import of the curated local anime cast into the app:
//   companion-<name>.vrm  →  apps/web/public/models/cast/<slug>.vrm
//   companion-char-<src>.png → apps/web/public/portraits/<dst>.png
//
// Usage (from the repo root):
//   node scripts/import-cast.mjs [sourceDir]
//
// sourceDir defaults to the known local curation folder
// (_incoming/agent3/prototypes/assets). The mapping mirrors
// apps/web/lib/prefs.ts (r2026-10-04.52, 29 characters) — keep the two in sync.
//
// Hard rule: a source file whose name contains "marin" is NEVER copied
// (CI copyright ban — see ASSET_MANIFEST.md). The Marin character uses
// cast/fumiriya.vrm instead.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEST_MODELS = path.join(root, 'apps/web/public/models/cast');
const DEST_PORTRAITS = path.join(root, 'apps/web/public/portraits');

const CANDIDATES = [
  process.argv[2],
  path.resolve(root, '..', '_incoming', 'agent3', 'prototypes', 'assets'),
  'C:/Users/Simon Lai/Documents/Kimi/Workspaces/Amoji/_incoming/agent3/prototypes/assets',
].filter(Boolean);

// character id → companion-<name>.vrm (mirrors prefs.ts).
// Destination keeps the SOURCE name (zane.vrm, rex.vrm, elio.vrm, hana.vrm…)
// because prefs.ts and ASSET_MANIFEST.md key those characters by source name —
// the single source of truth is prefs.model, and the manifest must match it.
const CAST = {
  // flagship top-10 (r2026-10-04.52)
  nova: 'nova', kizuna: 'kizuna', alicia: 'alicia', ember: 'ember', mei: 'mei',
  atlas: 'atlas', sky: 'sky', yuki: 'yuki', hina: 'hina', mio: 'mio',
  // classic cast — keyed by character id now, source file names unchanged
  mochi: 'hana', juno: 'juno', blaze: 'zane', kai: 'kai', luna: 'luna',
  rin: 'rin', ren: 'rex', cloud: 'elio', kasumi: 'avatarsample-a',
  marin: 'fumiriya', ayane: 'sumire', hitomi: 'nana', robbie: 'vroid-male',
  mika: 'mikel', anchor: 'cyrus', lydia: 'lydia', ruby: 'mimi',
  snowy: 'olivia', alan: 'kael',
};

// character portrait id → companion-char-<src>.png (the .png cast — prefs
// points these ids at /portraits/<dst>.png; classic .jpg art already ships)
const PORTRAITS = {
  nova: 'nova', kizuna: 'kizuna', alicia: 'alicia', ember: 'ember', mei: 'mei',
  atlas: 'atlas', sky: 'sky', yuki: 'yuki', hina: 'hina', mio: 'mio',
  cloud: 'elio', robbie: 'robert', mika: 'mikel', anchor: 'cyrus',
  lydia: 'lydia', ruby: 'mimi', snowy: 'olivia', alan: 'kael',
};

/** GLB/VRM structural sniff — same rules as tests/assets.test.ts */
function structural(buf) {
  if (buf.toString('ascii', 0, 4) !== 'glTF') return { ok: false, info: 'not a GLB' };
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
  const isV1 = Boolean(json.extensions?.VRMC_vrm);
  const isV0 = Boolean(json.extensions?.VRM);
  if (!isV1 && !isV0) return { ok: false, info: 'no VRM extension' };
  if (isV1) {
    const exps = Object.keys(json.extensions.VRMC_vrm.expressions?.preset ?? {});
    const missing = ['happy', 'angry', 'sad', 'surprised'].filter((n) => !exps.includes(n));
    const head = 'head' in (json.extensions.VRMC_vrm.humanoid?.humanBones ?? {});
    return {
      ok: missing.length === 0 && head,
      info: `VRM1.0 presets=[${exps.join(',')}] head=${head ? 'yes' : 'NO'}${missing.length ? ' missing:' + missing.join('/') : ''}`,
    };
  }
  const names = (json.extensions.VRM.blendShapeMaster?.blendShapeGroups ?? []).map((g) =>
    String(g.name).toLowerCase(),
  );
  const missing = ['joy', 'angry', 'sorrow', 'surprised'].filter((n) => !names.includes(n));
  const bones = json.extensions.VRM.humanoid?.humanBones ?? [];
  const boneNames = Array.isArray(bones) ? bones.map((b) => b.bone) : Object.keys(bones);
  const arms = ['leftUpperArm', 'rightUpperArm'].filter((b) => !boneNames.includes(b));
  return {
    ok: missing.length === 0 && boneNames.includes('head') && arms.length === 0,
    info: `VRM0.x morphs=${missing.length ? 'missing:' + missing.join('/') : 'full'} head=${boneNames.includes('head') ? 'yes' : 'NO'} arms=${arms.length ? 'missing:' + arms.join('/') : 'ok'}`,
  };
}

const src = CANDIDATES.find((d) => d && fs.existsSync(d));
if (!src) {
  console.error(`source assets folder not found — looked in:\n  ${CANDIDATES.join('\n  ')}`);
  process.exit(1);
}
fs.mkdirSync(DEST_MODELS, { recursive: true });
fs.mkdirSync(DEST_PORTRAITS, { recursive: true });

// Remove stale .vrm files left by earlier misnamed imports (destination set
// below is keyed by SOURCE name — anything else on disk is orphaned).
{
  const keep = new Set(Object.values(CAST).map((n) => `${n}.vrm`));
  for (const f of fs.readdirSync(DEST_MODELS)) {
    if (f.endsWith('.vrm') && !keep.has(f)) {
      fs.rmSync(path.join(DEST_MODELS, f));
      console.log(`rm stale cast/${f}`);
    }
  }
}

let ok = 0;
let warned = 0;
for (const [slug, name] of Object.entries(CAST)) {
  const from = path.join(src, `companion-${name}.vrm`);
  const to = path.join(DEST_MODELS, `${name}.vrm`);
  if (/marin/i.test(path.basename(from))) {
    console.error(`SKIP  banned name: ${path.basename(from)}`);
    warned++;
    continue;
  }
  if (!fs.existsSync(from)) {
    console.error(`MISS  ${from}`);
    warned++;
    continue;
  }
  fs.copyFileSync(from, to);
  const r = structural(fs.readFileSync(to));
  if (r.ok) {
    ok++;
    console.log(`ok    cast/${name}.vrm — ${r.info}`);
  } else {
    warned++;
    console.log(`WARN  cast/${name}.vrm — ${r.info}`);
  }
}
console.log(`${ok} models imported clean, ${warned} with warnings/misses.`);

let pOk = 0;
let pWarned = 0;
for (const [dst, srcName] of Object.entries(PORTRAITS)) {
  const from = path.join(src, `companion-char-${srcName}.png`);
  const to = path.join(DEST_PORTRAITS, `${dst}.png`);
  if (/marin/i.test(path.basename(from))) {
    console.error(`SKIP  banned name: ${path.basename(from)}`);
    pWarned++;
    continue;
  }
  if (!fs.existsSync(from)) {
    console.error(`MISS  ${from}`);
    pWarned++;
    continue;
  }
  fs.copyFileSync(from, to);
  pOk++;
  console.log(`ok    portraits/${dst}.png`);
}
console.log(`${pOk} portraits imported, ${pWarned} missed.`);
console.log('Next: git add apps/web/public/models/cast apps/web/public/portraits && git commit -m "cast: import local models + portraits" && git push');
