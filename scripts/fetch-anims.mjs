// One-shot fetch of the open VRMA motion library into the app's public
// assets, so the companion body is ALWAYS driven by real mocap-style clips
// (Master Simon r2026-10-04: never rotate the skeleton procedurally when a
// library clip is available).
//
// Source: github.com/tk256ailab/vrm-viewer (VRMA/ folder — a demo project
// bundling 11 open sample clips). File list verified via GitHub API.
//
// Until the mirrored binaries are committed, the app streams the same clips
// straight from the library (see ANIM_LIBRARY in CompanionCanvas.tsx); this
// script vendores them so the local mirror takes over.
//
// Usage (from repo root):  node scripts/fetch-anims.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEST = path.join(root, 'apps/web/public/models/anims');
const BASE = 'https://raw.githubusercontent.com/tk256ailab/vrm-viewer/main/VRMA';

const CLIPS = [
  'Angry', 'Blush', 'Clapping', 'Goodbye', 'Jump', 'LookAround',
  'Relax', 'Sad', 'Sleepy', 'Surprised', 'Thinking',
];

fs.mkdirSync(DEST, { recursive: true });

let ok = 0;
let failed = 0;
for (const name of CLIPS) {
  const to = path.join(DEST, `${name}.vrma`);
  try {
    const res = await fetch(`${BASE}/${name}.vrma`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // structural sniff: GLB magic + VRMA extension marker
    if (buf.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a GLB');
    const jsonLen = buf.readUInt32LE(12);
    const json = buf.toString('utf8', 20, 20 + jsonLen);
    if (!json.includes('VRMC_vrm_animation')) throw new Error('no VRMC_vrm_animation extension');
    fs.writeFileSync(to, buf);
    ok++;
    console.log(`ok    anims/${name}.vrma (${buf.length} bytes)`);
  } catch (e) {
    failed++;
    console.error(`FAIL  anims/${name}.vrma — ${e instanceof Error ? e.message : String(e)}`);
  }
}
console.log(`${ok} clips fetched, ${failed} failed.`);
process.exit(failed ? 1 : 0);
