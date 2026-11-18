// Shared helpers for owner MV### Mixkit stream vault rows.
export type MixkitSeed = { title: string; mixNum: number; durationMs: number; mixSlug?: string };
export type VaultStreamStyle = 'jpop' | 'uspop';
export interface VaultStreamRow {
  id: string; ownerCode: string; style: VaultStreamStyle; title: string; url: string;
  durationMs: number; license: 'Mixkit-Free'; credit: string; source: string;
}
export function slugify(title: string): string {
  return title.toLowerCase().replace(/[!?.']/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}
export function mixPreview(seed: MixkitSeed): string {
  const slug = seed.mixSlug ?? slugify(seed.title);
  return `https://assets.mixkit.co/music/preview/mixkit-${slug}-${seed.mixNum}.mp3`;
}
export function ownerCode(n: number): string { return `MV${String(n).padStart(3, '0')}`; }
export function buildVaultStreamTracks(seeds: readonly MixkitSeed[], firstMv: number, style: VaultStreamStyle) {
  return seeds.map((seed, i) => {
    const code = ownerCode(firstMv + i);
    return { id: code, ownerCode: code, style, title: seed.title, url: mixPreview(seed), durationMs: seed.durationMs, license: 'Mixkit-Free' as const, credit: 'Mixkit', source: 'https://mixkit.co/free-stock-music/' };
  });
}
