// Duration of a shipped MP3 clip, read straight from the frame headers.
//
// The poke SFX has to finish inside the poke reaction window (see
// POKE_REACTION_MS in ./poke-hit): a clip that outlasts the recoil keeps
// talking after she has settled, which reads as the wrong sound. That budget
// is only enforceable if the clip lengths are known, and the files are the
// only source of truth for them — this reads the real bytes rather than
// trusting a hand-written table that can drift from what shipped.

const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const RATES_V1 = [44100, 48000, 32000];
const RATES_V2 = [22050, 24000, 16000];

interface FrameHeader {
  /** Frame length in bytes, header included. */
  length: number;
  /** Samples the frame carries. */
  samples: number;
  sampleRate: number;
}

function readFrame(buf: Buffer, at: number): FrameHeader | null {
  if (at + 4 > buf.length) return null;
  if (buf[at] !== 0xff || (buf[at + 1]! & 0xe0) !== 0xe0) return null;
  const versionBits = (buf[at + 1]! >> 3) & 3; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
  const layerBits = (buf[at + 1]! >> 1) & 3; // 1 = Layer III
  const bitrateIndex = (buf[at + 2]! >> 4) & 0xf;
  const rateIndex = (buf[at + 2]! >> 2) & 3;
  const padding = (buf[at + 2]! >> 1) & 1;
  if (layerBits !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return null;
  const mpeg1 = versionBits === 3;
  const bitrate = (mpeg1 ? BITRATES_V1_L3 : BITRATES_V2_L3)[bitrateIndex]!;
  const sampleRate = (mpeg1 ? RATES_V1 : RATES_V2)[rateIndex]!;
  if (!bitrate || !sampleRate) return null;
  const samples = mpeg1 ? 1152 : 576;
  const length = Math.floor(((samples / 8) * bitrate * 1000) / sampleRate) + padding;
  if (length < 24) return null;
  return { length, samples, sampleRate };
}

/** Byte offset of the first audio frame, skipping a leading ID3v2 tag. */
function audioStart(buf: Buffer): number {
  if (buf.length >= 10 && buf.toString('latin1', 0, 3) === 'ID3') {
    const size = ((buf[6]! & 0x7f) << 21) | ((buf[7]! & 0x7f) << 14) | ((buf[8]! & 0x7f) << 7) | (buf[9]! & 0x7f);
    const afterTag = 10 + size;
    if (afterTag < buf.length) return afterTag;
  }
  return 0;
}

/**
 * Playback length in seconds by walking every frame. Returns null for bytes
 * that are not MPEG Layer III (a corrupt or truncated asset must be visible
 * to the caller, not silently read as a very short clip).
 */
export function mp3DurationSec(buf: Buffer): number | null {
  let at = audioStart(buf);
  // Resync onto the first frame — a tag without a size, or junk before ID3.
  let resync = 0;
  while (at + 4 <= buf.length && !readFrame(buf, at)) {
    at += 1;
    resync += 1;
    if (resync > 64 * 1024) return null;
  }
  let samples = 0;
  let sampleRate = 0;
  let frames = 0;
  while (at + 4 <= buf.length) {
    const header = readFrame(buf, at);
    if (!header || at + header.length > buf.length) {
      at += 1;
      continue;
    }
    samples += header.samples;
    sampleRate = header.sampleRate;
    frames += 1;
    at += header.length;
  }
  if (frames < 2 || !sampleRate) return null;
  return samples / sampleRate;
}
