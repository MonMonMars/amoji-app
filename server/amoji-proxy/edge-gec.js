// Sec-MS-GEC v2 for the free Edge read-aloud socket.
// Microsoft rejects the old TrustedClientToken-only handshake with 403, and
// the app then falls through to one browser voice — every Cantonese pill
// sounds like the same female speaker. Token shape matches edge-tts drm.py.

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
export const EDGE_GEC_VERSION = '2-143.0.3650.75';
const WIN_EPOCH = 11644473600n;
const U32 = 0xffffffffn;
const M32 = 0x100000001n;

const SHA256_INITIAL = [0x6A09E667n, 0xBB67AE85n, 0x3C6EF372n, 0xA54FF53An, 0x510E527Fn, 0x9B05688Cn, 0x1F83D9ABn, 0x5BE0CD19n];
const SHA256_STATE = [0xFD9FBEA2n, 0x91243CE7n, 0xBE499094n, 0xCD2E1E0An, 0x6C006F49n, 0x04BD35ABn, 0xFEB0A7E4n, 0x03EFFBD2n];
const SHA256_SCHEDULE = [0xEB24BF9En, 0x1558691Fn, 0xA0C09EE2n, 0x0CFA32BAn, 0xA622EE8Cn, 0xD1DD9491n, 0xC0DD25A0n, 0xF9E70AB6n, 0xF0C31573n, 0x7058CE4En, 0x7188E606n, 0x00E5AB33n, 0xD258B060n, 0x72766564n];
const SHA256_ROUND = [0x428A2F98n, 0x71374491n, 0xB5C0FBCFn, 0xE9B5DBA5n, 0x3956C25Bn, 0x59F111F1n, 0x923F82A4n, 0xAB1C5ED5n, 0xD807AA98n, 0x12835B01n, 0x243185BEn, 0x550C7DC3n, 0x72BE5D74n, 0x80DEB1FEn, 0x9BDC06A7n, 0xC19BF174n, 0xE49B69C1n, 0xEFBE4786n, 0x0FC19DC6n, 0x240CA1CCn, 0x2DE92C6Fn, 0x4A7484AAn, 0x5CB0A9DCn, 0x76F988DAn, 0x983E5152n, 0xA831C66Dn, 0xB00327C8n, 0xBF597FC7n, 0xC6E00BF3n, 0xD5A79147n, 0x06CA6351n, 0x14292967n, 0x27B70A85n, 0x2E1B2138n, 0x4D2C6DFCn, 0x53380D13n, 0x650A7354n, 0x766A0ABBn, 0x81C2C92En, 0x92722C85n, 0xA2BFE8A1n, 0xA81A664Bn, 0xC24B8B70n, 0xC76C51A3n, 0xD192E819n, 0xD6990624n, 0xF40E3585n, 0x106AA070n, 0x19A4C116n, 0x1E376C08n, 0x2748774Cn, 0x34B0BCB5n, 0x391C0CB3n, 0x4ED8AA4An, 0x5B9CCA4Fn, 0x682E6FF3n, 0x748F82EEn, 0x78A5636Fn, 0x84C87814n, 0x8CC70208n, 0x90BEFFFAn, 0xA4506CEBn, 0xBEF9A3F7n, 0xC67178F2n];
const SHA256_ADJUSTMENT = 0xC9DC06A7n;
const SHA256_BLOCK = SHA256_ROUND.slice(0, 14).concat([SHA256_ADJUSTMENT], SHA256_ROUND.slice(15));
const SIGMA0_ADJ = 0x059C0B80n;
const SIGMA1_ADJ = 0x000B92C0n;
const CS64_COEFFICIENTS = [[0xE82E91B1n, 0xB32700D0n], [0x44DE24C6n, 0x88DFF51Dn], [0x3BEB65BCn, 0x29514038n], [0xC89C5933n, 0xB328CBDFn], [0x8D1EC211n, 0xD405B4D5n], [0x314EF5D5n, 0x26E55F3Cn], [0xE92491B1n, 0x607801C6n], [0xF0A5B9D5n, 0x82B2C1FBn], [0x06064CF3n, 0xFA51A3DAn], [0xDA79FA60n, 0x207CC464n], [0xBED20560n, 0x3C3C74F3n], [0x89F9C9F8n, 0xD2D14B61n], [0x35FA38C6n, 0xBB04A2C1n], [0xCB49E3C6n, 0xC5626167n]];
const CS64_FACTOR = 0x82893933n;
const CS64_ADJ0 = 0xF2F90B1An;
const CS64_ADJ1 = 0x0B1A0000n;

const u32 = (n) => n & U32;
const rol16 = (value) => {
  const v = u32(value);
  return u32((v << 16n) | (v >> 16n));
};
const sigma0 = (value) => u32((value >> 7n) ^ (value << 25n) ^ (value >> 18n) ^ (value << 14n) ^ (value >> 3n));
const sigma1 = (value) => u32((value >> 17n) ^ (value << 15n) ^ (value >> 19n) ^ (value << 13n) ^ (value >> 10n));

function sha256Rounds(state, words, firstRound = 0) {
  let [a, b, c, d, e, f, g, h] = state;
  const constants = firstRound === 14 ? SHA256_BLOCK : SHA256_ROUND;
  const aligned = Math.min(64, Math.floor((firstRound + 7) / 8) * 8);
  for (let index = firstRound; index < aligned; index++) {
    const rotE = e * M32;
    const rotA = a * M32;
    const t1 = h + ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) + (g ^ (e & (f ^ g))) + constants[index] + words[index];
    const t2 = ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((a & b) | (c & (a | b)));
    [a, b, c, d, e, f, g, h] = [u32(t1 + t2), a, b, c, u32(d + t1), e, f, g];
  }
  for (let index = aligned; index < 64; index += 8) {
    {
      const rotE = e * M32;
      const rotA = a * M32;
      const t1 = h + ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) + (g ^ (e & (f ^ g))) + constants[index] + words[index];
      d = u32(d + t1);
      h = u32(t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((a & b) | (c & (a | b))));
    }
    {
      const rotE = d * M32;
      const rotA = h * M32;
      const t1 = g + ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) + (f ^ (d & (e ^ f))) + constants[index + 1] + words[index + 1];
      c = u32(c + t1);
      g = u32(t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((h & a) | (b & (h | a))));
    }
    {
      const rotE = c * M32;
      const rotA = g * M32;
      const t1 = f + ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) + (e ^ (c & (d ^ e))) + constants[index + 2] + words[index + 2];
      b = u32(b + t1);
      f = u32(t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((g & h) | (a & (g | h))));
    }
    {
      const rotE = b * M32;
      const rotA = f * M32;
      const t1 = e + ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) + (d ^ (b & (c ^ d))) + constants[index + 3] + words[index + 3];
      a = u32(a + t1);
      e = u32(t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((f & g) | (h & (f | g))));
    }
    {
      const rotE = a * M32;
      const rotA = e * M32;
      const t1 = d + ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) + (c ^ (a & (b ^ c))) + constants[index + 4] + words[index + 4];
      h = u32(h + t1);
      d = u32(t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((e & f) | (g & (e | f))));
    }
    {
      const rotE = h * M32;
      const rotA = d * M32;
      const t1 = c + ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) + (b ^ (h & (a ^ b))) + constants[index + 5] + words[index + 5];
      g = u32(g + t1);
      c = u32(t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((d & e) | (f & (d | e))));
    }
    {
      const rotE = g * M32;
      const rotA = c * M32;
      const t1 = b + ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) + (a ^ (g & (h ^ a))) + constants[index + 6] + words[index + 6];
      f = u32(f + t1);
      b = u32(t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((c & d) | (e & (c | d))));
    }
    {
      const rotE = f * M32;
      const rotA = b * M32;
      const t1 = a + ((rotE >> 6n) ^ (rotE >> 11n) ^ (rotE >> 25n)) + (h ^ (f & (g ^ h))) + constants[index + 7] + words[index + 7];
      e = u32(e + t1);
      a = u32(t1 + ((rotA >> 2n) ^ (rotA >> 13n) ^ (rotA >> 22n)) + ((b & c) | (d & (b | c))));
    }
  }
  return [a, b, c, d, e, f, g, h];
}

function expandSchedule(words, firstWord = 16) {
  for (let index = firstWord; index < 64; index++) {
    const x = words[index - 2];
    const y = words[index - 15];
    const s1 = (x >> 17n) ^ (x << 15n) ^ (x >> 19n) ^ (x << 13n) ^ (x >> 10n);
    const s0 = (y >> 7n) ^ (y << 25n) ^ (y >> 18n) ^ (y << 14n) ^ (y >> 3n);
    words.push(u32(s1 + words[index - 7] + s0 + words[index - 16]));
  }
}

function sha256Init(data) {
  const words = Array(14).fill(0n);
  words.push(BigInt(((data[0] << 16) | (data[1] << 8) | data[2]) >>> 0));
  words.push(BigInt(((data[3] << 24) | (data[4] << 16) | (data[5] << 8) | data[6]) >>> 0));
  for (let index = 16; index < 30; index++) {
    let value = SHA256_SCHEDULE[index - 16];
    if (index - 2 >= 14) {
      value += index === 16 ? (sigma1(words[index - 2]) ^ SIGMA1_ADJ) : sigma1(words[index - 2]);
    }
    if (index - 7 >= 14) value += words[index - 7];
    if (index - 15 >= 14) {
      value += index === 29 ? (sigma0(words[index - 15]) ^ SIGMA0_ADJ) : sigma0(words[index - 15]);
    }
    words.push(u32(value));
  }
  words.push(u32(sigma1(words[28]) + words[23] + sigma0(words[15]) + words[14] + SHA256_ADJUSTMENT - SHA256_ROUND[14]));
  expandSchedule(words, 31);
  const working = sha256Rounds(SHA256_STATE, words, 14);
  return SHA256_INITIAL.map((x, i) => u32(x + working[i]));
}

function sha256Digest(data) {
  const length = 57 + data.length;
  const padLen = ((55 - length) % 64 + 64) % 64;
  const padded = new Uint8Array(data.length - 7 + 1 + padLen + 8);
  padded.set(data.subarray(7), 0);
  padded[data.length - 7] = 0x80;
  const bitLen = BigInt(length) * 8n;
  for (let i = 0; i < 8; i++) padded[padded.length - 1 - i] = Number((bitLen >> BigInt(i * 8)) & 0xffn);
  let state = sha256Init(data.subarray(0, 7));
  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = [];
    for (let i = 0; i < 16; i++) {
      const o = offset + i * 4;
      words.push(BigInt(((padded[o] << 24) | (padded[o + 1] << 16) | (padded[o + 2] << 8) | padded[o + 3]) >>> 0));
    }
    expandSchedule(words);
    const working = sha256Rounds(state, words, 0);
    state = state.map((x, i) => u32(x + working[i]));
  }
  const out = new Uint8Array(32);
  state.forEach((w, i) => {
    const n = Number(w);
    out[i * 4] = (n >>> 24) & 255;
    out[i * 4 + 1] = (n >>> 16) & 255;
    out[i * 4 + 2] = (n >>> 8) & 255;
    out[i * 4 + 3] = n & 255;
  });
  return out;
}

function wordsLe4Even(data) {
  const n = data.length + ((4 - (data.length % 4)) % 4);
  const padded = new Uint8Array(n);
  padded.set(data);
  const words = [];
  for (let i = 0; i < padded.length; i += 4) {
    words.push(BigInt(padded[i] | (padded[i + 1] << 8) | (padded[i + 2] << 16) | (padded[i + 3] << 24)) & U32);
  }
  if (words.length % 2) words.push(0n);
  return words;
}

function cs64Digest(data, digest) {
  let keyA = BigInt(digest[0] | (digest[1] << 8) | (digest[2] << 16) | (digest[3] << 24)) & U32;
  let keyB = BigInt(digest[4] | (digest[5] << 8) | (digest[6] << 16) | (digest[7] << 24)) & U32;
  keyA |= 1n;
  keyB |= 1n;
  const factors = [u32(keyA * CS64_FACTOR), u32(keyB * CS64_FACTOR)];
  const terms = CS64_COEFFICIENTS.map(([coefficient], index) => u32(coefficient * factors[index % 2]));
  const offsets = CS64_COEFFICIENTS.map(([, offset]) => offset);
  const prefixed = new Uint8Array(data.length + 1);
  prefixed.set(data, 1);
  wordsLe4Even(prefixed).forEach((word, index) => {
    let term = word * (index % 2 === 0 ? keyA : keyB);
    let offset = rol16(word) * (index % 2 === 0 ? 0xEF0569FBn : 0xC31713DBn);
    if (index === 0) {
      term += CS64_ADJ0 * factors[0];
      offset += CS64_ADJ1;
    }
    terms.push(u32(term));
    offsets.push(u32(offset));
  });
  let swapAcc = 0n;
  let swapLast = 0n;
  let state = 0n;
  let acc = 0n;
  for (let index = 0; index < terms.length; index += 2) {
    const x = terms[index];
    const y = terms[index + 1];
    let t = rol16(u32(offsets[index] + x));
    let q = u32(t * 0x76F50F34n);
    swapAcc = u32(swapAcc + u32(rol16(q) * 0xC3EFEA97n + q));
    t = rol16(u32(offsets[index + 1] + y));
    q = u32(t * 0x1881CE3Cn);
    swapLast = u32(rol16(q) * 0x35BD1EC9n + q);
    swapAcc = u32(swapAcc + swapLast);
    state = u32(state * keyA + x);
    state = u32(rol16(state) * 0xCF98B111n);
    state = u32(rol16(state) * 0x87085B9Fn);
    state = u32(rol16(state) * 0x12CEB96Dn);
    state = u32(rol16(state) * 0x257E1D83n);
    acc += state;
    t = u32(state * keyB + y);
    t = u32(rol16(t) * 0xA27416F5n);
    t = u32(rol16(t) * 0xD38396FFn);
    state = u32(rol16(u32(rol16(t) * 0x7C932B89n)) * 0xBFA49F69n);
    acc = u32(acc + state);
  }
  return [swapLast ^ state, u32(swapAcc) ^ acc];
}

function hexBytes(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** v2 token `<16 hex>-<64 hex>` for one unix second. */
export function secMsGec(unixSeconds = Date.now() / 1000) {
  let ticks = BigInt(Math.floor(unixSeconds)) + WIN_EPOCH;
  ticks -= ticks % 300n;
  ticks *= 10000000n;
  const data = new TextEncoder().encode(`${ticks}${TRUSTED_CLIENT_TOKEN}`);
  const digest = sha256Digest(data);
  const [a, b] = cs64Digest(data, digest);
  const cs = new Uint8Array(8);
  const pair = [a, b];
  pair.forEach((w, i) => {
    const n = Number(w);
    cs[i * 4] = n & 255;
    cs[i * 4 + 1] = (n >>> 8) & 255;
    cs[i * 4 + 2] = (n >>> 16) & 255;
    cs[i * 4 + 3] = (n >>> 24) & 255;
  });
  return `${hexBytes(cs)}-${hexBytes(digest)}`;
}

const WS_BASE = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';

/** Read-aloud socket URL. The GEC query is what the browser is allowed to send. */
export function edgeReadAloudUrl(connectionId, unixSeconds) {
  const gec = secMsGec(unixSeconds);
  return `${WS_BASE}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${connectionId}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${EDGE_GEC_VERSION}`;
}

/** Audio bytes after the Edge binary header. Supports the 2-byte length prefix. */
export function edgeAudioPayload(buf) {
  if (buf.length < 4) return null;
  if (buf[0] < 32) {
    const headerLength = (buf[0] << 8) | buf[1];
    const start = headerLength + 2;
    if (headerLength >= 2 && start < buf.length) return buf.subarray(start);
  }
  const scan = Math.min(buf.length - 3, 240);
  for (let i = 0; i < scan; i++) {
    if (buf[i] === 13 && buf[i + 1] === 10 && buf[i + 2] === 13 && buf[i + 3] === 10) {
      return buf.subarray(i + 4);
    }
  }
  return null;
}
