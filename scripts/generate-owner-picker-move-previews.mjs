#!/usr/bin/env node
/** Bake sidecar GIF loops: apps/web/public/animations/owner-picker-previews/<clipId>.gif */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'apps/web/public');
const outDir = path.join(publicRoot, 'animations/owner-picker-previews');

const DEFAULT_CLIP_IDS = [
  'IdleQuaterniusHuman', 'IdleBreathCalm', 'StandardIdle', 'IdleMixamoBreathing', 'IdleNeutral',
  'IdleRpmFStanding001', 'lib_C04', 'IdleRpmFVar001', 'lib_C25', 'IdleInnersceneSam', 'IdleRpmMStanding001',
  'LookAround', 'lib_C42', 'IdleRpmFVar003', 'IdleRpmFVar004', 'IdleRpmMVar001', 'Thinking', 'IdleSassy',
  'Relax', 'IdleMixamoArmStretch', 'IdleRpmMVar002', 'IdleMixamoHappy', 'lib_C120', 'lib_C61', 'lib_C03',
  'lib_C112', 'lib_C110', 'lib_C121', 'lib_C62', 'lib_C125', 'lib_C85', 'lib_C87', 'lib_C90', 'lib_C92',
  'lib_C95', 'Dance', 'Sing',
];

const clipArgs = [];
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--clip') clipArgs.push(process.argv[++i]);
}
const clipIds = [...new Set(clipArgs.length ? clipArgs : DEFAULT_CLIP_IDS)];

const py = `import sys,math
from PIL import Image,ImageDraw
clip_id,out_path=sys.argv[1],sys.argv[2]
w,h,frames=80,80,10
pal_bg,pal_fg=(232,244,239),(14,107,92)
imgs=[]
for n in range(frames):
 im=Image.new('RGB',(w,h),pal_bg);dr=ImageDraw.Draw(im);t=n/frames
 bob=int(4*math.sin(t*math.pi*2));sway=int(5*math.sin(t*math.pi*2+0.6));cx=40+sway
 dr.rounded_rectangle((cx-11,22+bob,cx+11,42+bob),radius=4,fill=pal_fg)
 dr.rounded_rectangle((cx-8,43+bob,cx+8,58+bob),radius=3,fill=(8,76,66))
 dr.line((cx-14+sway,30+bob,cx-22+sway,50+bob),fill=pal_fg,width=3)
 dr.line((cx+14+sway,30+bob,cx+22+sway,48+bob),fill=pal_fg,width=3)
 dr.text((4,66),clip_id[:12],fill=(90,107,98));imgs.append(im)
imgs[0].save(out_path,save_all=True,append_images=imgs[1:],duration=80,loop=0,optimize=True)`;

fs.mkdirSync(outDir, { recursive: true });
let wrote = 0, skipped = 0;
for (const clipId of clipIds) {
  const dest = path.join(outDir, `${clipId}.gif`);
  const vrma = path.join(publicRoot, 'models/anims', `${clipId}.vrma`);
  const ok = fs.existsSync(vrma) || clipId.startsWith('lib_C8') || clipId.startsWith('lib_C9');
  if (!ok) { skipped++; continue; }
  const r = spawnSync('python3', ['-c', py, clipId, dest], { encoding: 'utf8' });
  if (r.status !== 0) { console.error('FAIL', clipId, r.stderr); process.exitCode = 1; continue; }
  wrote++; console.log(`ok animations/owner-picker-previews/${clipId}.gif`);
}
console.log(`[generate-owner-picker-move-previews] wrote=${wrote} skipped=${skipped}`);