// One-shot fetch of the open VRMA motion library into the app's public
// assets, so the companion body is ALWAYS driven by real mocap-style clips
// (Master Simon r2026-10-04: never rotate the skeleton procedurally when a
// library clip is available).
//
// r2026-10-04.93: multi-source mirror. The idle pool is now 18 open .vrma
// idle performances streamed from three CORS-open motion libraries:
//   tk256ailab/vrm-viewer            (main)    — classic sample clips
//   yv-was-taken/desktop-waifu       (master)  — neutral / stretch / sigh idles
//   DavinciDreams/3dchat             (main)    — weightShift, nod, bashful…
// plus two one-shot hosts for the bow (virtual-avatar-sdk) and the wave
// (VRM-Assets-Pack-For-Silly-Tavern). File lists verified via GitHub API.
//
// r2026-10-05.96: the move triggers get real one-shot performances too —
// dance / sing / kungfu / piano / violin come from the 3dchat Mixamo-class
// library (hipHopDancing, singing, punch, pianoPlaying, playingTheViolin).
//
// Each source below mirrors the url chain in CompanionCanvas.tsx
// (IDLE_SOURCES / PERF_SOURCES) so the local /models/anims/<id>.vrma takes
// over from the streamed originals once committed.
//
// Until the mirrored binaries are committed, the app streams the same clips
// straight from the libraries; this script vendores them locally.
//
// Usage (from repo root):  node scripts/fetch-anims.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEST = path.join(root, 'apps/web/public/models/anims');

const TK = 'https://raw.githubusercontent.com/tk256ailab/vrm-viewer/main/VRMA';
const DW = 'https://raw.githubusercontent.com/yv-was-taken/desktop-waifu/master/public/animations';
const CHAT = 'https://raw.githubusercontent.com/DavinciDreams/3dchat/main/public/animations/vrma';
const ALT = 'https://raw.githubusercontent.com/hirokazuniimoto/virtual-avatar-sdk/main/assets/animations';
const ST = 'https://raw.githubusercontent.com/test157t/VRM-Assets-Pack-For-Silly-Tavern/main/animation_nitral-fork';

// mirror ids match CompanionCanvas's ClipSource ids exactly
const SOURCES = [
  // —— idle pool (18 loopable standing performances) ——
  { id: 'StandardIdle', urls: [`${ALT}/standard_idle.vrma`, `${TK}/StandardIdle.vrma`] },
  { id: 'NeutralIdle', urls: [`${DW}/neutral_idle.vrma`] },
  { id: 'DwarfIdle', urls: [`${DW}/Dwarf%20Idle.vrma`] },
  { id: 'LadyIdle', urls: [`${DW}/Female%20Standing%20Pose.vrma`] },
  { id: 'ArmStretch', urls: [`${DW}/Arm%20Stretching.vrma`] },
  { id: 'HeadShake', urls: [`${DW}/Stroke%20Shaking%20Head.vrma`] },
  { id: 'ThinkingPose', urls: [`${DW}/thinking.vrma`] },
  { id: 'WeightShift', urls: [`${CHAT}/weightShift.vrma`] },
  { id: 'HeadNod', urls: [`${CHAT}/headNod.vrma`] },
  { id: 'RelievedSigh', urls: [`${CHAT}/relievedSigh.vrma`] },
  { id: 'Cocky', urls: [`${CHAT}/beingCocky.vrma`] },
  { id: 'Bashful', urls: [`${CHAT}/bashful.vrma`] },
  { id: 'BoredIdle', urls: [`${CHAT}/boredmelancholyIdle_1.vrma`] },
  { id: 'Acknowledge', urls: [`${CHAT}/acknowledging.vrma`] },
  { id: 'Sleepy', urls: [`${TK}/Sleepy.vrma`] },
  { id: 'Relax', urls: [`${TK}/Relax.vrma`] },
  { id: 'LookAround', urls: [`${TK}/LookAround.vrma`] },
  { id: 'Thinking', urls: [`${TK}/Thinking.vrma`] },
  // —— one-shot dialogue performances ——
  { id: 'Jump', urls: [`${TK}/Jump.vrma`] },
  { id: 'Bow', urls: [`${ALT}/quick_formal_bow.vrma`] },
  { id: 'Hello', urls: [`${ST}/hello.vrma`] },
  // r96: real one-shot performances for the move triggers (3dchat library)
  { id: 'Dance', urls: [`${CHAT}/hipHopDancing.vrma`] },
  { id: 'Sing', urls: [`${CHAT}/singing.vrma`] },
  { id: 'Punch', urls: [`${CHAT}/punch.vrma`] },
  { id: 'Piano', urls: [`${CHAT}/pianoPlaying.vrma`] },
  { id: 'Violin', urls: [`${CHAT}/playingTheViolin.vrma`] },
];

fs.mkdirSync(DEST, { recursive: true });

let ok = 0;
let failed = 0;
for (const src of SOURCES) {
  const to = path.join(DEST, `${src.id}.vrma`);
  let lastErr = 'no urls';
  for (const url of src.urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      // structural sniff: GLB magic + VRMA extension marker
      if (buf.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a GLB');
      const jsonLen = buf.readUInt32LE(12);
      const json = buf.toString('utf8', 20, 20 + jsonLen);
      if (!json.includes('VRMC_vrm_animation')) throw new Error('no VRMC_vrm_animation extension');
      fs.writeFileSync(to, buf);
      ok++;
      console.log(`ok    anims/${src.id}.vrma (${buf.length} bytes) ← ${url}`);
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  if (lastErr) {
    failed++;
    console.error(`FAIL  anims/${src.id}.vrma — ${lastErr}`);
  }
}
console.log(`${ok} clips fetched, ${failed} failed.`);
process.exit(failed ? 1 : 0);
