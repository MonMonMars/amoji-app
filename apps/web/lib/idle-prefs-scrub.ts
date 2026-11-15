// Idle prefs hygiene — NEVER wipe owner picks.
//
// History: agents bumped amoji.idle*.vN and called scrub-all to force new
// defaults, discarding intentional pins/enables. That churn is banned.
// Live path is idle-owner-migrate (readMigratingPrefJson) — migrate forward,
// scrub only known-bad clips, keep honorable stands.

export {
  IDLE_ENABLED_KEY,
  IDLE_PICK_KEY,
  IDLE_PREFS_GENERATION,
  LEGACY_IDLE_ENABLED_KEYS,
  LEGACY_IDLE_PICK_KEYS,
  dropLegacyPrefKeys,
  readMigratingPrefJson,
} from './idle-owner-migrate';

/**
 * No-op (kept for import stability). Previously wiped every `amoji.idle*`
 * key except the live pair — that discarded owner selections before migrate
 * could run. Prefer readMigratingPrefJson / dropLegacyPrefKeys after a
 * successful migrate.
 */
export function scrubAllAmojiIdleKeys(): string[] {
  return [];
}

/** Test helper — scrub is a permanent no-op; nothing to forget. */
export function forgetIdlePrefsScrub(): void {
  /* no-op */
}
