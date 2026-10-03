// One-shot import of the curated local anime cast into the app:
//   companion-<name>.vrm  →  apps/web/public/models/cast/<slug>.vrm
//
// Usage (from the repo root):
//   node scripts/import-cast.mjs [sourceDir]
//
// sourceDir defaults to the known local curation folder
// (_incoming/agent3/prototypes/assets). The mapping mirrors
// apps/web/lib/prefs.ts (r2026-10-04.50) — keep the two in sync.
//
// Hard rule: a source file whose name contains "marin" is NEVER copied
// (CI copyright ban — see ASSET_MANIFEST.md). The Marin character uses
// cast/fumiriya.vrm instead.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEST = path.join(root, 'apps/web/public/models/cast');

const CANDIDATES = [
  process.argv[2],
  path.resolve(root, '..', '_incoming', 'agent3', 'prototypes', 'assets'),
  'C:/Users/Simon Lai/Documents/Kimi/Workspaces/Amoji/_incoming/agent3/prototypes/assets',
].filter(Boolean);

// slug → companion-<name>.vrm (mirrors prefs.ts)
const CAST = {
  juno: 'juno', nova: 'nova', zane: 'zane', hana: 'hana', kai: 'kai',
  luna: 'luna', rin: 'rin', rex: 'rex', alicia: 'alicia', shino: 'shino',
  atlas: 'atlas', 'avatarsample-a': 'avatarsample-a', fumiriya: 'fumiriya',
  sumire: 'sumire', nana: 'nana', 'vroid-male': 'vroid-male', mikel: 'mikel',
  cyrus: 'cyrus', lydia: 'lydia', mimi: 'mimi', yuki: 'yuki', kael: 'kael',
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
fs.mkdirSync(DEST, { recursive: true });

let ok = 0;
let warned = 0;
for (const [slug, name] of Object.entries(CAST)) {
  const from = path.join(src, `companion-${name}.vrm`);
  const to = path.join(DEST, `${slug}.vrm`);
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
    console.log(`ok    cast/${slug}.vrm — ${r.info}`);
  } else {
    warned++;
    console.log(`WARN  cast/${slug}.vrm — ${r.info}`);
  }
}
console.log(`\n${ok} imported clean, ${warned} with warnings/misses.`);
console.log('Next: git add apps/web/public/models/cast && git commit -m "cast: import local models" && git push');
