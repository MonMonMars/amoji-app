#!/usr/bin/env node
// Prove the free HTTP MP3 tier is non-silent for a spoken Cantonese line.
// Fetches translate.google.com/translate_tts (tl=yue), decodes to PCM via
// ffmpeg when available, and prints RMS / peak. Exit 1 if the audio is silent.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const LINE = process.argv[2] || '你好呀，食咗飯未？今日返工好攰呀。';
const url =
  'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=yue&q=' +
  encodeURIComponent(LINE);

const dir = mkdtempSync(join(tmpdir(), 'amoji-gtts-'));
const mp3 = join(dir, 'line.mp3');
const pcm = join(dir, 'line.f32');

try {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 AmojiRMS/1.0' },
  });
  if (!res.ok) {
    console.error(JSON.stringify({ ok: false, error: `HTTP ${res.status}` }));
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(mp3, buf);

  const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).status === 0;
  if (!hasFfmpeg) {
    // Without ffmpeg we can still prove the MP3 is non-trivial.
    const sync = countMpegSync(buf);
    const out = {
      ok: buf.length > 1000 && sync > 0,
      bytes: buf.length,
      mpegSyncMarkers: sync,
      note: 'ffmpeg not found — byte-level non-silence only',
      line: LINE,
    };
    console.log(JSON.stringify(out, null, 2));
    process.exit(out.ok ? 0 : 1);
  }

  execFileSync(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'error', '-y', '-i', mp3, '-ac', '1', '-ar', '24000', '-f', 'f32le', pcm],
    { stdio: 'pipe' },
  );
  const raw = readFileSync(pcm);
  const samples = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  let sum = 0;
  let peak = 0;
  let nonzero = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    sum += v * v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
    if (a > 1e-4) nonzero++;
  }
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  const silent = rms < 1e-4;
  const out = {
    ok: !silent,
    silent,
    samples: samples.length,
    rms: +rms.toFixed(6),
    peak: +peak.toFixed(6),
    nonzeroPct: +((100 * nonzero) / Math.max(1, samples.length)).toFixed(2),
    mp3Bytes: buf.length,
    line: LINE,
  };
  console.log(JSON.stringify(out, null, 2));
  process.exit(silent ? 1 : 0);
} finally {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

function countMpegSync(buf) {
  let n = 0;
  for (let i = 0; i < Math.min(buf.length - 1, 8000); i++) {
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) n++;
  }
  return n;
}
