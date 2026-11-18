import { buildVaultStreamTracks, type MixkitSeed } from './music-vault-util';
export const MV_JPOP_V2_FIRST = 69 as const;
export const MV_JPOP_V2_LAST = 83 as const;
export const MV_JPOP_V2_COUNT = MV_JPOP_V2_LAST - MV_JPOP_V2_FIRST + 1;
const JPOP_V2_SEEDS: readonly MixkitSeed[] = [
  { title: 'Pop Track 01', mixNum: 727, durationMs: 97_000, mixSlug: 'pop-track-01' },
  { title: 'Pop Track 02', mixNum: 728, durationMs: 102_000, mixSlug: 'pop-track-02' },
  { title: 'Pop Track 04', mixNum: 730, durationMs: 94_000, mixSlug: 'pop-track-04' },
  { title: 'Pop Track 07', mixNum: 733, durationMs: 91_000, mixSlug: 'pop-track-07' },
  { title: 'Pop Track 08', mixNum: 734, durationMs: 88_000, mixSlug: 'pop-track-08' },
  { title: 'Pop Track 10', mixNum: 703, durationMs: 72_000, mixSlug: 'pop-track-10' },
  { title: 'Pop 04', mixNum: 696, durationMs: 154_000, mixSlug: 'pop-04' },
  { title: 'Pop 07', mixNum: 699, durationMs: 110_000, mixSlug: 'pop-07' },
  { title: 'Pop 08', mixNum: 701, durationMs: 95_000, mixSlug: 'pop-08' },
  { title: 'Pop 11', mixNum: 704, durationMs: 102_000, mixSlug: 'pop-11' },
  { title: 'Synth Pop', mixNum: 772, durationMs: 118_000, mixSlug: 'synth-pop' },
  { title: 'Modern Pop', mixNum: 897, durationMs: 96_000, mixSlug: 'modern-pop' },
  { title: 'City Lights', mixNum: 97, durationMs: 106_000, mixSlug: 'city-lights' },
  { title: 'Turn This Up a Little Louder', mixNum: 1048, durationMs: 113_000, mixSlug: 'turn-this-up-a-little-louder' },
  { title: 'Party Vibes', mixNum: 129, durationMs: 134_000, mixSlug: 'party-vibes' },
];
if (JPOP_V2_SEEDS.length !== MV_JPOP_V2_COUNT) throw new Error('music-jpop-vault-v2 seed count');
export const JPOP_VAULT_V2_STREAM_TRACKS = buildVaultStreamTracks(JPOP_V2_SEEDS, MV_JPOP_V2_FIRST, 'jpop');
