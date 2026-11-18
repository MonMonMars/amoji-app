import { buildVaultStreamTracks, type MixkitSeed } from './music-vault-util';

/** Owner Mixkit vault expansion r215 — world / lofi / jazz beds (MV099–MV118). */
export const MV_WORLD_FIRST = 99 as const;
export const MV_WORLD_LAST = 118 as const;
export const MV_WORLD_COUNT = MV_WORLD_LAST - MV_WORLD_FIRST + 1;

const WORLD_SEEDS: readonly MixkitSeed[] = [
  { title: 'Forest Treasure', mixNum: 117, durationMs: 120_000 },
  { title: 'Valley Sunset', mixNum: 314, durationMs: 105_000 },
  { title: 'Deep Abstract Ambient', mixNum: 140, durationMs: 98_000 },
  { title: 'Meditation Yoga', mixNum: 596, durationMs: 132_000 },
  { title: 'Soft Lounge', mixNum: 761, durationMs: 88_000 },
  { title: 'Romantic Love', mixNum: 702, durationMs: 124_000 },
  { title: 'Acoustic Guitar Loop', mixNum: 574, durationMs: 76_000 },
  { title: 'Summer Fun', mixNum: 716, durationMs: 92_000 },
  { title: 'Inspiration', mixNum: 119, durationMs: 115_000 },
  { title: 'Mystery Frequency', mixNum: 553, durationMs: 101_000 },
  { title: 'Tech House Vibes', mixNum: 130, durationMs: 72_000 },
  { title: 'Dreaming Big', mixNum: 31, durationMs: 90_000 },
  { title: 'Jazz Hot', mixNum: 110, durationMs: 72_000 },
  { title: 'Serene View', mixNum: 443, durationMs: 90_000 },
  { title: 'Relaxing in the Forest', mixNum: 338, durationMs: 90_000 },
  { title: 'Sleepy Cat', mixNum: 135, durationMs: 90_000 },
  { title: 'Beautiful Dream', mixNum: 493, durationMs: 72_000 },
  { title: 'Deep Urban', mixNum: 623, durationMs: 72_000 },
  { title: 'Sunny', mixNum: 717, durationMs: 72_000 },
  { title: 'Cat Walk', mixNum: 371, durationMs: 72_000 },
];

if (WORLD_SEEDS.length !== MV_WORLD_COUNT) {
  throw new Error(`music-world-vault: expected ${MV_WORLD_COUNT} seeds, got ${WORLD_SEEDS.length}`);
}

export const WORLD_VAULT_STREAM_TRACKS = buildVaultStreamTracks(WORLD_SEEDS, MV_WORLD_FIRST, 'world');