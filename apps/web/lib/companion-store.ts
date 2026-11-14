'use client';
import type { EmotionConfig } from '@amoji/emotion-core';

const HISTORY_KEY = 'amoji.history.v1';
const CONFIG_KEY = 'amoji.config.v1';

export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Optional sealed caption clauses (UI de-dupe; safe to omit). */
  captionLines?: string[];
}

export function loadHistory(): StoredMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((m): StoredMessage[] => {
      if (m === null || typeof m !== 'object') return [];
      const row = m as StoredMessage;
      if (!row.role || !['user', 'assistant'].includes(row.role)) return [];
      if (typeof row.content !== 'string') return [];
      const lines = Array.isArray(row.captionLines)
        ? row.captionLines.filter((s): s is string => typeof s === 'string' && s.trim() !== '')
        : undefined;
      return [{
        role: row.role,
        content: row.content,
        ...(lines?.length ? { captionLines: lines } : {}),
      }];
    });
  } catch { /* private mode */ return []; }
}

export function saveHistory(msgs: StoredMessage[]): void {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs)); } catch { /* ignore */ }
}

export function loadConfig(): Partial<EmotionConfig> {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Partial<EmotionConfig>;
  } catch { /* private mode */ return {}; }
}

export function saveConfig(cfg: EmotionConfig): void {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}
