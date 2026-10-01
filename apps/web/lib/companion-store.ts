'use client';
import type { EmotionConfig } from '@amoji/emotion-core';

const HISTORY_KEY = 'amoji.history.v1';
const CONFIG_KEY = 'amoji.config.v1';

export interface StoredMessage { role: 'user' | 'assistant'; content: string }

export function loadHistory(): StoredMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is StoredMessage =>
        m !== null && typeof m === 'object' &&
        (m as StoredMessage).role !== undefined && ['user', 'assistant'].includes((m as StoredMessage).role) &&
        typeof (m as StoredMessage).content === 'string',
    );
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
