import { buildVaultStreamTracks, type MixkitSeed } from './music-vault-util';
export const MV_USPOP_FIRST = 84 as const;
export const MV_USPOP_LAST = 98 as const;
export const MV_USPOP_COUNT = MV_USPOP_LAST - MV_USPOP_FIRST + 1;
const USPOP_SEEDS: readonly MixkitSeed[] = [
  { title: 'Happy Home', mixNum: 801, durationMs: 110_000, mixSlug: 'happy-home' },
  { title: 'Oh Lord', mixNum: 200, durationMs: 143_000, mixSlug: 'oh-lord' },
  { title: 'Follow Me Home', mixNum: 350, durationMs: 74_000, mixSlug: 'follow-me-home' },
  { title: 'At The Playhouse', mixNum: 821, durationMs: 91_000, mixSlug: 'at-the-playhouse' },
  { title: 'Me And You', mixNum: 32, durationMs: 157_000, mixSlug: 'me-and-you' },
  { title: 'A Special Feeling', mixNum: 1087, durationMs: 100_000, mixSlug: 'a-special-feeling' },
  { title: 'I Believe In Us', mixNum: 1030, durationMs: 168_000, mixSlug: 'i-believe-in-us' },
  { title: 'Old Letter', mixNum: 854, durationMs: 165_000, mixSlug: 'old-letter' },
  { title: 'See You Next Christmas', mixNum: 916, durationMs: 103_000, mixSlug: 'see-you-next-christmas' },
  { title: 'Bopper From Memphis', mixNum: 1131, durationMs: 112_000, mixSlug: 'bopper-from-memphis' },
  { title: 'Traveling Along', mixNum: 94, durationMs: 100_000, mixSlug: 'traveling-along' },
  { title: 'Chicken Out', mixNum: 1166, durationMs: 99_000, mixSlug: 'chicken-out' },
  { title: 'I Can Hear Your Heartbeat', mixNum: 1000, durationMs: 110_000, mixSlug: 'i-can-hear-your-heartbeat' },
  { title: "Disco Ain't Old School", mixNum: 935, durationMs: 98_000, mixSlug: 'disco-aint-old-school' },
  { title: 'Night Sky Hip Hop', mixNum: 970, durationMs: 257_000, mixSlug: 'night-sky-hip-hop' },
];
if (USPOP_SEEDS.length !== MV_USPOP_COUNT) throw new Error('music-us-pop-vault seed count');
export const USPOP_VAULT_STREAM_TRACKS = buildVaultStreamTracks(USPOP_SEEDS, MV_USPOP_FIRST, 'uspop');
