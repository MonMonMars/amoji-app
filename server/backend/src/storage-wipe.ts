import type { DatabaseSync } from 'node:sqlite';

/** Tables keyed by user_id that a bearer wipe may clear. */
const USER_TABLES = [
  'chat_turns',
  'character_state',
  'wardrobe',
  'entitlements',
  'sessions',
] as const;

/**
 * Remove server-side product rows for one anonymous user.
 * Reports / support / mail_log are retained for ops (may be null user_id).
 */
export function wipeUserProductData(db: DatabaseSync, userId: string): string[] {
  const removed: string[] = [];
  for (const table of USER_TABLES) {
    const col = table === 'sessions' ? 'user_id' : 'user_id';
    const info = db.prepare(`DELETE FROM ${table} WHERE ${col} = ?`).run(userId) as {
      changes?: number;
    };
    if ((info.changes ?? 0) > 0) removed.push(table);
  }
  return removed;
}
