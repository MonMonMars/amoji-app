import { JPOP_VAULT_STREAM_TRACKS } from './music-jpop-vault';
import { JPOP_VAULT_V2_STREAM_TRACKS } from './music-jpop-vault-v2';
import { USPOP_VAULT_STREAM_TRACKS } from './music-us-pop-vault';
import type { VaultStreamRow } from './music-vault-util';
import { ownerCode } from './music-vault-util';
export const MV_VAULT_FIRST = 39 as const;
export const MV_VAULT_LAST = 98 as const;
export const MV_VAULT_RESERVED_THROUGH = 38 as const;
export const MV_VAULT_COUNT = MV_VAULT_LAST - MV_VAULT_FIRST + 1;
export const HIGHEST_MV_OWNER_CODE = ownerCode(MV_VAULT_LAST);
export const ALL_MV_VAULT_STREAM_TRACKS: readonly VaultStreamRow[] = [
  ...JPOP_VAULT_STREAM_TRACKS,
  ...JPOP_VAULT_V2_STREAM_TRACKS,
  ...USPOP_VAULT_STREAM_TRACKS,
];
if (ALL_MV_VAULT_STREAM_TRACKS.length !== MV_VAULT_COUNT) {
  throw new Error(`music-mv-registry: expected ${MV_VAULT_COUNT} vault rows, got ${ALL_MV_VAULT_STREAM_TRACKS.length}`);
}
export function streamTrackByOwnerCode(code: string): VaultStreamRow | null {
  const norm = code.trim().toUpperCase();
  return ALL_MV_VAULT_STREAM_TRACKS.find((t) => t.ownerCode === norm || t.id === norm) ?? null;
}
