import fs from 'node:fs';

// open-source builds do not vendor the sample model — skip gracefully
if (!fs.existsSync(process.argv[2])) {
  console.log('model not vendored — skipping structural check (see ASSET_MANIFEST.md)');
  process.exit(0);
}

const buf = fs.readFileSync(process.argv[2]);
if (buf.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a GLB');
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));

const isV0 = Boolean(json.extensions?.VRM);
const isV1 = Boolean(json.extensions?.VRMC_vrm);
if (!isV0 && !isV1) throw new Error('no VRM extension (neither VRM 0.x nor VRMC_vrm 1.0)');

if (isV1) {
  // ---- VRM 1.0: full preset check (three-vrm native path) --------------
  console.log('VRM extension: 1.0');
  const expressions = Object.keys(json.extensions.VRMC_vrm.expressions?.preset ?? {});
  console.log('preset expressions:', expressions.join(', '));
  // renderer drives: happy, angry, sad, surprised, relaxed
  const need = ['happy', 'angry', 'sad', 'surprised', 'relaxed'];
  const missing = need.filter((n) => !expressions.includes(n));
  if (missing.length) throw new Error(`missing emotional presets: ${missing}`);
  const hb = json.extensions.VRMC_vrm.humanoid?.humanBones ?? {};
  if (!('head' in hb)) throw new Error('no head humanoid bone');
  console.log('head bone: present');
} else {
  // ---- VRM 0.x legacy path (lib/vrm/avatar.ts GenericAvatar) -----------
  console.log('VRM extension: 0.x (legacy generic-avatar path)');
  const groups = json.extensions.VRM.blendShapeMaster?.blendShapeGroups ?? [];
  const names = groups.map((g) => g.name);
  console.log('blendShapeGroups:', names.join(', '));
  const lower = names.map((n) => n.toLowerCase());
  const need = ['joy', 'angry', 'sorrow', 'surprised'];
  const missing = need.filter((n) => !lower.includes(n));
  if (missing.length) throw new Error(`missing emotional blendShapeGroups: ${missing}`);
  const hbones = json.extensions.VRM.humanoid?.humanBones ?? [];
  const boneNames = Array.isArray(hbones) ? hbones.map((b) => b.bone) : Object.keys(hbones);
  if (!boneNames.includes('head')) throw new Error('no head humanoid bone');
  for (const b of ['leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm']) {
    if (!boneNames.includes(b)) throw new Error(`missing arm bone: ${b}`);
  }
  console.log('humanoid bones: head + arms present');
}
console.log('VRM_OK');
