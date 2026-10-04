// Patch VRM0.x GLB files that are missing the four emotion blendshape groups
// (Joy/Angry/Sorrow/Surprised) by adding empty groups with proper presetName.
// Empty binds = no-op morph: the emotion engine gets its expression hooks and
// falls back to glow/pose layers for the actual visible emotion. Idempotent.
const fs = require('fs');
const NEED = { joy: 'Joy', angry: 'Angry', sorrow: 'Sorrow', surprised: 'Surprised' };
for (const file of process.argv.slice(2)) {
  const buf = fs.readFileSync(file);
  if (buf.toString('ascii', 0, 4) !== 'glTF') { console.log('SKIP not GLB:', file); continue; }
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
  if (!json.extensions?.VRM) { console.log('SKIP not VRM0:', file); continue; }
  const bsm = json.extensions.VRM.blendShapeMaster ?? (json.extensions.VRM.blendShapeMaster = {});
  const groups = bsm.blendShapeGroups ?? (bsm.blendShapeGroups = []);
  const have = new Set(groups.map((g) => String(g.name).toLowerCase()));
  const added = [];
  for (const [k, canon] of Object.entries(NEED)) {
    if (have.has(k)) continue;
    groups.push({ name: canon, presetName: canon, binds: [], materialValues: [], isBinary: false });
    added.push(canon);
  }
  if (added.length === 0) { console.log('ok   full:', file); continue; }
  const enc = Buffer.from(JSON.stringify(json), 'utf8');
  const pad = (4 - (enc.length % 4)) % 4;
  const jsonBuf = Buffer.concat([enc, Buffer.from(' '.repeat(pad))]);
  const rest = buf.subarray(20 + jsonLen); // BIN chunk + anything after, untouched
  const head = Buffer.alloc(20);
  head.write('glTF', 0, 'ascii');
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(12 + 8 + jsonBuf.length + rest.length, 8);
  head.writeUInt32LE(jsonBuf.length, 12);
  head.writeUInt32LE(0x4e4f534a, 16); // 'JSON'
  fs.writeFileSync(file, Buffer.concat([head, jsonBuf, rest]));
  console.log('FIX ', file, 'added:', added.join(','));
}
