import { randomBytes, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}

interface SessionRow {
  token: string;
  user_id: string;
  expires_at: number;
}

function row(db: DatabaseSync, sql: string, ...params: unknown[]): SessionRow | undefined {
  const found = db.prepare(sql).get(...params);
  if (found == null || typeof found !== 'object') return undefined;
  return found as SessionRow;
}

export function createSession(db: DatabaseSync, now: number): Session {
  const userId = randomUUID();
  const token = randomBytes(32).toString('hex');
  const expiresAt = now + SESSION_MS;
  db.prepare('INSERT INTO users (id, created_at) VALUES (?, ?)').run(userId, now);
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, userId, now, expiresAt);
  return { token, userId, expiresAt };
}

export function readSession(db: DatabaseSync, token: string, now: number): Session | undefined {
  if (!/^[a-f0-9]{64}$/.test(token)) return undefined;
  const found = row(db, 'SELECT token, user_id, expires_at FROM sessions WHERE token = ?', token);
  if (!found || found.expires_at <= now) return undefined;
  return { token: found.token, userId: found.user_id, expiresAt: found.expires_at };
}

export function deleteSession(db: DatabaseSync, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}
