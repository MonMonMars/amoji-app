#!/usr/bin/env node
/** Bake sidecar GIF loops: apps/web/public/animations/owner-picker-previews/<clipId>.gif */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'apps/web/public');
const outDir = path.join(publicRoot, 'animations/owner-picker-previews');

const PERF_LIB_IDS = [
  'C03', 'C09', 'C60', 'C61', 'C62', 'C110', 'C111', 'C112', 'C113', 'C114',
  'C116', 'C117', 'C118', 'C119', 'C124', 'C125', 'C126', 'C127', 'C128',
].map((c) => `lib_${c}`);

const POKE_TIERS = ['head', 'shoulder_chest', 'belly', 'hip', 'thigh', 'calf_foot'];
const POKE_ANGLES = ['front', 'left', 'back', 'right'];
const POKE_PREVIEW_IDS = POKE_TIERS.flatMap((tier) =>
  POKE_ANGLES.map((angle) => `poke_${tier}_${angle}`),
);
POKE_PREVIEW_IDS.push('poke_lean_demo');

const DEFAULT_CLIP_IDS = [
  'IdleQuaterniusHuman', 'IdleBreathCalm', 'StandardIdle', 'IdleMixamoBreathing', 'IdleNeutral',
  'IdleRpmFStanding001', 'lib_C04', 'IdleRpmFVar001', 'lib_C25', 'IdleInnersceneSam', 'IdleRpmMStanding001',
  'LookAround', 'lib_C42', 'IdleRpmFVar003', 'IdleRpmFVar004', 'IdleRpmMVar001', 'Thinking', 'IdleSassy',
  'Relax', 'IdleMixamoArmStretch', 'IdleRpmMVar002', 'IdleMixamoHappy', 'lib_C120', 'lib_C121',
  'lib_C85', 'lib_C87', 'lib_C90', 'lib_C92', 'lib_C95', 'Dance', 'Sing',
  ...PERF_LIB_IDS,
  ...POKE_PREVIEW_IDS,
];

const clipArgs = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--clip') clipArgs.push(process.argv[++i]);
}
const clipIds = [...new Set(clipArgs.length ? clipArgs : DEFAULT_CLIP_IDS)];

const py = `import sys,math,hashlib
from PIL import Image,ImageDraw
clip_id,out_path=sys.argv[1],sys.argv[2]
w,h,frames=80,80,12
seed=int(hashlib.md5(clip_id.encode()).hexdigest()[:8],16)
phase=(seed%360)/57.2958
bob_amp=3+(seed%6)
sway_amp=4+((seed>>4)%8)
arm_bias=((seed>>8)%7)-3
pal_bg=(232,244-(seed%18),239-(seed%12))
pal_fg=(14+((seed>>12)%24),107,92)
pal_body=(8+((seed>>16)%12),76,66)
imgs=[]
for n in range(frames):
 im=Image.new('RGB',(w,h),pal_bg);dr=ImageDraw.Draw(im);t=n/frames
 bob=int(bob_amp*math.sin(t*math.pi*2+phase))
 sway=int(sway_amp*math.sin(t*math.pi*2+phase+0.9));cx=40+sway
 dr.rounded_rectangle((cx-11,22+bob,cx+11,42+bob),radius=4,fill=pal_fg)
 dr.rounded_rectangle((cx-8,43+bob,cx+8,58+bob),radius=3,fill=pal_body)
 la=int(22+arm_bias*math.sin(t*math.pi*2));ra=int(20-arm_bias*math.cos(t*math.pi*2))
 dr.line((cx-14+sway,30+bob,cx-22+sway,50+bob+la),fill=pal_fg,width=3)
 dr.line((cx+14+sway,30+bob,cx+22+sway,48+bob+ra),fill=pal_fg,width=3)
 label=clip_id.replace('poke_','P·')[:14]
 dr.text((2,66),label,fill=(70,90,82));imgs.append(im)
imgs[0].save(out_path,save_all=True,append_images=imgs[1:],duration=85,loop=0,optimize=True)`;

function canBakeClip(clipId) {
  if (clipId.startsWith('poke_')) return true;
  if (clipId === 'Dance' || clipId === 'Sing') return true;
  if (clipId.startsWith('Idle') || clipId.startsWith('lib_C') || clipId.startsWith('Look')
      || ['Thinking', 'Relax', 'StandardIdle'].some((p) => clipId.startsWith(p))) {
    return true;
  }
  const vrma = path.join(publicRoot, 'models/anims', `${clipId}.vrma`);
  return fs.existsSync(vrma);
}

fs.mkdirSync(outDir, { recursive: true });
let wrote = 0, skipped = 0;
for (const clipId of clipIds) {
  const dest = path.join(outDir, `${clipId}.gif`);
  if (!canBakeClip(clipId)) {
    skipped++;
    continue;
  }
  const r = spawnSync('python3', ['-c', py, clipId, dest], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('FAIL', clipId, r.stderr);
    process.exitCode = 1;
    continue;
  }
  wrote++;
  console.log(`ok animations/owner-picker-previews/${clipId}.gif`);
}
console.log(`[generate-owner-picker-move-previews] wrote=${wrote} skipped=${skipped}`);